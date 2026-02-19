import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGNANT_THRESHOLD_DAYS = 14;

// ---------------------------------------------------------------------------
// Helper — fetch all active tenants
// ---------------------------------------------------------------------------

async function getActiveTenants(): Promise<{ id: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch active tenants: ${error.message}`);
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// runStagnantDealsJob
// ---------------------------------------------------------------------------

export async function runStagnantDealsJob(): Promise<void> {
  const startTime = Date.now();
  logger.info('[StagnantDealsJob] Starting stagnant deals check');

  const tenants = await getActiveTenants();

  if (tenants.length === 0) {
    logger.info('[StagnantDealsJob] No active tenants found, skipping');
    return;
  }

  // Calculate the cutoff date: now - 14 days
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - STAGNANT_THRESHOLD_DAYS);
  const cutoffISO = cutoffDate.toISOString();

  let totalStagnant = 0;

  for (const tenant of tenants) {
    try {
      // Find open deals that haven't been updated in 14+ days
      const { data: stagnantDeals, error: dealsError } = await supabaseAdmin
        .from('deals')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .eq('status', 'open')
        .lt('updated_at', cutoffISO);

      if (dealsError) {
        logger.error('[StagnantDealsJob] Failed to fetch stagnant deals', {
          tenantId: tenant.id,
          error: dealsError.message,
        });
        continue;
      }

      if (!stagnantDeals || stagnantDeals.length === 0) {
        continue;
      }

      let tenantAlerts = 0;

      for (const deal of stagnantDeals) {
        try {
          // Check if we already created a stagnant alert for this deal recently
          // (avoid duplicate alerts within the same 14-day window)
          const { data: existingAlert } = await supabaseAdmin
            .from('deal_activities')
            .select('id')
            .eq('deal_id', deal.id)
            .eq('type', 'system_alert')
            .gte('created_at', cutoffISO)
            .limit(1);

          if (existingAlert && existingAlert.length > 0) {
            // Alert already exists for this window, skip
            continue;
          }

          // Create a system alert activity
          const { error: insertError } = await supabaseAdmin
            .from('deal_activities')
            .insert({
              deal_id: deal.id,
              tenant_id: tenant.id,
              type: 'system_alert',
              description: 'Deal stagnant depuis plus de 14 jours',
            });

          if (insertError) {
            logger.warn('[StagnantDealsJob] Failed to create alert for deal', {
              dealId: deal.id,
              error: insertError.message,
            });
            continue;
          }

          tenantAlerts++;
        } catch (dealError) {
          logger.warn('[StagnantDealsJob] Error processing deal', {
            dealId: deal.id,
            error: dealError instanceof Error ? dealError.message : dealError,
          });
        }
      }

      if (tenantAlerts > 0) {
        logger.info('[StagnantDealsJob] Stagnant alerts created for tenant', {
          tenantId: tenant.id,
          alertsCreated: tenantAlerts,
          stagnantDealsFound: stagnantDeals.length,
        });
      }

      totalStagnant += tenantAlerts;
    } catch (tenantError) {
      logger.error('[StagnantDealsJob] Failed for tenant', {
        tenantId: tenant.id,
        error: tenantError instanceof Error ? tenantError.message : tenantError,
      });
    }
  }

  const elapsed = Date.now() - startTime;
  logger.info('[StagnantDealsJob] Completed', {
    tenantsProcessed: tenants.length,
    totalAlertsCreated: totalStagnant,
    executionTimeMs: elapsed,
  });
}
