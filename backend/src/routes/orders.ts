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

const orderItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  tax_rate: z.number().min(0).max(100).default(20),
  inventory_item_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

const createOrderSchema = z.object({
  contact_id: z.string().uuid(),
  entity_id: z.string().uuid().nullable().optional(),
  type: z.enum(['quote', 'invoice']),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  discount_amount: z.number().min(0).default(0),
  tax_rate: z.number().min(0).max(100).default(20),
});

const updateOrderSchema = z.object({
  contact_id: z.string().uuid().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  type: z.enum(['quote', 'invoice']).optional(),
  items: z.array(orderItemSchema).min(1).optional(),
  notes: z.string().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  discount_amount: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'paid', 'cancelled']).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateOrderTotals(items: z.infer<typeof orderItemSchema>[], taxRate: number, discountAmount: number) {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price;
  }, 0);

  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = subtotal - discountAmount + taxAmount;

  const computedItems = items.map((item) => ({
    ...item,
    total: item.quantity * item.unit_price,
  }));

  return { subtotal, taxAmount, total, computedItems };
}

async function generateOrderNumber(tenantId: string, type: string): Promise<string> {
  const prefix = type === 'quote' ? 'DEV' : 'FAC';
  const year = new Date().getFullYear();

  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .gte('created_at', `${year}-01-01`);

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `${prefix}-${year}-${sequence}`;
}

// ---------------------------------------------------------------------------
// GET / - List orders with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const contactId = req.query.contact_id as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;
    const search = req.query.search as string | undefined;

    let query = supabaseAdmin
      .from('orders')
      .select('*, contact:contacts(id, first_name, last_name, company_name)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (contactId) query = query.eq('contact_id', contactId);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);
    if (search) query = query.ilike('order_number', `%${search}%`);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list orders', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list orders' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List orders error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list orders' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create order with items
// ---------------------------------------------------------------------------
router.post('/', validate(createOrderSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { items, contact_id, entity_id, type, notes, valid_until, discount_amount, tax_rate } = req.body;

    // Verify contact belongs to tenant
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!contact) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Contact not found in this tenant' },
      });
      return;
    }

    const orderNumber = await generateOrderNumber(tenantId, type);
    const { subtotal, taxAmount, total, computedItems } = calculateOrderTotals(items, tax_rate, discount_amount);

    // Insert order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: tenantId,
        contact_id,
        entity_id: entity_id || null,
        order_number: orderNumber,
        type,
        status: 'draft',
        subtotal,
        tax_rate,
        tax_amount: taxAmount,
        total,
        discount_amount,
        notes: notes || null,
        valid_until: valid_until || null,
      })
      .select()
      .single();

    if (orderError || !order) {
      logger.error('Failed to create order', { error: orderError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create order' },
      });
      return;
    }

    // Insert order items
    const orderItems = computedItems.map((item) => ({
      order_id: order.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      total: item.total,
      inventory_item_id: item.inventory_item_id || null,
      metadata: item.metadata || null,
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      logger.error('Failed to create order items', { error: itemsError.message });
      // Clean up the order
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create order items' },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: { ...order, items: insertedItems },
    });
  } catch (err) {
    logger.error('Create order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create order' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get order with items
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, contact:contacts(id, first_name, last_name, email, company_name, address, phone)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !order) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
      return;
    }

    // Get order items
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('id', { ascending: true });

    res.json({
      success: true,
      data: { ...order, items: items || [] },
    });
  } catch (err) {
    logger.error('Get order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get order' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update order
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateOrderSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { items, ...updateData } = req.body;

    // If items are provided, recalculate totals
    if (items) {
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('tax_rate, discount_amount')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
        return;
      }

      const taxRate = updateData.tax_rate ?? existing.tax_rate;
      const discountAmount = updateData.discount_amount ?? existing.discount_amount;
      const { subtotal, taxAmount, total, computedItems } = calculateOrderTotals(items, taxRate, discountAmount);

      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total = total;

      // Replace items: delete old, insert new
      await supabaseAdmin.from('order_items').delete().eq('order_id', id);

      const orderItems = computedItems.map((item) => ({
        order_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        total: item.total,
        inventory_item_id: item.inventory_item_id || null,
        metadata: item.metadata || null,
      }));

      await supabaseAdmin.from('order_items').insert(orderItems);
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
      return;
    }

    // Fetch updated items
    const { data: updatedItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    res.json({ success: true, data: { ...data, items: updatedItems || [] } });
  } catch (err) {
    logger.error('Update order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update order' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/send - Send order to client
// ---------------------------------------------------------------------------
router.post('/:id/send', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', 'draft')
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found or not in draft status' },
      });
      return;
    }

    // TODO: Send email notification to client via Brevo

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Send order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send order' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/accept - Client accepts quote
// ---------------------------------------------------------------------------
router.post('/:id/accept', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['sent'])
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found or not in sent status' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Accept order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to accept order' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/reject - Client rejects quote
// ---------------------------------------------------------------------------
router.post('/:id/reject', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['sent'])
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found or not in sent status' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Reject order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reject order' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/pay - Mark as paid / initiate Stripe payment
// ---------------------------------------------------------------------------
router.post('/:id/pay', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { payment_method } = req.body || {};

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'accepted'])
      .single();

    if (!order) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Order not found or not in payable status' },
      });
      return;
    }

    // If Stripe payment is requested, create a payment intent
    if (payment_method === 'stripe') {
      // TODO: Integrate with Stripe
      // const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
      // const paymentIntent = await stripe.paymentIntents.create({...});
      res.json({
        success: true,
        data: {
          message: 'Stripe payment initiation placeholder',
          order_id: id,
          // client_secret: paymentIntent.client_secret
        },
      });
      return;
    }

    // Mark as paid directly (manual payment)
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark order as paid' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Pay order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process payment' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/duplicate - Duplicate order
// ---------------------------------------------------------------------------
router.post('/:id/duplicate', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Get original order
    const { data: original, error: origError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (origError || !original) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
      return;
    }

    // Get original items
    const { data: originalItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    const newOrderNumber = await generateOrderNumber(tenantId, original.type);

    // Create duplicate order
    const { id: _id, created_at, updated_at, order_number, paid_at, stripe_payment_intent_id, ...orderData } = original;

    const { data: newOrder, error: newError } = await supabaseAdmin
      .from('orders')
      .insert({
        ...orderData,
        order_number: newOrderNumber,
        status: 'draft',
        paid_at: null,
        stripe_payment_intent_id: null,
      })
      .select()
      .single();

    if (newError || !newOrder) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate order' },
      });
      return;
    }

    // Duplicate items
    if (originalItems && originalItems.length > 0) {
      const newItems = originalItems.map(({ id: _itemId, order_id, ...itemData }) => ({
        ...itemData,
        order_id: newOrder.id,
      }));

      await supabaseAdmin.from('order_items').insert(newItems);
    }

    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', newOrder.id);

    res.status(201).json({
      success: true,
      data: { ...newOrder, items: items || [] },
    });
  } catch (err) {
    logger.error('Duplicate order error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate order' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id/pdf - Generate PDF (placeholder)
// ---------------------------------------------------------------------------
router.get('/:id/pdf', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, contact:contacts(id, first_name, last_name, email, company_name, address)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!order) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
      return;
    }

    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    // TODO: Generate actual PDF using puppeteer, pdfkit, or similar
    res.json({
      success: true,
      data: {
        message: 'PDF generation placeholder',
        order: { ...order, items: items || [] },
      },
    });
  } catch (err) {
    logger.error('Generate PDF error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate PDF' },
    });
  }
});

export default router;
