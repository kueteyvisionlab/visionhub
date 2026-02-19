import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// NotificationService
// ---------------------------------------------------------------------------

export class NotificationService {
  // -----------------------------------------------------------------------
  // sendOrderNotification
  // -----------------------------------------------------------------------
  /**
   * Log (and eventually send via Brevo) a notification related to an order
   * lifecycle event.
   *
   * Currently acts as a placeholder that logs the event. In production this
   * would call the Brevo transactional email API.
   */
  static async sendOrderNotification(
    orderId: string,
    tenantId: string,
    type: 'sent' | 'accepted' | 'rejected' | 'paid',
  ): Promise<void> {
    try {
      // Fetch order with contact info for context
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, type, total, contact_id, contacts!inner(email, first_name, last_name)')
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .single();

      if (orderError || !order) {
        throw new Error(`Order not found: ${orderId} (${orderError?.message})`);
      }

      const contact = order.contacts as any;
      const recipientEmail: string = contact?.email ?? 'unknown';
      const recipientName: string =
        [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || 'Client';

      // Build notification subject based on type
      const subjects: Record<typeof type, string> = {
        sent: `Votre ${order.type === 'quote' ? 'devis' : 'facture'} #${order.order_number} est disponible`,
        accepted: `Devis #${order.order_number} accepté`,
        rejected: `Devis #${order.order_number} refusé`,
        paid: `Paiement reçu pour la facture #${order.order_number}`,
      };

      const subject = subjects[type];

      // ---- Placeholder: log instead of actually sending via Brevo ----
      logger.info('Order notification dispatched (placeholder)', {
        orderId,
        tenantId,
        type,
        recipientEmail,
        recipientName,
        subject,
        total: order.total,
      });

      // TODO: integrate Brevo transactional email
      // await brevo.sendTransactionalEmail({
      //   to: [{ email: recipientEmail, name: recipientName }],
      //   subject,
      //   templateId: TEMPLATE_IDS[type],
      //   params: { orderNumber: order.order_number, total: order.total },
      // });
    } catch (error) {
      logger.error('Failed to send order notification', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // sendReminderNotifications
  // -----------------------------------------------------------------------
  /**
   * Process all active automated reminders whose `scheduled_at` has passed
   * and that have not yet been sent.
   *
   * For recurring reminders, calculates the next scheduled date based on the
   * recurrence rule and updates the row accordingly.
   *
   * @returns The number of reminders processed.
   */
  static async sendReminderNotifications(tenantId: string): Promise<number> {
    try {
      const now = new Date().toISOString();

      // Find reminders that are due
      const { data: reminders, error } = await supabaseAdmin
        .from('automated_reminders')
        .select('id, contact_id, type, title, message, channel, is_recurring, recurrence_rule, scheduled_at')
        .eq('tenant_id', tenantId)
        .is('sent_at', null)
        .lte('scheduled_at', now);

      if (error) {
        throw new Error(`Failed to fetch reminders: ${error.message}`);
      }

      if (!reminders || reminders.length === 0) {
        logger.debug('No reminders due', { tenantId });
        return 0;
      }

      let sentCount = 0;

      for (const reminder of reminders) {
        try {
          // ---- Placeholder: log the notification ----
          logger.info('Reminder notification sent (placeholder)', {
            reminderId: reminder.id,
            contactId: reminder.contact_id,
            type: reminder.type,
            title: reminder.title,
            channel: reminder.channel,
          });

          if (reminder.is_recurring && reminder.recurrence_rule) {
            // Parse simple recurrence rules and schedule the next occurrence.
            // Supports patterns like: FREQ=DAILY, FREQ=WEEKLY, FREQ=MONTHLY, FREQ=YEARLY
            const nextDate = NotificationService.calculateNextOccurrence(
              new Date(reminder.scheduled_at),
              reminder.recurrence_rule,
            );

            const { error: updateError } = await supabaseAdmin
              .from('automated_reminders')
              .update({
                sent_at: now,
                scheduled_at: nextDate.toISOString(),
              })
              .eq('id', reminder.id);

            if (updateError) {
              logger.warn('Failed to update recurring reminder', {
                reminderId: reminder.id,
                error: updateError.message,
              });
              continue;
            }

            // Reset sent_at so the next occurrence is picked up
            await supabaseAdmin
              .from('automated_reminders')
              .update({ sent_at: null })
              .eq('id', reminder.id);
          } else {
            // One-shot reminder: mark as sent
            const { error: updateError } = await supabaseAdmin
              .from('automated_reminders')
              .update({ sent_at: now })
              .eq('id', reminder.id);

            if (updateError) {
              logger.warn('Failed to mark reminder as sent', {
                reminderId: reminder.id,
                error: updateError.message,
              });
              continue;
            }
          }

          sentCount++;
        } catch (innerError) {
          logger.warn('Skipping reminder due to error', {
            reminderId: reminder.id,
            error: innerError,
          });
        }
      }

      logger.info('Reminder notifications processed', { tenantId, sentCount });
      return sentCount;
    } catch (error) {
      logger.error('Failed to send reminder notifications', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // sendDealStageNotification
  // -----------------------------------------------------------------------
  /**
   * Notify the deal owner when a deal moves from one pipeline stage to
   * another. Currently a placeholder that logs the event.
   */
  static async sendDealStageNotification(
    dealId: string,
    tenantId: string,
    fromStage: string,
    toStage: string,
  ): Promise<void> {
    try {
      const { data: deal, error: dealError } = await supabaseAdmin
        .from('deals')
        .select('id, name, owner_user_id, users!deals_owner_user_id_fkey(email, full_name)')
        .eq('id', dealId)
        .eq('tenant_id', tenantId)
        .single();

      if (dealError || !deal) {
        throw new Error(`Deal not found: ${dealId} (${dealError?.message})`);
      }

      const owner = deal.users as any;
      const ownerEmail: string = owner?.email ?? 'unknown';
      const ownerName: string = owner?.full_name ?? 'Unknown';

      logger.info('Deal stage notification dispatched (placeholder)', {
        dealId,
        tenantId,
        dealName: deal.name,
        fromStage,
        toStage,
        ownerEmail,
        ownerName,
      });

      // TODO: integrate Brevo / in-app notification
      // await brevo.sendTransactionalEmail({
      //   to: [{ email: ownerEmail, name: ownerName }],
      //   subject: `Deal "${deal.name}" moved from ${fromStage} to ${toStage}`,
      //   templateId: TEMPLATE_IDS.dealStageChange,
      //   params: { dealName: deal.name, fromStage, toStage },
      // });
    } catch (error) {
      logger.error('Failed to send deal stage notification', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // checkStagnantDeals
  // -----------------------------------------------------------------------
  /**
   * Find open deals that have not been updated for longer than the given
   * threshold (default 14 days). Returns the list of stagnant deal IDs.
   *
   * In a full implementation this would also trigger notifications to the
   * deal owners.
   */
  static async checkStagnantDeals(
    tenantId: string,
    daysThreshold: number = 14,
  ): Promise<string[]> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysThreshold);

      const { data: stagnantDeals, error } = await supabaseAdmin
        .from('deals')
        .select('id, name, owner_user_id, updated_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .lt('updated_at', cutoff.toISOString());

      if (error) {
        throw new Error(`Failed to query stagnant deals: ${error.message}`);
      }

      const dealIds = (stagnantDeals ?? []).map((d) => d.id as string);

      if (dealIds.length > 0) {
        logger.info('Stagnant deals detected', {
          tenantId,
          daysThreshold,
          count: dealIds.length,
          dealIds,
        });

        // TODO: trigger notification to each deal owner
      } else {
        logger.debug('No stagnant deals found', { tenantId, daysThreshold });
      }

      return dealIds;
    } catch (error) {
      logger.error('Failed to check stagnant deals', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Calculate the next occurrence for a recurring reminder based on a
   * simplified iCal-style recurrence rule string.
   *
   * Supported FREQ values: DAILY, WEEKLY, MONTHLY, YEARLY
   * Supports optional INTERVAL parameter (e.g. "FREQ=WEEKLY;INTERVAL=2").
   */
  private static calculateNextOccurrence(
    currentDate: Date,
    recurrenceRule: string,
  ): Date {
    const next = new Date(currentDate);

    // Parse rule: "FREQ=WEEKLY;INTERVAL=2" → { FREQ: "WEEKLY", INTERVAL: "2" }
    const parts: Record<string, string> = {};
    for (const segment of recurrenceRule.split(';')) {
      const [key, value] = segment.split('=');
      if (key && value) {
        parts[key.trim().toUpperCase()] = value.trim();
      }
    }

    const freq = parts['FREQ'] ?? 'DAILY';
    const interval = parseInt(parts['INTERVAL'] ?? '1', 10) || 1;

    switch (freq) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * interval);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + interval);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        logger.warn('Unknown recurrence frequency, defaulting to DAILY', { freq });
        next.setDate(next.getDate() + interval);
    }

    return next;
  }
}
