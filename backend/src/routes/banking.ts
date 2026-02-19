import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';
import { randomUUID } from 'crypto';

const router = Router();

router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const initConnectionSchema = z.object({
  bank_name: z.string().min(1).max(255),
});

const reconcileSchema = z.object({
  order_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// POST /connect/init - Init bank connection (placeholder Bridge API)
// ---------------------------------------------------------------------------
router.post('/connect/init', validate(initConnectionSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { bank_name } = req.body;

    // Placeholder: in production this would call Bridge API to initiate OAuth
    const providerConnectionId = randomUUID();

    const { data, error } = await supabaseAdmin
      .from('bank_connections')
      .insert({
        tenant_id: tenantId,
        provider: 'bridge',
        provider_connection_id: providerConnectionId,
        bank_name,
        status: 'active',
        metadata: { initiated_by: authReq.user.id },
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to init bank connection', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to init bank connection' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Init bank connection error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to init bank connection' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /connections - List bank connections for tenant
// ---------------------------------------------------------------------------
router.get('/connections', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('bank_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list bank connections', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list bank connections' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List bank connections error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list bank connections' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /connections/:id - Soft delete (set status to 'expired')
// ---------------------------------------------------------------------------
router.delete('/connections/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('bank_connections')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bank connection not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Bank connection expired', id } });
  } catch (err) {
    logger.error('Delete bank connection error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete bank connection' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /transactions - List bank transactions with filters & pagination
// ---------------------------------------------------------------------------
router.get('/transactions', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const connectionId = req.query.connection_id as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;
    const isReconciled = req.query.is_reconciled as string | undefined;
    const minAmount = req.query.min_amount as string | undefined;
    const maxAmount = req.query.max_amount as string | undefined;

    let query = supabaseAdmin
      .from('bank_transactions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (connectionId) query = query.eq('bank_connection_id', connectionId);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (isReconciled !== undefined) query = query.eq('is_reconciled', isReconciled === 'true');
    if (minAmount) query = query.gte('amount', parseFloat(minAmount));
    if (maxAmount) query = query.lte('amount', parseFloat(maxAmount));

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list bank transactions', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list bank transactions' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List bank transactions error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list bank transactions' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /transactions/:id/reconcile - Reconcile transaction with order
// ---------------------------------------------------------------------------
router.post('/transactions/:id/reconcile', validate(reconcileSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { order_id } = req.body;

    // Verify the order belongs to the tenant
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('id', order_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!order) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found in this tenant' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('bank_transactions')
      .update({
        is_reconciled: true,
        reconciled_order_id: order_id,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bank transaction not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Reconcile transaction error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reconcile transaction' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /reconciliation/suggestions - Auto-match unreconciled transactions
// ---------------------------------------------------------------------------
router.get('/reconciliation/suggestions', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Fetch unreconciled transactions
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('bank_transactions')
      .select('id, amount, date, description')
      .eq('tenant_id', tenantId)
      .eq('is_reconciled', false)
      .order('date', { ascending: false })
      .limit(200);

    if (txError) {
      logger.error('Failed to fetch unreconciled transactions', { error: txError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transactions' },
      });
      return;
    }

    // Fetch paid orders that are not yet reconciled
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, total, contact_id, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(200);

    if (orderError) {
      logger.error('Failed to fetch orders for reconciliation', { error: orderError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch orders' },
      });
      return;
    }

    // Find already-reconciled order IDs to exclude them
    const { data: reconciledTx } = await supabaseAdmin
      .from('bank_transactions')
      .select('reconciled_order_id')
      .eq('tenant_id', tenantId)
      .eq('is_reconciled', true)
      .not('reconciled_order_id', 'is', null);

    const reconciledOrderIds = new Set(
      (reconciledTx || []).map((t: any) => t.reconciled_order_id),
    );

    const availableOrders = (orders || []).filter(
      (o: any) => !reconciledOrderIds.has(o.id),
    );

    // Match transactions and orders with amounts within 0.01 tolerance
    const TOLERANCE = 0.01;
    const suggestions: Array<{ transaction: any; order: any; amount_diff: number }> = [];

    for (const tx of transactions || []) {
      const absAmount = Math.abs(tx.amount);
      for (const order of availableOrders) {
        const diff = Math.abs(absAmount - order.total);
        if (diff <= TOLERANCE) {
          suggestions.push({
            transaction: tx,
            order,
            amount_diff: parseFloat(diff.toFixed(2)),
          });
        }
      }
    }

    res.json({ success: true, data: suggestions });
  } catch (err) {
    logger.error('Reconciliation suggestions error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate reconciliation suggestions' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /treasury - Treasury overview
// ---------------------------------------------------------------------------
router.get('/treasury', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // All transactions for balance
    const { data: allTx, error: allTxError } = await supabaseAdmin
      .from('bank_transactions')
      .select('amount, is_reconciled, date')
      .eq('tenant_id', tenantId);

    if (allTxError) {
      logger.error('Failed to fetch treasury data', { error: allTxError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch treasury data' },
      });
      return;
    }

    const transactions = allTx || [];

    const totalBalance = transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0);

    const thisMonthTx = transactions.filter(
      (tx: any) => tx.date >= monthStart && tx.date <= monthEnd,
    );

    const incomeThisMonth = thisMonthTx
      .filter((tx: any) => tx.amount > 0)
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    const expensesThisMonth = thisMonthTx
      .filter((tx: any) => tx.amount < 0)
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);

    const unreconciledCount = transactions.filter((tx: any) => !tx.is_reconciled).length;

    res.json({
      success: true,
      data: {
        total_balance: parseFloat(totalBalance.toFixed(2)),
        income_this_month: parseFloat(incomeThisMonth.toFixed(2)),
        expenses_this_month: parseFloat(expensesThisMonth.toFixed(2)),
        unreconciled_count: unreconciledCount,
      },
    });
  } catch (err) {
    logger.error('Treasury overview error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch treasury overview' },
    });
  }
});

export default router;
