import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

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
// Helper — calculate next send date based on trigger_rule
// ---------------------------------------------------------------------------

function calculateNextSendDate(
  currentDate: Date,
  triggerRule: Record<string, unknown>,
): Date | null {
  const frequency = triggerRule.frequency as string | undefined;

  if (!frequency || frequency === 'once') {
    return null; // one-shot reminder, will be deactivated
  }

  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + 1);
      break;

    case 'weekly':
      next.setUTCDate(next.getUTCDate() + 7);
      break;

    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;

    case 'yearly':
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;

    case 'interval': {
      const intervalDays = Number(triggerRule.interval_days ?? 1);
      next.setUTCDate(next.getUTCDate() + intervalDays);
      break;
    }

    default:
      logger.warn('[RemindersJob] Unknown frequency, deactivating', { frequency });
      return null;
  }

  return next;
}

// ---------------------------------------------------------------------------
// runRemindersJob
// ---------------------------------------------------------------------------

export async function runRemindersJob(): Promise<void> {
  const startTime = Date.now();
  logger.info('[RemindersJob] Starting reminders processing');

  const tenants = await getActiveTenants();

  if (tenants.length === 0) {
    logger.info('[RemindersJob] No active tenants found, skipping');
    return;
  }

  let totalProcessed = 0;

  for (const tenant of tenants) {
    try {
      // Fetch due reminders for this tenant
      const { data: reminders, error: remindersError } = await supabaseAdmin
        .from('automated_reminders')
        .select('id, type, message, trigger_rule, contact_id, deal_id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .lte('next_send_date', new Date().toISOString());

      if (remindersError) {
        logger.error('[RemindersJob] Failed to fetch reminders for tenant', {
          tenantId: tenant.id,
          error: remindersError.message,
        });
        continue;
      }

      if (!reminders || reminders.length === 0) {
        continue;
      }

      let tenantProcessed = 0;

      for (const reminder of reminders) {
        try {
          // Placeholder for actual email/SMS send
          logger.info('[RemindersJob] Sending reminder (placeholder)', {
            reminderId: reminder.id,
            type: reminder.type,
            contactId: reminder.contact_id,
            dealId: reminder.deal_id,
            message: typeof reminder.message === 'string'
              ? reminder.message.substring(0, 100)
              : '(no message)',
          });

          const now = new Date();
          const triggerRule = (reminder.trigger_rule ?? {}) as Record<string, unknown>;
          const frequency = triggerRule.frequency as string | undefined;

          // Calculate next send date
          const nextSendDate = calculateNextSendDate(now, triggerRule);

          if (!nextSendDate || frequency === 'once') {
            // One-shot reminder: deactivate
            await supabaseAdmin
              .from('automated_reminders')
              .update({
                last_sent_at: now.toISOString(),
                is_active: false,
              })
              .eq('id', reminder.id);
          } else {
            // Recurring reminder: update dates
            await supabaseAdmin
              .from('automated_reminders')
              .update({
                last_sent_at: now.toISOString(),
                next_send_date: nextSendDate.toISOString(),
              })
              .eq('id', reminder.id);
          }

          tenantProcessed++;
        } catch (reminderError) {
          logger.error('[RemindersJob] Failed to process reminder', {
            reminderId: reminder.id,
            error: reminderError instanceof Error ? reminderError.message : reminderError,
          });
        }
      }

      if (tenantProcessed > 0) {
        logger.info('[RemindersJob] Tenant reminders processed', {
          tenantId: tenant.id,
          count: tenantProcessed,
        });
      }

      totalProcessed += tenantProcessed;
    } catch (tenantError) {
      logger.error('[RemindersJob] Failed for tenant', {
        tenantId: tenant.id,
        error: tenantError instanceof Error ? tenantError.message : tenantError,
      });
    }
  }

  const elapsed = Date.now() - startTime;
  logger.info('[RemindersJob] Completed', {
    tenantsProcessed: tenants.length,
    totalRemindersProcessed: totalProcessed,
    executionTimeMs: elapsed,
  });
}
