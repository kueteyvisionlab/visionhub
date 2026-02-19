import { createHmac } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// WebhookService
// ---------------------------------------------------------------------------

export class WebhookService {
  // -----------------------------------------------------------------------
  // dispatch
  // -----------------------------------------------------------------------
  /**
   * Dispatch a webhook event to all active webhooks registered by the tenant
   * that subscribe to the given event type.
   *
   * For each matching webhook:
   * 1. Create a `webhook_deliveries` record.
   * 2. Compute an HMAC-SHA256 signature of the payload using the webhook secret.
   * 3. POST the payload to the webhook URL (skipped in dev mode).
   * 4. Record the response status and body.
   */
  static async dispatch(
    tenantId: string,
    eventType: string,
    payload: object,
  ): Promise<void> {
    try {
      const isDev = process.env.NODE_ENV !== 'production';

      // Find all active webhooks for this tenant that listen to this event
      const { data: webhooks, error: webhooksError } = await supabaseAdmin
        .from('webhooks')
        .select('id, url, secret, events')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (webhooksError) {
        throw new Error(`Failed to fetch webhooks: ${webhooksError.message}`);
      }

      if (!webhooks || webhooks.length === 0) {
        logger.debug('No active webhooks for tenant', { tenantId, eventType });
        return;
      }

      // Filter to webhooks that subscribe to this event type.
      // The `events` column is a TEXT[] (Postgres array).
      const matchingWebhooks = webhooks.filter((wh) => {
        const events: string[] = Array.isArray(wh.events) ? wh.events : [];
        return events.includes(eventType) || events.includes('*');
      });

      if (matchingWebhooks.length === 0) {
        logger.debug('No webhooks match event type', { tenantId, eventType });
        return;
      }

      const payloadString = JSON.stringify(payload);

      for (const webhook of matchingWebhooks) {
        try {
          const signature = WebhookService.generateSignature(
            payloadString,
            webhook.secret,
          );

          // Create delivery record
          const { data: delivery, error: insertError } = await supabaseAdmin
            .from('webhook_deliveries')
            .insert({
              webhook_id: webhook.id,
              event_type: eventType,
              payload,
              attempts: 1,
            })
            .select('id')
            .single();

          if (insertError) {
            logger.warn('Failed to create webhook delivery record', {
              webhookId: webhook.id,
              error: insertError.message,
            });
            continue;
          }

          const deliveryId = delivery?.id;

          if (isDev) {
            // In dev mode, simulate a successful delivery without HTTP call
            logger.info('Webhook dispatched (dev mode - no HTTP call)', {
              deliveryId,
              webhookId: webhook.id,
              url: webhook.url,
              eventType,
              signature,
            });

            await supabaseAdmin
              .from('webhook_deliveries')
              .update({
                response_status: 200,
                response_body: 'DEV_MODE_SIMULATED',
                delivered_at: new Date().toISOString(),
              })
              .eq('id', deliveryId);

            continue;
          }

          // ---- Production: actually POST to the webhook URL ----
          try {
            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': eventType,
                'X-Webhook-Delivery': deliveryId,
              },
              body: payloadString,
              signal: AbortSignal.timeout(10_000), // 10 s timeout
            });

            const responseBody = await response.text().catch(() => '');

            await supabaseAdmin
              .from('webhook_deliveries')
              .update({
                response_status: response.status,
                response_body: responseBody.slice(0, 2000), // cap stored response
                delivered_at: response.ok ? new Date().toISOString() : null,
              })
              .eq('id', deliveryId);

            if (response.ok) {
              logger.info('Webhook delivered successfully', {
                deliveryId,
                webhookId: webhook.id,
                status: response.status,
              });
            } else {
              logger.warn('Webhook delivery received non-OK response', {
                deliveryId,
                webhookId: webhook.id,
                status: response.status,
              });
            }
          } catch (httpError) {
            const errorMessage =
              httpError instanceof Error ? httpError.message : String(httpError);

            await supabaseAdmin
              .from('webhook_deliveries')
              .update({
                response_status: 0,
                response_body: `Error: ${errorMessage}`.slice(0, 2000),
              })
              .eq('id', deliveryId);

            logger.warn('Webhook HTTP call failed', {
              deliveryId,
              webhookId: webhook.id,
              url: webhook.url,
              error: errorMessage,
            });
          }
        } catch (innerError) {
          logger.warn('Skipping webhook due to error', {
            webhookId: webhook.id,
            error: innerError,
          });
        }
      }

      logger.info('Webhook dispatch completed', {
        tenantId,
        eventType,
        dispatched: matchingWebhooks.length,
      });
    } catch (error) {
      logger.error('Failed to dispatch webhooks', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // retryFailed
  // -----------------------------------------------------------------------
  /**
   * Retry failed webhook deliveries that have a non-200 response status
   * and fewer than 3 attempts.
   *
   * @returns The number of deliveries retried.
   */
  static async retryFailed(tenantId: string): Promise<number> {
    try {
      const isDev = process.env.NODE_ENV !== 'production';

      // Find failed deliveries for this tenant's webhooks
      // We need to join through webhooks to filter by tenant_id
      const { data: failedDeliveries, error: queryError } = await supabaseAdmin
        .from('webhook_deliveries')
        .select('id, webhook_id, event_type, payload, attempts, webhooks!inner(id, url, secret, tenant_id)')
        .neq('response_status', 200)
        .lt('attempts', 3);

      if (queryError) {
        throw new Error(`Failed to fetch failed deliveries: ${queryError.message}`);
      }

      // Filter by tenant at application level (inner join on tenant_id)
      const tenantDeliveries = (failedDeliveries ?? []).filter((d) => {
        const webhook = d.webhooks as any;
        return webhook?.tenant_id === tenantId;
      });

      if (tenantDeliveries.length === 0) {
        logger.debug('No failed deliveries to retry', { tenantId });
        return 0;
      }

      let retriedCount = 0;

      for (const delivery of tenantDeliveries) {
        const webhook = delivery.webhooks as any;

        try {
          const payloadString = JSON.stringify(delivery.payload);
          const signature = WebhookService.generateSignature(
            payloadString,
            webhook.secret,
          );

          // Increment attempts
          const newAttempts = (delivery.attempts ?? 0) + 1;

          if (isDev) {
            logger.info('Webhook retry (dev mode - no HTTP call)', {
              deliveryId: delivery.id,
              webhookId: webhook.id,
              attempt: newAttempts,
            });

            await supabaseAdmin
              .from('webhook_deliveries')
              .update({
                attempts: newAttempts,
                response_status: 200,
                response_body: 'DEV_MODE_RETRY_SIMULATED',
                delivered_at: new Date().toISOString(),
              })
              .eq('id', delivery.id);

            retriedCount++;
            continue;
          }

          // ---- Production: actual HTTP POST ----
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

            logger.info('Webhook retry completed', {
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
                response_body: `Retry error: ${errorMessage}`.slice(0, 2000),
              })
              .eq('id', delivery.id);

            logger.warn('Webhook retry HTTP call failed', {
              deliveryId: delivery.id,
              error: errorMessage,
              attempt: newAttempts,
            });
          }

          retriedCount++;
        } catch (innerError) {
          logger.warn('Skipping delivery retry due to error', {
            deliveryId: delivery.id,
            error: innerError,
          });
        }
      }

      logger.info('Webhook retry batch completed', {
        tenantId,
        retriedCount,
        totalFailed: tenantDeliveries.length,
      });

      return retriedCount;
    } catch (error) {
      logger.error('Failed to retry webhooks', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // generateSignature
  // -----------------------------------------------------------------------
  /**
   * Generate an HMAC-SHA256 hex signature for webhook payload verification.
   *
   * The receiving endpoint should compute the same signature using the shared
   * secret and compare it with the `X-Webhook-Signature` header to verify
   * the request authenticity.
   */
  static generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  }
}
