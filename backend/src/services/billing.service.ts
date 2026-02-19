import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Plan limits
// ---------------------------------------------------------------------------

type PlanName = 'free' | 'starter' | 'pro' | 'enterprise';

interface PlanLimits {
  emails: number;
  sms: number;
  api_calls: number;
  ai_credits: number;
}

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free:       { emails: 100,    sms: 50,    api_calls: 1_000,  ai_credits: 50 },
  starter:    { emails: 1_000,  sms: 500,   api_calls: 5_000,  ai_credits: 500 },
  pro:        { emails: 10_000, sms: 2_000, api_calls: 50_000, ai_credits: 5_000 },
  enterprise: { emails: Infinity, sms: Infinity, api_calls: Infinity, ai_credits: Infinity },
};

// ---------------------------------------------------------------------------
// Stripe price IDs (would come from env / config in production)
// ---------------------------------------------------------------------------
const STRIPE_PRICE_IDS: Record<'starter' | 'pro' | 'enterprise', string> = {
  starter: 'price_starter_placeholder',
  pro: 'price_pro_placeholder',
  enterprise: 'price_enterprise_placeholder',
};

// ---------------------------------------------------------------------------
// BillingService
// ---------------------------------------------------------------------------

export class BillingService {
  // -----------------------------------------------------------------------
  // createCheckoutSession
  // -----------------------------------------------------------------------
  /**
   * Create a Stripe Checkout Session for the given plan.
   *
   * In development mode a mock URL is returned so the rest of the
   * application can be tested end-to-end without a live Stripe account.
   */
  static async createCheckoutSession(
    tenantId: string,
    plan: 'starter' | 'pro' | 'enterprise',
  ): Promise<{ url: string }> {
    try {
      const isDev = process.env.NODE_ENV !== 'production';

      if (isDev) {
        const mockUrl = `http://localhost:3000/billing/mock-checkout?tenant=${tenantId}&plan=${plan}`;
        logger.info('Mock checkout session created (dev mode)', {
          tenantId,
          plan,
          url: mockUrl,
        });
        return { url: mockUrl };
      }

      // --- Production: create a real Stripe Checkout Session ----------

      // Lazy-import Stripe to avoid issues when the key is not configured
      let stripe: any;
      try {
        const Stripe = (await import('stripe' as string)).default;
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-12-18.acacia' as any,
        });
      } catch {
        throw new Error('Stripe SDK not installed. Run: npm install stripe');
      }

      // Ensure the tenant has a Stripe customer ID
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id, stripe_customer_id, name, slug')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Tenant not found: ${tenantId} (${tenantError?.message})`);
      }

      let customerId = tenant.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: tenant.name,
          metadata: { tenant_id: tenantId, slug: tenant.slug },
        });
        customerId = customer.id;

        await supabaseAdmin
          .from('tenants')
          .update({ stripe_customer_id: customerId })
          .eq('id', tenantId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
        success_url: `${process.env.CORS_ORIGINS}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CORS_ORIGINS}/billing/cancel`,
        metadata: { tenant_id: tenantId, plan },
      });

      logger.info('Stripe checkout session created', {
        tenantId,
        plan,
        sessionId: session.id,
      });

      return { url: session.url! };
    } catch (error) {
      logger.error('Failed to create checkout session', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // handleWebhook
  // -----------------------------------------------------------------------
  /**
   * Process a Stripe webhook event.
   *
   * Supported event types:
   * - `checkout.session.completed` — upgrade the tenant plan
   * - `invoice.paid` — log successful payment
   * - `customer.subscription.deleted` — downgrade tenant to free
   */
  static async handleWebhook(event: { type: string; data: any }): Promise<void> {
    try {
      logger.info('Processing Stripe webhook event', { type: event.type });

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object ?? event.data;
          const tenantId: string | undefined = session.metadata?.tenant_id;
          const plan: string | undefined = session.metadata?.plan;

          if (!tenantId || !plan) {
            logger.warn('Checkout session missing metadata', { session });
            return;
          }

          const { error } = await supabaseAdmin
            .from('tenants')
            .update({
              plan,
              stripe_subscription_id: session.subscription ?? null,
            })
            .eq('id', tenantId);

          if (error) {
            throw new Error(`Failed to update tenant plan: ${error.message}`);
          }

          logger.info('Tenant plan upgraded', { tenantId, plan });
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object ?? event.data;
          logger.info('Invoice paid', {
            customerId: invoice.customer,
            amountPaid: invoice.amount_paid,
            invoiceId: invoice.id,
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object ?? event.data;
          const customerId: string | undefined = subscription.customer;

          if (!customerId) {
            logger.warn('Subscription deleted event missing customer', { subscription });
            return;
          }

          // Find tenant by Stripe customer ID
          const { data: tenant, error: tenantLookupError } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (tenantLookupError || !tenant) {
            logger.warn('Tenant not found for Stripe customer', {
              customerId,
              error: tenantLookupError?.message,
            });
            return;
          }

          const { error } = await supabaseAdmin
            .from('tenants')
            .update({
              plan: 'free',
              stripe_subscription_id: null,
            })
            .eq('id', tenant.id);

          if (error) {
            throw new Error(`Failed to downgrade tenant: ${error.message}`);
          }

          logger.info('Tenant downgraded to free', { tenantId: tenant.id });
          break;
        }

        default:
          logger.debug('Unhandled Stripe webhook event type', { type: event.type });
      }
    } catch (error) {
      logger.error('Failed to handle Stripe webhook', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // getUsage
  // -----------------------------------------------------------------------
  /**
   * Aggregate the tenant's usage for the current calendar month by module.
   */
  static async getUsage(
    tenantId: string,
  ): Promise<{
    emails_sent: number;
    sms_sent: number;
    api_calls: number;
    ai_credits: number;
  }> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const { data: logs, error } = await supabaseAdmin
        .from('usage_logs')
        .select('module, quantity')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd);

      if (error) {
        throw new Error(`Failed to fetch usage logs: ${error.message}`);
      }

      const usage = {
        emails_sent: 0,
        sms_sent: 0,
        api_calls: 0,
        ai_credits: 0,
      };

      for (const log of logs ?? []) {
        const qty = Number(log.quantity ?? 0);
        switch (log.module) {
          case 'emails':
            usage.emails_sent += qty;
            break;
          case 'sms':
            usage.sms_sent += qty;
            break;
          case 'api_calls':
            usage.api_calls += qty;
            break;
          case 'ai_credits':
            usage.ai_credits += qty;
            break;
          default:
            // Unknown module — ignore
            break;
        }
      }

      logger.debug('Usage retrieved', { tenantId, usage });
      return usage;
    } catch (error) {
      logger.error('Failed to get usage', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // checkLimits
  // -----------------------------------------------------------------------
  /**
   * Verify whether a tenant is within the plan limits for a given module.
   *
   * @param module - One of: emails, sms, api_calls, ai_credits
   * @returns `allowed` is true when current usage < limit.
   */
  static async checkLimits(
    tenantId: string,
    module: string,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    try {
      // Determine tenant plan
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('plan')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error(`Tenant not found: ${tenantId} (${tenantError?.message})`);
      }

      const plan = (tenant.plan as PlanName) ?? 'free';
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

      const moduleKey = module as keyof PlanLimits;
      const limit = limits[moduleKey] ?? 0;

      // Current month usage for this specific module
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const { data: logs, error: usageError } = await supabaseAdmin
        .from('usage_logs')
        .select('quantity')
        .eq('tenant_id', tenantId)
        .eq('module', module)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd);

      if (usageError) {
        throw new Error(`Failed to fetch usage: ${usageError.message}`);
      }

      const current = (logs ?? []).reduce(
        (sum, row) => sum + Number(row.quantity ?? 0),
        0,
      );

      const allowed = current < limit;

      logger.debug('Limit check performed', {
        tenantId,
        module,
        plan,
        current,
        limit: limit === Infinity ? 'unlimited' : limit,
        allowed,
      });

      return {
        allowed,
        current,
        limit: limit === Infinity ? -1 : limit, // -1 signals unlimited to the caller
      };
    } catch (error) {
      logger.error('Failed to check limits', error);
      throw error;
    }
  }
}
