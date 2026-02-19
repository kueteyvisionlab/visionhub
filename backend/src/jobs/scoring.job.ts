import { supabaseAdmin } from '../config/supabase';
import { ScoringService } from '../services/scoring.service';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Helper — fetch all active tenants
// ---------------------------------------------------------------------------

async function getActiveTenants(): Promise<{ id: string }[]> {
  // Active tenants: paid plans OR tenants that have at least one deal
  const { data: paidTenants, error: paidError } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .neq('plan', 'free');

  if (paidError) {
    throw new Error(`Failed to fetch paid tenants: ${paidError.message}`);
  }

  const { data: tenantsWithDeals, error: dealsError } = await supabaseAdmin
    .from('deals')
    .select('tenant_id')
    .limit(1000);

  if (dealsError) {
    throw new Error(`Failed to fetch tenants with deals: ${dealsError.message}`);
  }

  // Merge unique tenant IDs
  const tenantIds = new Set<string>();
  for (const t of paidTenants ?? []) tenantIds.add(t.id);
  for (const d of tenantsWithDeals ?? []) tenantIds.add(d.tenant_id);

  return Array.from(tenantIds).map((id) => ({ id }));
}

// ---------------------------------------------------------------------------
// runScoringJob
// ---------------------------------------------------------------------------

export async function runScoringJob(): Promise<void> {
  const startTime = Date.now();
  logger.info('[ScoringJob] Starting scoring recalculation');

  const tenants = await getActiveTenants();

  if (tenants.length === 0) {
    logger.info('[ScoringJob] No active tenants found, skipping');
    return;
  }

  let totalDealsScored = 0;

  for (const tenant of tenants) {
    try {
      const count = await ScoringService.recalculateAllScores(tenant.id);
      totalDealsScored += count;
      logger.debug('[ScoringJob] Tenant scored', {
        tenantId: tenant.id,
        dealsScored: count,
      });
    } catch (error) {
      logger.error('[ScoringJob] Failed for tenant', {
        tenantId: tenant.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const elapsed = Date.now() - startTime;
  logger.info('[ScoringJob] Completed', {
    tenantsProcessed: tenants.length,
    totalDealsScored,
    executionTimeMs: elapsed,
    executionTimeSec: Math.round(elapsed / 1000),
  });
}
