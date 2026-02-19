import { supabaseAdmin } from '../config/supabase';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3;
const RETRY_WINDOW_HOURS = 72;

// ---------------------------------------------------------------------------
// runWebhookRetryJob
// ---------------------------------------------------------------------------

export async function runWebhookRetryJob(): Promise<void> {
  const startTime = Date.now();
  const isDev = process.env.NODE_ENV !== 'production';

  logger.info('[WebhookRetryJob] Starting webhook delivery retry');

  // Calculate cutoff: only retry deliveries created within the last 72 hours
  const cutoffDate = new Date();
  cutoffDate.setUTCHours(cutoffDate.getUTCHours() - RETRY_WINDOW_HOURS);
  const cutoffISO = cutoffDate.toISOString();

  // Query failed deliveries: response_status != 200 (or null), attempts < 3, within 72h
  const { data: failedDeliveries, error: queryError } = await supabaseAdmin
    .from('webhook_deliveries')
    .select('id, webhook_id, event_type, payload, attempts, response_status, webhooks!inner(id, url, secret)')
    .lt('attempts', MAX_ATTEMPTS)
    .gte('created_at', cutoffISO);

  if (queryError) {
    logger.error('[WebhookRetryJob] Failed to query deliveries', {
      error: queryError.message,
    });
    return;
  }

  // Filter to those with non-200 status (including null)
  const retriable = (failedDeliveries ?? []).filter(
    (d) => d.response_status !== 200,
  );

  if (retriable.length === 0) {
    logger.info('[WebhookRetryJob] No failed deliveries to retry');
    return;
  }

  let retriedCount = 0;
  let successCount = 0;

  for (const delivery of retriable) {
    const webhook = delivery.webhooks as any;

    try {
      const newAttempts = (delivery.attempts ?? 0) + 1;
      const payloadString = JSON.stringify(delivery.payload);
      const signature = WebhookService.generateSignature(
        payloadString,
        webhook.secret,
      );

      if (isDev) {
        // Dev mode: simulate successful delivery
        logger.info('[WebhookRetryJob] Retrying delivery (dev mode - no HTTP call)', {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          attempt: newAttempts,
        });

        await supabaseAdmin
          .from('webhook_deliveries')
          .update({
            attempts: newAttempts,
            response_status: 200,
            response_body: 'DEV_MODE_CRON_RETRY_SIMULATED',
            delivered_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);

        retriedCount++;
        successCount++;
        continue;
      }

      // Production: actual HTTP POST
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': delivery.event_type,
            'X-Webhook-Delivery': delivery.id,
            'X-Webhook-Retry': String(newAttempts),
          },
          body: payloadString,
          signal: AbortSignal.timeout(10_000),
        });

        const responseBody = await response.text().catch(() => '');

        await supabaseAdmin
          .from('webhook_deliveries')
          .update({
            attempts: newAttempts,
            response_status: response.status,
            response_body: responseBody.slice(0, 2000),
            delivered_at: response.ok ? new Date().toISOString() : null,
          })
          .eq('id', delivery.id);

        if (response.ok) successCount++;

        logger.debug('[WebhookRetryJob] Retry result', {
          deliveryId: delivery.id,
          status: response.status,
          attempt: newAttempts,
        });
      } catch (httpError) {
        const errorMessage =
          httpError instanceof Error ? httpError.message : String(httpError);

        await supabaseAdmin
          .from('webhook_deliveries')
          .update({
            attempts: newAttempts,
            response_status: 0,
            response_body: `Cron retry error: ${errorMessage}`.slice(0, 2000),
          })
          .eq('id', delivery.id);

        logger.warn('[WebhookRetryJob] HTTP call failed', {
          deliveryId: delivery.id,
          error: errorMessage,
          attempt: newAttempts,
        });
      }

      retriedCount++;
    } catch (error) {
      logger.warn('[WebhookRetryJob] Skipping delivery due to error', {
        deliveryId: delivery.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const elapsed = Date.now() - startTime;
  logger.info('[WebhookRetryJob] Completed', {
    totalFailed: retriable.length,
    retriedCount,
    successCount,
    executionTimeMs: elapsed,
  });
}
