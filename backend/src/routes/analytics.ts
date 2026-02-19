import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const saveReportSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  config: z.record(z.unknown()),
});

const exportSchema = z.object({
  type: z.enum(['contacts', 'orders', 'deals']),
  format: z.enum(['csv', 'json']),
  filters: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// GET /summary - Dashboard KPIs
// ---------------------------------------------------------------------------
router.get('/summary', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // Run queries in parallel
    const [
      contactsResult,
      paidOrdersResult,
      dealsOpenResult,
      dealsWonThisMonthResult,
      allDealsResult,
    ] = await Promise.all([
      // Total contacts
      supabaseAdmin
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Paid orders for total revenue
      supabaseAdmin
        .from('orders')
        .select('total')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid'),

      // Open deals count
      supabaseAdmin
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'open'),

      // Deals won this month
      supabaseAdmin
        .from('deals')
        .select('id, value')
        .eq('tenant_id', tenantId)
        .eq('status', 'won')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd),

      // All deals for conversion rate
      supabaseAdmin
        .from('deals')
        .select('id, status, value')
        .eq('tenant_id', tenantId),
    ]);

    const totalContacts = contactsResult.count || 0;

    const totalRevenue = (paidOrdersResult.data || []).reduce(
      (sum: number, o: any) => sum + (o.total || 0),
      0,
    );

    const dealsOpen = dealsOpenResult.count || 0;

    const wonThisMonth = dealsWonThisMonthResult.data || [];
    const dealsWonThisMonth = wonThisMonth.length;

    const allDeals = allDealsResult.data || [];
    const totalDeals = allDeals.length;
    const wonDeals = allDeals.filter((d: any) => d.status === 'won');
    const avgDealValue =
      wonDeals.length > 0
        ? wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / wonDeals.length
        : 0;
    const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

    res.json({
      success: true,
      data: {
        total_contacts: totalContacts,
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        deals_open: dealsOpen,
        deals_won_this_month: dealsWonThisMonth,
        avg_deal_value: parseFloat(avgDealValue.toFixed(2)),
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
      },
    });
  } catch (err) {
    logger.error('Analytics summary error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics summary' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /revenue - Revenue over time
// ---------------------------------------------------------------------------
router.get('/revenue', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const period = (req.query.period as string) || 'monthly';

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('total, paid_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .order('paid_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch revenue data', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue data' },
      });
      return;
    }

    // Group by period
    const grouped = new Map<string, number>();

    for (const order of orders || []) {
      const dateStr = order.paid_at || order.created_at;
      const date = new Date(dateStr);
      let key: string;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly': {
          // ISO week: get Monday of the week
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(date);
          monday.setDate(diff);
          key = monday.toISOString().split('T')[0];
          break;
        }
        case 'monthly':
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      grouped.set(key, (grouped.get(key) || 0) + (order.total || 0));
    }

    const revenueData = Array.from(grouped.entries()).map(([date, revenue]) => ({
      date,
      revenue: parseFloat(revenue.toFixed(2)),
    }));

    res.json({ success: true, data: revenueData });
  } catch (err) {
    logger.error('Revenue analytics error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue analytics' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /pipeline-stats - Pipeline stage statistics
// ---------------------------------------------------------------------------
router.get('/pipeline-stats', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Fetch all pipeline stages for the tenant's pipelines
    const { data: pipelines } = await supabaseAdmin
      .from('pipelines')
      .select('id')
      .eq('tenant_id', tenantId);

    if (!pipelines || pipelines.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const pipelineIds = pipelines.map((p: any) => p.id);

    const { data: stages, error: stagesError } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id, name, position, pipeline_id')
      .in('pipeline_id', pipelineIds)
      .order('position', { ascending: true });

    if (stagesError) {
      logger.error('Failed to fetch pipeline stages', { error: stagesError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pipeline stages' },
      });
      return;
    }

    // Fetch all deals for these pipelines
    const { data: deals, error: dealsError } = await supabaseAdmin
      .from('deals')
      .select('id, stage_id, value, created_at, updated_at')
      .eq('tenant_id', tenantId);

    if (dealsError) {
      logger.error('Failed to fetch deals for pipeline stats', { error: dealsError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch deals' },
      });
      return;
    }

    const dealsByStage = new Map<string, any[]>();
    for (const deal of deals || []) {
      const existing = dealsByStage.get(deal.stage_id) || [];
      existing.push(deal);
      dealsByStage.set(deal.stage_id, existing);
    }

    const now = new Date().getTime();
    const stats = (stages || []).map((stage: any) => {
      const stageDeals = dealsByStage.get(stage.id) || [];
      const totalAmount = stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
      const avgDaysInStage =
        stageDeals.length > 0
          ? stageDeals.reduce((sum: number, d: any) => {
              const entered = new Date(d.updated_at || d.created_at).getTime();
              return sum + (now - entered) / (1000 * 60 * 60 * 24);
            }, 0) / stageDeals.length
          : 0;

      return {
        stage_id: stage.id,
        stage_name: stage.name,
        pipeline_id: stage.pipeline_id,
        position: stage.position,
        deal_count: stageDeals.length,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        avg_days_in_stage: parseFloat(avgDaysInStage.toFixed(1)),
      };
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('Pipeline stats error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pipeline stats' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /reports - List saved reports
// ---------------------------------------------------------------------------
router.get('/reports', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('saved_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list saved reports', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list reports' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List reports error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list reports' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /reports - Save report
// ---------------------------------------------------------------------------
router.post('/reports', validate(saveReportSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { name, type, config } = req.body;

    const { data, error } = await supabaseAdmin
      .from('saved_reports')
      .insert({
        tenant_id: tenantId,
        user_id: authReq.user.id,
        name,
        report_type: type,
        config,
        is_shared: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save report', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save report' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Save report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save report' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /reports/:id - Get saved report
// ---------------------------------------------------------------------------
router.get('/reports/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('saved_reports')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get report error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get report' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /export - Export data as CSV or JSON
// ---------------------------------------------------------------------------
router.post('/export', validate(exportSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { type, format, filters } = req.body;

    let query: any;

    switch (type) {
      case 'contacts':
        query = supabaseAdmin
          .from('contacts')
          .select('*')
          .eq('tenant_id', tenantId);
        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.tag) query = query.contains('tags', [filters.tag]);
        break;

      case 'orders':
        query = supabaseAdmin
          .from('orders')
          .select('*')
          .eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.date_from) query = query.gte('created_at', filters.date_from);
        if (filters?.date_to) query = query.lte('created_at', filters.date_to);
        break;

      case 'deals':
        query = supabaseAdmin
          .from('deals')
          .select('*')
          .eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.pipeline_id) query = query.eq('pipeline_id', filters.pipeline_id);
        break;

      default:
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: `Unsupported export type: ${type}` },
        });
        return;
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to export data', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to export data' },
      });
      return;
    }

    const rows = data || [];

    if (format === 'csv') {
      if (rows.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_export.csv"`);
        res.send('');
        return;
      }

      // Build CSV
      const headers = Object.keys(rows[0]);
      const csvLines: string[] = [headers.join(',')];

      for (const row of rows) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          // Escape double quotes and wrap in quotes if it contains commas, quotes, or newlines
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvLines.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_export.csv"`);
      res.send(csvLines.join('\n'));
    } else {
      // JSON
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    logger.error('Export data error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export data' },
    });
  }
});

export default router;
