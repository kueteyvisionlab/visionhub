import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// ---------------------------------------------------------------------------
// GET /marketplace/integrations — Browse available integrations (public)
// ---------------------------------------------------------------------------
router.get('/integrations', async (req: any, res: Response) => {
  try {
    const { page, limit, offset } = parsePaginationParams(req.query);
    const category = req.query.category as string | undefined;

    let query = supabaseAdmin
      .from('integration_templates')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count ?? 0),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Failed to list integrations' } });
  }
});

// ---------------------------------------------------------------------------
// GET /marketplace/integrations/:slug — Get integration details
// ---------------------------------------------------------------------------
router.get('/integrations/:slug', async (req: any, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('integration_templates')
      .select('*')
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Failed to get integration' } });
  }
});

// ---------------------------------------------------------------------------
// POST /marketplace/install — Install integration for tenant
// ---------------------------------------------------------------------------
const installSchema = z.object({
  template_slug: z.string().min(1),
  config: z.record(z.unknown()).optional().default({}),
});

router.post(
  '/install',
  authenticate,
  validate(installSchema),
  async (req: any, res: Response) => {
    try {
      const tenantId = req.tenant!.id;
      const { template_slug, config } = req.body;

      // Find integration template
      const { data: template, error: tplError } = await supabaseAdmin
        .from('integration_templates')
        .select('id, slug, name, config_schema')
        .eq('slug', template_slug)
        .eq('is_active', true)
        .single();

      if (tplError || !template) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration template not found' } });
      }

      // Check if already installed
      const { data: existing } = await supabaseAdmin
        .from('tenant_integrations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('template_id', template.id)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Integration already installed' } });
      }

      // Install
      const { data, error } = await supabaseAdmin
        .from('tenant_integrations')
        .insert({
          tenant_id: tenantId,
          template_id: template.id,
          config_encrypted: JSON.stringify(config),
          is_active: true,
          installed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log usage
      await supabaseAdmin.from('usage_logs').insert({
        tenant_id: tenantId,
        module: 'marketplace',
        action: 'integration.installed',
        metadata: { template_slug: template.slug, template_name: template.name },
      });

      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Failed to install integration' } });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /marketplace/installed — List installed integrations for tenant
// ---------------------------------------------------------------------------
router.get('/installed', authenticate, async (req: any, res: Response) => {
  try {
    const tenantId = req.tenant!.id;

    const { data, error } = await supabaseAdmin
      .from('tenant_integrations')
      .select(`
        id,
        is_active,
        installed_at,
        template:integration_templates (
          slug,
          name,
          description,
          category,
          logo_url
        )
      `)
      .eq('tenant_id', tenantId)
      .order('installed_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Failed to list installed integrations' } });
  }
});

// ---------------------------------------------------------------------------
// PATCH /marketplace/installed/:id — Enable/disable installed integration
// ---------------------------------------------------------------------------
const toggleSchema = z.object({
  is_active: z.boolean(),
});

router.patch(
  '/installed/:id',
  authenticate,
  validate(toggleSchema),
  async (req: any, res: Response) => {
    try {
      const tenantId = req.tenant!.id;

      const { data, error } = await supabaseAdmin
        .from('tenant_integrations')
        .update({ is_active: req.body.is_active })
        .eq('id', req.params.id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });
      }

      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Failed to update integration' } });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /marketplace/installed/:id — Uninstall integration
// ---------------------------------------------------------------------------
router.delete('/installed/:id', authenticate, async (req: any, res: Response) => {
  try {
    const tenantId = req.tenant!.id;

    const { error } = await supabaseAdmin
      .from('tenant_integrations')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    res.json({ success: true, data: { message: 'Integration uninstalled' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Failed to uninstall integration' } });
  }
});

export default router;
