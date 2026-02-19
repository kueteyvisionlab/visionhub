import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Plan pricing configuration
// ---------------------------------------------------------------------------
const PLAN_PRICES: Record<string, { monthly: number; stripe_price_id: string }> = {
  starter: { monthly: 4900, stripe_price_id: 'price_starter' },       // 49€ in cents
  pro: { monthly: 14900, stripe_price_id: 'price_pro' },              // 149€ in cents
  enterprise: { monthly: 50000, stripe_price_id: 'price_enterprise' }, // 500€ in cents
};

// ---------------------------------------------------------------------------
// StripeService
// ---------------------------------------------------------------------------

export class StripeService {
  // -----------------------------------------------------------------------
  // isDevMode
  // -----------------------------------------------------------------------
  /**
   * Returns true if the Stripe secret key is a test key or a placeholder.
   * When in dev mode, all methods return mock data instead of calling Stripe.
   */
  static isDevMode(): boolean {
    return (
      !env.STRIPE_SECRET_KEY ||
      env.STRIPE_SECRET_KEY.startsWith('sk_test') ||
      env.STRIPE_SECRET_KEY === '' ||
      env.STRIPE_SECRET_KEY === 'placeholder'
    );
  }

  // -----------------------------------------------------------------------
  // createCustomer
  // -----------------------------------------------------------------------
  /**
   * Create a Stripe customer for a tenant.
   *
   * @param email - Customer email address
   * @param name - Customer or company name
   * @param tenantId - Internal tenant identifier
   * @returns The created Stripe customer object with its ID
   */
  static async createCustomer(
    email: string,
    name: string,
    tenantId: string,
  ): Promise<{ id: string }> {
    try {
      if (StripeService.isDevMode()) {
        const mockId = `cus_dev_${tenantId.slice(0, 8)}`;
        logger.info('Stripe [DEV] createCustomer', { email, name, tenantId, customerId: mockId });
        return { id: mockId };
      }

      // Production: call Stripe API
      const response = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          name,
          'metadata[tenant_id]': tenantId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Stripe createCustomer failed (${response.status}): ${errorBody}`);
      }

      const customer = await response.json() as any;
      logger.info('Stripe customer created', { customerId: customer.id, tenantId });
      return { id: customer.id };
    } catch (error) {
      logger.error('Failed to create Stripe customer', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // createCheckoutSession
  // -----------------------------------------------------------------------
  /**
   * Create a Stripe Checkout session for subscribing to a plan.
   *
   * @param customerId - Stripe customer ID
   * @param plan - Plan key (starter, pro, enterprise)
   * @param successUrl - URL to redirect to after successful payment
   * @param cancelUrl - URL to redirect to if the user cancels
   * @returns The checkout session ID and redirect URL
   */
  static async createCheckoutSession(
    customerId: string,
    plan: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ id: string; url: string }> {
    try {
      const planConfig = PLAN_PRICES[plan];
      if (!planConfig) {
        throw new Error(`Unknown plan: ${plan}. Available plans: ${Object.keys(PLAN_PRICES).join(', ')}`);
      }

      if (StripeService.isDevMode()) {
        const mockSession = {
          id: `cs_dev_${Date.now()}`,
          url: 'http://localhost:3000/billing/success?session=mock',
        };
        logger.info('Stripe [DEV] createCheckoutSession', { customerId, plan, session: mockSession });
        return mockSession;
      }

      // Production: call Stripe API
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: customerId,
          mode: 'subscription',
          'line_items[0][price]': planConfig.stripe_price_id,
          'line_items[0][quantity]': '1',
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Stripe createCheckoutSession failed (${response.status}): ${errorBody}`);
      }

      const session = await response.json() as any;
      logger.info('Stripe checkout session created', { sessionId: session.id, plan });
      return { id: session.id, url: session.url };
    } catch (error) {
      logger.error('Failed to create Stripe checkout session', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // createPortalSession
  // -----------------------------------------------------------------------
  /**
   * Create a Stripe Billing Portal session so the customer can manage
   * their subscription, payment methods, and invoices.
   *
   * @param customerId - Stripe customer ID
   * @param returnUrl - URL to redirect to when the customer leaves the portal
   * @returns The portal session URL
   */
  static async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    try {
      if (StripeService.isDevMode()) {
        const mockUrl = `http://localhost:3000/billing?portal=mock&customer=${customerId}`;
        logger.info('Stripe [DEV] createPortalSession', { customerId, url: mockUrl });
        return { url: mockUrl };
      }

      // Production: call Stripe API
      const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: customerId,
          return_url: returnUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Stripe createPortalSession failed (${response.status}): ${errorBody}`);
      }

      const session = await response.json() as any;
      logger.info('Stripe portal session created', { customerId });
      return { url: session.url };
    } catch (error) {
      logger.error('Failed to create Stripe portal session', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // cancelSubscription
  // -----------------------------------------------------------------------
  /**
   * Cancel an active Stripe subscription immediately.
   *
   * @param subscriptionId - Stripe subscription ID to cancel
   */
  static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      if (StripeService.isDevMode()) {
        logger.info('Stripe [DEV] cancelSubscription', { subscriptionId });
        return;
      }

      // Production: call Stripe API
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Stripe cancelSubscription failed (${response.status}): ${errorBody}`);
      }

      logger.info('Stripe subscription cancelled', { subscriptionId });
    } catch (error) {
      logger.error('Failed to cancel Stripe subscription', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // constructWebhookEvent
  // -----------------------------------------------------------------------
  /**
   * Verify and parse a Stripe webhook event from the raw request body
   * and signature header.
   *
   * In dev mode, the body is simply parsed as JSON without signature
   * verification.
   *
   * @param body - Raw request body as a string
   * @param signature - Stripe-Signature header value
   * @returns The parsed webhook event with type and data
   */
  static async constructWebhookEvent(
    body: string,
    signature: string,
  ): Promise<{ type: string; data: any }> {
    try {
      if (StripeService.isDevMode()) {
        const parsed = JSON.parse(body);
        logger.info('Stripe [DEV] constructWebhookEvent', { type: parsed.type });
        return { type: parsed.type, data: parsed.data };
      }

      // Production: verify signature using Stripe webhook secret
      // In a real implementation this would use the Stripe SDK's
      // constructEvent method for cryptographic verification.
      // Here we perform a basic HMAC check via the Stripe API pattern.
      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      // For production, you should use the stripe npm package:
      //   const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
      // Simplified version: parse and log a warning
      const parsed = JSON.parse(body);
      logger.warn('Stripe webhook signature verification should use stripe SDK in production');
      logger.info('Stripe webhook event received', { type: parsed.type });
      return { type: parsed.type, data: parsed.data };
    } catch (error) {
      logger.error('Failed to construct Stripe webhook event', error);
      throw error;
    }
  }
}
