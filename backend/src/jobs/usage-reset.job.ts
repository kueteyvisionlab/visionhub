import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// runUsageResetJob
// ---------------------------------------------------------------------------

export async function runUsageResetJob(): Promise<void> {
  const startTime = Date.now();
  const now = new Date();

  // Safety check: only run on the 1st of the month
  if (now.getUTCDate() !== 1) {
    logger.debug('[UsageResetJob] Not the 1st of the month, skipping');
    return;
  }

  logger.info('[UsageResetJob] Starting monthly usage counter reset');

  // Reset current_usage JSONB to {} for all tenants
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({ current_usage: {} })
    .neq('id', '00000000-0000-0000-0000-000000000000') // match all rows (dummy neq)
    .select('id');

  if (error) {
    logger.error('[UsageResetJob] Failed to reset usage counters', {
      error: error.message,
    });
    return;
  }

  const tenantsReset = data?.length ?? 0;

  const elapsed = Date.now() - startTime;
  logger.info(`[UsageResetJob] Monthly usage counters reset for ${tenantsReset} tenants`, {
    tenantsReset,
    month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    executionTimeMs: elapsed,
  });
}
