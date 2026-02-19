import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Twilio API base URL
// ---------------------------------------------------------------------------
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

// ---------------------------------------------------------------------------
// TwilioService
// ---------------------------------------------------------------------------

export class TwilioService {
  // -----------------------------------------------------------------------
  // isConfigured
  // -----------------------------------------------------------------------
  /**
   * Check whether Twilio credentials are set and usable.
   * Returns false if the account SID is empty or a placeholder value.
   */
  static isConfigured(): boolean {
    return (
      !!env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_ACCOUNT_SID !== '' &&
      env.TWILIO_ACCOUNT_SID !== 'placeholder'
    );
  }

  // -----------------------------------------------------------------------
  // formatPhoneNumber
  // -----------------------------------------------------------------------
  /**
   * Normalize a phone number to E.164 international format.
   * Handles common French phone number formats:
   *   - 06 12 34 56 78 -> +33612345678
   *   - 0033612345678  -> +33612345678
   *   - +33612345678   -> +33612345678 (unchanged)
   *
   * @param phone - The phone number to normalize
   * @param countryCode - Country prefix (default: +33 for France)
   * @returns The normalized phone number in E.164 format
   */
  static formatPhoneNumber(phone: string, countryCode: string = '+33'): string {
    // Remove all spaces, dashes, dots and parentheses
    let cleaned = phone.replace(/[\s\-.()/]/g, '');

    // Already in international format with +
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Handle 00XX prefix (e.g. 0033)
    if (cleaned.startsWith('00')) {
      return `+${cleaned.slice(2)}`;
    }

    // Handle local format starting with 0 (e.g. 0612345678)
    if (cleaned.startsWith('0')) {
      return `${countryCode}${cleaned.slice(1)}`;
    }

    // Assume it already lacks a leading zero, prepend country code
    return `${countryCode}${cleaned}`;
  }

  // -----------------------------------------------------------------------
  // sendSms
  // -----------------------------------------------------------------------
  /**
   * Send a single SMS message via Twilio.
   *
   * @param to - Recipient phone number (will be normalized to E.164)
   * @param body - SMS message body (max 1600 characters)
   * @returns The message SID and delivery status
   */
  static async sendSms(
    to: string,
    body: string,
  ): Promise<{ sid: string; status: string }> {
    try {
      const formattedTo = TwilioService.formatPhoneNumber(to);

      if (!TwilioService.isConfigured()) {
        const mockSid = `SM_dev_${Date.now()}`;
        logger.info('Twilio [DEV] sendSms', { to: formattedTo, bodyLength: body.length, sid: mockSid });
        return { sid: mockSid, status: 'sent' };
      }

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: env.TWILIO_PHONE_NUMBER,
            Body: body,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio sendSms failed (${response.status}): ${errorBody}`);
      }

      const message = await response.json() as any;
      logger.info('Twilio SMS sent', { sid: message.sid, to: formattedTo, status: message.status });
      return { sid: message.sid, status: message.status };
    } catch (error) {
      logger.error('Failed to send SMS via Twilio', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // sendWhatsApp
  // -----------------------------------------------------------------------
  /**
   * Send a WhatsApp message via Twilio's WhatsApp Business API.
   * Uses the `whatsapp:` prefix convention required by Twilio.
   *
   * @param to - Recipient phone number (will be normalized to E.164)
   * @param body - Message body
   * @param templateSid - Optional pre-approved WhatsApp template SID
   * @returns The message SID and delivery status
   */
  static async sendWhatsApp(
    to: string,
    body: string,
    templateSid?: string,
  ): Promise<{ sid: string; status: string }> {
    try {
      const formattedTo = TwilioService.formatPhoneNumber(to);

      if (!TwilioService.isConfigured()) {
        const mockSid = `WA_dev_${Date.now()}`;
        logger.info('Twilio [DEV] sendWhatsApp', {
          to: formattedTo,
          bodyLength: body.length,
          templateSid,
          sid: mockSid,
        });
        return { sid: mockSid, status: 'sent' };
      }

      const params: Record<string, string> = {
        To: `whatsapp:${formattedTo}`,
        From: `whatsapp:${env.TWILIO_PHONE_NUMBER}`,
        Body: body,
      };

      if (templateSid) {
        params.ContentSid = templateSid;
      }

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(params),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio sendWhatsApp failed (${response.status}): ${errorBody}`);
      }

      const message = await response.json() as any;
      logger.info('Twilio WhatsApp message sent', { sid: message.sid, to: formattedTo, status: message.status });
      return { sid: message.sid, status: message.status };
    } catch (error) {
      logger.error('Failed to send WhatsApp message via Twilio', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // getMessageStatus
  // -----------------------------------------------------------------------
  /**
   * Check the delivery status of a previously sent message.
   *
   * @param sid - The Twilio message SID
   * @returns The current status and optional error code
   */
  static async getMessageStatus(
    sid: string,
  ): Promise<{ status: string; errorCode?: number }> {
    try {
      if (!TwilioService.isConfigured()) {
        logger.info('Twilio [DEV] getMessageStatus', { sid });
        return { status: 'delivered' };
      }

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages/${sid}.json`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio getMessageStatus failed (${response.status}): ${errorBody}`);
      }

      const message = await response.json() as any;
      const result: { status: string; errorCode?: number } = { status: message.status };

      if (message.error_code) {
        result.errorCode = message.error_code;
      }

      logger.debug('Twilio message status retrieved', { sid, status: result.status });
      return result;
    } catch (error) {
      logger.error('Failed to get message status from Twilio', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // sendBulkSms
  // -----------------------------------------------------------------------
  /**
   * Send SMS messages to multiple recipients with rate limiting (10/sec)
   * to respect Twilio's throughput limits.
   *
   * @param recipients - Array of recipient objects with phone number and message body
   * @returns Count of successfully sent and failed messages
   */
  static async sendBulkSms(
    recipients: { to: string; body: string }[],
  ): Promise<{ sent: number; failed: number }> {
    try {
      if (!TwilioService.isConfigured()) {
        logger.info('Twilio [DEV] sendBulkSms', { recipientCount: recipients.length });
        return { sent: recipients.length, failed: 0 };
      }

      let sent = 0;
      let failed = 0;
      const RATE_LIMIT = 10; // messages per second

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
          await TwilioService.sendSms(recipient.to, recipient.body);
          sent++;
        } catch (sendError) {
          logger.warn('Twilio bulk SMS failed for recipient', {
            to: recipient.to,
            error: sendError,
          });
          failed++;
        }

        // Rate limiting: pause every RATE_LIMIT messages
        if ((i + 1) % RATE_LIMIT === 0 && i + 1 < recipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      logger.info('Twilio bulk SMS batch completed', { sent, failed, total: recipients.length });
      return { sent, failed };
    } catch (error) {
      logger.error('Failed to send bulk SMS via Twilio', error);
      throw error;
    }
  }
}
