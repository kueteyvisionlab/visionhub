import { logger } from '../utils/logger';
import { runScoringJob } from './scoring.job';
import { runRemindersJob } from './reminders.job';
import { runStagnantDealsJob } from './stagnant-deals.job';
import { runWebhookRetryJob } from './webhook-retry.job';
import { runUsageResetJob } from './usage-reset.job';

// ---------------------------------------------------------------------------
// Interval handles (for graceful shutdown)
// ---------------------------------------------------------------------------

const intervals: NodeJS.Timeout[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

/**
 * Calculate milliseconds until the next occurrence of a given UTC hour.
 * E.g. msUntilUtcHour(2) returns the ms until 02:00 UTC.
 */
function msUntilUtcHour(hour: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(hour, 0, 0, 0);

  // If the target hour has already passed today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Safely execute a job, catching any errors so other jobs keep running.
 */
async function safeRun(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.error(`Job "${name}" failed`, error);
  }
}

// ---------------------------------------------------------------------------
// startScheduler
// ---------------------------------------------------------------------------

export function startScheduler(): void {
  logger.info('Job scheduler started');

  // 1. Scoring job — first run at next 02:00 UTC, then every 24h
  const scoringDelay = msUntilUtcHour(2);
  const scoringInitial = setTimeout(() => {
    safeRun('scoring', runScoringJob);

    const scoringInterval = setInterval(
      () => safeRun('scoring', runScoringJob),
      24 * ONE_HOUR,
    );
    intervals.push(scoringInterval);
  }, scoringDelay);
  intervals.push(scoringInitial as unknown as NodeJS.Timeout);

  logger.info('Scoring job scheduled', {
    firstRunInMinutes: Math.round(scoringDelay / ONE_MINUTE),
    intervalHours: 24,
  });

  // 2. Reminders job — every 1 hour
  const remindersInterval = setInterval(
    () => safeRun('reminders', runRemindersJob),
    ONE_HOUR,
  );
  intervals.push(remindersInterval);
  // Also run once immediately after startup
  safeRun('reminders', runRemindersJob);

  logger.info('Reminders job scheduled', { intervalHours: 1 });

  // 3. Stagnant deals check — every 6 hours
  const stagnantInterval = setInterval(
    () => safeRun('stagnant-deals', runStagnantDealsJob),
    6 * ONE_HOUR,
  );
  intervals.push(stagnantInterval);
  safeRun('stagnant-deals', runStagnantDealsJob);

  logger.info('Stagnant deals job scheduled', { intervalHours: 6 });

  // 4. Webhook retry — every 15 minutes
  const webhookRetryInterval = setInterval(
    () => safeRun('webhook-retry', runWebhookRetryJob),
    15 * ONE_MINUTE,
  );
  intervals.push(webhookRetryInterval);
  safeRun('webhook-retry', runWebhookRetryJob);

  logger.info('Webhook retry job scheduled', { intervalMinutes: 15 });

  // 5. Usage reset — check every 1 hour if it's the 1st of the month at 00:xx UTC
  const usageResetInterval = setInterval(async () => {
    const now = new Date();
    if (now.getUTCDate() === 1 && now.getUTCHours() === 0) {
      await safeRun('usage-reset', runUsageResetJob);
    }
  }, ONE_HOUR);
  intervals.push(usageResetInterval);

  logger.info('Usage reset job scheduled', {
    trigger: '1st of month at 00:00 UTC (checked hourly)',
  });
}

// ---------------------------------------------------------------------------
// stopScheduler
// ---------------------------------------------------------------------------

export function stopScheduler(): void {
  logger.info('Stopping job scheduler', { activeTimers: intervals.length });

  for (const handle of intervals) {
    clearInterval(handle);
    clearTimeout(handle);
  }

  intervals.length = 0;
  logger.info('Job scheduler stopped');
}
