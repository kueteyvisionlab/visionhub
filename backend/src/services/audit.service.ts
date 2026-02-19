import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * Filters accepted by `AuditService.getLogs`.
 */
export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  from?: string; // ISO 8601 date string
  to?: string;   // ISO 8601 date string
  page?: number;
  limit?: number;
}

/**
 * Shape returned by `AuditService.getActivitySummary`.
 */
export interface ActivitySummary {
  total_actions: number;
  by_user: { user_id: string; count: number }[];
  by_resource: { resource_type: string; count: number }[];
  recent: any[];
}

/**
 * Service layer for querying the `audit_logs` table.
 *
 * All methods are tenant-scoped — the `tenantId` parameter is mandatory so
 * data never leaks across organisations.
 */
export class AuditService {
  // -------------------------------------------------------------------------
  // getLogs — paginated, filtered list
  // -------------------------------------------------------------------------

  /**
   * Get audit logs for a tenant with optional filters and pagination.
   *
   * @returns `{ data, total }` where `total` is the unfiltered count for
   *   the current filter set (useful for building pagination UI).
   */
  static async getLogs(
    tenantId: string,
    filters: AuditLogFilters = {},
  ): Promise<{ data: any[]; total: number }> {
    try {
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const limit =
        filters.limit && filters.limit > 0
          ? Math.min(filters.limit, 100)
          : 20;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Optional equality filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }
      if (filters.resource_type) {
        query = query.eq('entity_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('entity_id', filters.resource_id);
      }

      // Date range filters
      if (filters.from) {
        query = query.gte('created_at', filters.from);
      }
      if (filters.to) {
        query = query.lte('created_at', filters.to);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('AuditService.getLogs query failed', {
          tenantId,
          error: error.message,
        });
        throw new Error('Failed to fetch audit logs');
      }

      return {
        data: data || [],
        total: count || 0,
      };
    } catch (err) {
      logger.error('AuditService.getLogs error', err);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // getActivitySummary — last-24h dashboard widget data
  // -------------------------------------------------------------------------

  /**
   * Get an activity summary for a tenant covering the last 24 hours.
   *
   * Returns:
   * - `total_actions` — total audit rows in the window
   * - `by_user` — action count grouped by user_id
   * - `by_resource` — action count grouped by entity_type (resource_type)
   * - `recent` — the 10 most recent actions
   */
  static async getActivitySummary(
    tenantId: string,
  ): Promise<ActivitySummary> {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch all audit logs from the last 24h for this tenant.
      // For large-scale deployments a dedicated RPC / materialized view
      // would be preferable, but for MVP this is fine.
      const { data: logs, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('AuditService.getActivitySummary query failed', {
          tenantId,
          error: error.message,
        });
        throw new Error('Failed to fetch activity summary');
      }

      const allLogs = logs || [];

      // Total actions
      const total_actions = allLogs.length;

      // Group by user_id
      const userCounts = new Map<string, number>();
      for (const log of allLogs) {
        const uid = log.user_id || 'system';
        userCounts.set(uid, (userCounts.get(uid) || 0) + 1);
      }
      const by_user = Array.from(userCounts.entries())
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count);

      // Group by entity_type (resource_type)
      const resourceCounts = new Map<string, number>();
      for (const log of allLogs) {
        const rt = log.entity_type || 'unknown';
        resourceCounts.set(rt, (resourceCounts.get(rt) || 0) + 1);
      }
      const by_resource = Array.from(resourceCounts.entries())
        .map(([resource_type, count]) => ({ resource_type, count }))
        .sort((a, b) => b.count - a.count);

      // Last 10 actions (already ordered DESC)
      const recent = allLogs.slice(0, 10);

      return { total_actions, by_user, by_resource, recent };
    } catch (err) {
      logger.error('AuditService.getActivitySummary error', err);
      throw err;
    }
  }
}
