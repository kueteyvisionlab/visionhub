import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Scoring weights from PRD
// ---------------------------------------------------------------------------
const WEIGHTS = {
  emailEngagement: 0.30,
  clientHistory: 0.25,
  dealAmount: 0.20,
  dealVelocity: 0.15,
  clientProfile: 0.10,
} as const;

// ---------------------------------------------------------------------------
// Thresholds for deal-amount normalisation (in euros)
// ---------------------------------------------------------------------------
const DEAL_AMOUNT_CAP = 50_000; // amounts >= this cap score 100

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value between 0 and 100. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Days elapsed between two dates. */
function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ---------------------------------------------------------------------------
// ScoringService
// ---------------------------------------------------------------------------

export class ScoringService {
  // -----------------------------------------------------------------------
  // calculateScore
  // -----------------------------------------------------------------------
  /**
   * Compute the lead score for a single deal.
   *
   * Formula (each sub-score is normalised 0-100, then weighted):
   *   Score = (
   *     EmailEngagement × 30% +
   *     ClientHistory   × 25% +
   *     DealAmount      × 20% +
   *     DealVelocity    × 15% +
   *     ClientProfile   × 10%
   *   )
   *
   * Returns the final score (0-100) and a breakdown of each factor.
   */
  static async calculateScore(
    dealId: string,
    tenantId: string,
  ): Promise<{ score: number; breakdown: Record<string, number> }> {
    try {
      // 1. Fetch the deal ------------------------------------------------
      const { data: deal, error: dealError } = await supabaseAdmin
        .from('deals')
        .select('id, contact_id, amount, created_at, status')
        .eq('id', dealId)
        .eq('tenant_id', tenantId)
        .single();

      if (dealError || !deal) {
        throw new Error(`Deal not found: ${dealId} (${dealError?.message})`);
      }

      const contactId: string = deal.contact_id;

      // 2. Email engagement (opened + clicked events) --------------------
      const { count: openedCount } = await supabaseAdmin
        .from('email_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .eq('event_type', 'opened');

      const { count: clickedCount } = await supabaseAdmin
        .from('email_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .eq('event_type', 'clicked');

      const totalEngagements = (openedCount ?? 0) + (clickedCount ?? 0);
      // Normalise: 0 events → 0, 10+ events → 100
      const emailEngagementScore = clamp((totalEngagements / 10) * 100);

      // 3. Client history (lifetime revenue from paid orders) ------------
      const { data: revenueRows } = await supabaseAdmin
        .from('orders')
        .select('total')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .eq('status', 'paid');

      const lifetimeRevenue = (revenueRows ?? []).reduce(
        (sum, row) => sum + Number(row.total ?? 0),
        0,
      );
      // Normalise: 0 → 0, 10 000+ € → 100
      const clientHistoryScore = clamp((lifetimeRevenue / 10_000) * 100);

      // 4. Deal amount ---------------------------------------------------
      const amount = Number(deal.amount ?? 0);
      const dealAmountScore = clamp((amount / DEAL_AMOUNT_CAP) * 100);

      // 5. Deal velocity (how recently the deal was created) -------------
      const dealAgeInDays = daysBetween(new Date(deal.created_at), new Date());
      // Newer deals score higher: 0 days → 100, 90+ days → 0
      const dealVelocityScore = clamp(100 - (dealAgeInDays / 90) * 100);

      // 6. Client profile (VIP / B2B tags) ------------------------------
      const { data: tagRows } = await supabaseAdmin
        .from('contact_tags')
        .select('tag_id, tags!inner(name)')
        .eq('contact_id', contactId);

      const tagNames: string[] = (tagRows ?? []).map((row: any) => {
        const tag = row.tags as any;
        return (typeof tag === 'object' ? tag.name : '').toLowerCase();
      });

      let profileScore = 0;
      if (tagNames.some((t) => t.includes('vip'))) profileScore += 60;
      if (tagNames.some((t) => t.includes('b2b') || t.includes('entreprise'))) profileScore += 40;
      const clientProfileScore = clamp(profileScore);

      // 7. Weighted total ------------------------------------------------
      const score = clamp(
        emailEngagementScore * WEIGHTS.emailEngagement +
          clientHistoryScore * WEIGHTS.clientHistory +
          dealAmountScore * WEIGHTS.dealAmount +
          dealVelocityScore * WEIGHTS.dealVelocity +
          clientProfileScore * WEIGHTS.clientProfile,
      );

      const breakdown = {
        emailEngagement: emailEngagementScore,
        clientHistory: clientHistoryScore,
        dealAmount: dealAmountScore,
        dealVelocity: dealVelocityScore,
        clientProfile: clientProfileScore,
      };

      logger.debug('Score calculated', { dealId, score, breakdown });

      return { score, breakdown };
    } catch (error) {
      logger.error('Failed to calculate score', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // recalculateAllScores
  // -----------------------------------------------------------------------
  /**
   * Recalculate lead scores for every open deal belonging to a tenant.
   * Updates the `lead_score` and `score_breakdown` columns in the deals table.
   *
   * @returns The number of deals updated.
   */
  static async recalculateAllScores(tenantId: string): Promise<number> {
    try {
      const { data: openDeals, error } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      if (error) {
        throw new Error(`Failed to fetch open deals: ${error.message}`);
      }

      if (!openDeals || openDeals.length === 0) {
        logger.info('No open deals to recalculate', { tenantId });
        return 0;
      }

      let updatedCount = 0;

      for (const deal of openDeals) {
        try {
          const { score, breakdown } = await ScoringService.calculateScore(
            deal.id,
            tenantId,
          );

          const { error: updateError } = await supabaseAdmin
            .from('deals')
            .update({
              lead_score: score,
              score_breakdown: breakdown,
            })
            .eq('id', deal.id)
            .eq('tenant_id', tenantId);

          if (updateError) {
            logger.warn('Failed to update deal score', {
              dealId: deal.id,
              error: updateError.message,
            });
            continue;
          }

          updatedCount++;
        } catch (innerError) {
          logger.warn('Skipping deal due to scoring error', {
            dealId: deal.id,
            error: innerError,
          });
        }
      }

      logger.info('Recalculated all scores', { tenantId, updatedCount });
      return updatedCount;
    } catch (error) {
      logger.error('Failed to recalculate all scores', error);
      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // getScoreLabel
  // -----------------------------------------------------------------------
  /**
   * Convert a numeric score into a human-readable temperature label.
   *
   *   80-100 → hot
   *   50-79  → warm
   *    0-49  → cold
   */
  static getScoreLabel(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 80) return 'hot';
    if (score >= 50) return 'warm';
    return 'cold';
  }
}
