import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Brevo API base URL
// ---------------------------------------------------------------------------
const BREVO_API_BASE = 'https://api.brevo.com/v3';

// ---------------------------------------------------------------------------
// BrevoService
// ---------------------------------------------------------------------------

export class BrevoService {
  // -----------------------------------------------------------------------
  // isConfigured
  // -----------------------------------------------------------------------
  /**
   * Check whether the Brevo API key is set and usable.
   * Returns false if the key is empty or a placeholder value.
   */
  static isConfigured(): boolean {
    return (
      !!env.BREVO_API_KEY &&
      env.BREVO_API_KEY !== '' &&
      env.BREVO_API_KEY !== 'placeholder'
    );
  }

  // -----------------------------------------------------------------------
  // sendTransactionalEmail
  // -----------------------------------------------------------------------
  /**
   * Send a single transactional email (e.g. welcome, reset password, invoice).
   *
   * @param to - Recipient with email and name
   * @param subject - Email subject line
   * @param htmlContent - HTML body of the email
   * @param params - Optional template parameters for variable substitution
   * @returns The Brevo message ID for tracking
   */
  static async sendTransactionalEmail(
    to: { email: string; name: string },
    subject: string,
    htmlContent: string,
    params?: Record<string, string>,
  ): Promise<{ messageId: string }> {
    try {
      if (!BrevoService.isConfigured()) {
        const mockId = `msg_dev_${Date.now()}`;
        logger.info('Brevo [DEV] sendTransactionalEmail', { to: to.email, subject, messageId: mockId });
        return { messageId: mockId };
      }

      const response = await BrevoService.apiRequest('POST', '/smtp/email', {
        to: [to],
        subject,
        htmlContent,
        params: params ?? {},
      });

      logger.info('Brevo transactional email sent', { to: to.email, subject, messageId: response.messageId });
      return { messageId: response.messageId };
    } catch (error) {
      logger.error('Failed to send transactional email via Brevo', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // sendCampaignEmail
  // -----------------------------------------------------------------------
  /**
   * Send a campaign-style email to multiple recipients.
   * This uses the transactional API in batch mode rather than Brevo campaigns,
   * allowing per-recipient customisation.
   *
   * @param campaignId - Internal campaign identifier for tracking
   * @param recipients - List of recipients with email and name
   * @param subject - Email subject line
   * @param htmlContent - HTML body of the email
   * @returns Count of successfully sent and failed emails
   */
  static async sendCampaignEmail(
    campaignId: string,
    recipients: { email: string; name: string }[],
    subject: string,
    htmlContent: string,
  ): Promise<{ sent: number; failed: number }> {
    try {
      if (!BrevoService.isConfigured()) {
        logger.info('Brevo [DEV] sendCampaignEmail', {
          campaignId,
          recipientCount: recipients.length,
          subject,
        });
        return { sent: recipients.length, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      // Send in batches to respect Brevo rate limits
      for (const recipient of recipients) {
        try {
          await BrevoService.apiRequest('POST', '/smtp/email', {
            to: [recipient],
            subject,
            htmlContent,
            headers: { 'X-Campaign-Id': campaignId },
          });
          sent++;
        } catch (sendError) {
          logger.warn('Brevo campaign email failed for recipient', {
            email: recipient.email,
            campaignId,
            error: sendError,
          });
          failed++;
        }
      }

      logger.info('Brevo campaign email batch completed', { campaignId, sent, failed });
      return { sent, failed };
    } catch (error) {
      logger.error('Failed to send campaign email via Brevo', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // addContact
  // -----------------------------------------------------------------------
  /**
   * Add or update a contact in Brevo's contact database.
   * Useful for syncing CRM contacts with email marketing lists.
   *
   * @param email - Contact email address
   * @param attributes - Contact attributes (e.g. FIRSTNAME, LASTNAME, COMPANY)
   * @param listIds - Optional Brevo list IDs to add the contact to
   */
  static async addContact(
    email: string,
    attributes: Record<string, any>,
    listIds?: number[],
  ): Promise<void> {
    try {
      if (!BrevoService.isConfigured()) {
        logger.info('Brevo [DEV] addContact', { email, attributes, listIds });
        return;
      }

      const body: Record<string, any> = {
        email,
        attributes,
        updateEnabled: true,
      };

      if (listIds && listIds.length > 0) {
        body.listIds = listIds;
      }

      await BrevoService.apiRequest('POST', '/contacts', body);
      logger.info('Brevo contact added/updated', { email, listIds });
    } catch (error) {
      logger.error('Failed to add contact to Brevo', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // getEmailEvents
  // -----------------------------------------------------------------------
  /**
   * Retrieve tracking events (delivered, opened, clicked, bounced, etc.)
   * for a specific transactional email.
   *
   * @param messageId - The Brevo message ID returned from sendTransactionalEmail
   * @returns Array of events with type and timestamp
   */
  static async getEmailEvents(
    messageId: string,
  ): Promise<{ event: string; date: string }[]> {
    try {
      if (!BrevoService.isConfigured()) {
        const mockEvents = [
          { event: 'delivered', date: new Date().toISOString() },
          { event: 'opened', date: new Date(Date.now() + 60_000).toISOString() },
        ];
        logger.info('Brevo [DEV] getEmailEvents', { messageId, events: mockEvents });
        return mockEvents;
      }

      const response = await BrevoService.apiRequest(
        'GET',
        `/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}`,
      );

      const events: { event: string; date: string }[] = (response.events ?? []).map(
        (e: any) => ({ event: e.event, date: e.date }),
      );

      logger.debug('Brevo email events retrieved', { messageId, count: events.length });
      return events;
    } catch (error) {
      logger.error('Failed to get email events from Brevo', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // apiRequest (private)
  // -----------------------------------------------------------------------
  /**
   * Make an authenticated request to the Brevo API.
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param path - API path relative to /v3 (e.g. /smtp/email)
   * @param body - Optional request body (will be JSON-encoded)
   * @returns Parsed JSON response
   */
  private static async apiRequest(
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    const url = `${BREVO_API_BASE}${path}`;

    const headers: Record<string, string> = {
      'api-key': env.BREVO_API_KEY,
      Accept: 'application/json',
    };

    const options: RequestInit = { method, headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Brevo API ${method} ${path} failed (${response.status}): ${errorBody}`);
    }

    // Some endpoints (e.g. DELETE) may return 204 with no body
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
}
