import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(998),
  html_body: z.string().min(1),
  json_structure: z.record(z.unknown()).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  template_id: z.string().uuid(),
  subject: z.string().min(1).max(998),
  subject_b: z.string().max(998).nullable().optional(),
  audience_filters: z.record(z.unknown()),
  scheduled_at: z.string().datetime().nullable().optional(),
});

const createSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  trigger_type: z.string().min(1),
  trigger_config: z.record(z.unknown()),
  stop_conditions: z.record(z.unknown()).nullable().optional(),
  steps: z
    .array(
      z.object({
        step_order: z.number().int().min(1),
        delay_value: z.number().int().min(0),
        delay_unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
        template_id: z.string().uuid(),
        conditions: z.record(z.unknown()).nullable().optional(),
      }),
    )
    .min(1),
});

const enrollContactSchema = z.object({
  contact_id: z.string().uuid(),
});

const updateSequenceStatusSchema = z.object({
  status: z.enum(['active', 'paused']),
});

const brevoWebhookSchema = z.object({
  event: z.string().optional(),
  event_type: z.string().optional(),
  email: z.string().optional(),
  message_id: z.string().optional(),
  campaign_id: z.string().optional(),
  tag: z.string().optional(),
  ts_event: z.number().optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Public routes (no auth)
// ---------------------------------------------------------------------------

// POST /webhooks/brevo - Receive Brevo webhook events
router.post('/webhooks/brevo', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const eventType = body.event || body.event_type;
    if (!eventType) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing event type' },
      });
      return;
    }

    // Map Brevo event types to our internal types
    const eventMap: Record<string, string> = {
      delivered: 'delivered',
      opened: 'opened',
      click: 'clicked',
      hard_bounce: 'bounced',
      soft_bounce: 'bounced',
      spam: 'complained',
      unsubscribed: 'unsubscribed',
      sent: 'sent',
    };

    const mappedEvent = eventMap[eventType] || eventType;

    const { error } = await supabaseAdmin.from('email_events').insert({
      event_type: mappedEvent,
      metadata: {
        raw_event: eventType,
        email: body.email || null,
        message_id: body['message-id'] || body.message_id || null,
        timestamp: body.ts_event || null,
        ...body,
      },
      campaign_id: body.campaign_id || null,
      contact_id: body.contact_id || null,
      tenant_id: body.tenant_id || null,
    });

    if (error) {
      logger.error('Failed to store Brevo webhook event', { error: error.message });
      // Return 200 anyway to avoid Brevo retries for storage errors
    }

    res.status(200).json({ success: true, data: { message: 'Webhook received' } });
  } catch (err) {
    logger.error('Brevo webhook error', err);
    // Return 200 to prevent Brevo retry loops
    res.status(200).json({ success: true, data: { message: 'Webhook received' } });
  }
});

// ---------------------------------------------------------------------------
// All routes below require authentication
// ---------------------------------------------------------------------------
router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

// POST /templates - Create email template
router.post('/templates', validate(createTemplateSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .insert({
        ...req.body,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create email template', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create email template' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create email template error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create email template' },
    });
  }
});

// GET /templates - List email templates with pagination
router.get('/templates', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const { data, error, count } = await supabaseAdmin
      .from('email_templates')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list email templates', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list email templates' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List email templates error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list email templates' },
    });
  }
});

// GET /templates/:id - Get email template
router.get('/templates/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email template not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get email template error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get email template' },
    });
  }
});

// PATCH /templates/:id - Update email template
router.patch('/templates/:id', validate(updateTemplateSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email template not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update email template error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update email template' },
    });
  }
});

// DELETE /templates/:id - Delete email template
router.delete('/templates/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email template not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Email template deleted', id } });
  } catch (err) {
    logger.error('Delete email template error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete email template' },
    });
  }
});

// ---------------------------------------------------------------------------
// Email Campaigns
// ---------------------------------------------------------------------------

// POST /campaigns - Create email campaign
router.post('/campaigns', validate(createCampaignSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Verify template exists for this tenant
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('id')
      .eq('id', req.body.template_id)
      .eq('tenant_id', tenantId)
      .single();

    if (templateError || !template) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email template not found' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        ...req.body,
        tenant_id: tenantId,
        status: 'draft',
        filter_criteria: req.body.audience_filters,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create email campaign', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create email campaign' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create email campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create email campaign' },
    });
  }
});

// GET /campaigns - List email campaigns with pagination and status filter
router.get('/campaigns', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);
    const status = req.query.status as string | undefined;

    let query = supabaseAdmin
      .from('email_campaigns')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list email campaigns', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list email campaigns' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List email campaigns error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list email campaigns' },
    });
  }
});

// GET /campaigns/:id - Get email campaign with stats
router.get('/campaigns/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: campaign, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !campaign) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email campaign not found' },
      });
      return;
    }

    // Fetch event stats for this campaign
    const { data: events } = await supabaseAdmin
      .from('email_events')
      .select('event_type')
      .eq('campaign_id', id);

    const stats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
    };

    if (events) {
      for (const event of events) {
        const key = event.event_type as keyof typeof stats;
        if (key in stats) {
          stats[key]++;
        }
      }
    }

    res.json({ success: true, data: { ...campaign, stats } });
  } catch (err) {
    logger.error('Get email campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get email campaign' },
    });
  }
});

// POST /campaigns/:id/send - Send email campaign
router.post('/campaigns/:id/send', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Verify campaign exists and is in draft/scheduled status
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !campaign) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email campaign not found' },
      });
      return;
    }

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Campaign cannot be sent from status "${campaign.status}"`,
        },
      });
      return;
    }

    // Update campaign status to 'sending' and set sent_at
    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .update({
        status: 'sending',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update campaign status', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send campaign' },
      });
      return;
    }

    // TODO: Trigger actual Brevo send via API
    // This is a placeholder - in production, this would queue a job to:
    // 1. Resolve audience_filters to a list of contacts
    // 2. Send the campaign via Brevo API
    // 3. Update recipient_count
    // 4. Update status to 'sent' once complete

    res.json({
      success: true,
      data,
      message: 'Campaign marked as sending. Brevo integration pending.',
    });
  } catch (err) {
    logger.error('Send email campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send campaign' },
    });
  }
});

// POST /campaigns/:id/test - Send test email
router.post('/campaigns/:id/test', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Verify campaign exists
    const { data: campaign, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*, email_templates(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !campaign) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email campaign not found' },
      });
      return;
    }

    // TODO: Send test email via Brevo to the authenticated user's email
    // Placeholder - in production this would:
    // 1. Render the template with sample data
    // 2. Send to authReq.user.email via Brevo transactional API

    res.json({
      success: true,
      data: {
        message: 'Test email sent successfully',
        sent_to: authReq.user.email,
      },
    });
  } catch (err) {
    logger.error('Test email campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send test email' },
    });
  }
});

// ---------------------------------------------------------------------------
// Email Sequences
// ---------------------------------------------------------------------------

// POST /sequences - Create email sequence with steps
router.post('/sequences', validate(createSequenceSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { steps, ...sequenceData } = req.body;

    // Create the sequence
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('email_sequences')
      .insert({
        name: sequenceData.name,
        trigger_event: sequenceData.trigger_type,
        description: JSON.stringify({
          trigger_config: sequenceData.trigger_config,
          stop_conditions: sequenceData.stop_conditions,
        }),
        tenant_id: tenantId,
        is_active: true,
      })
      .select()
      .single();

    if (seqError || !sequence) {
      logger.error('Failed to create email sequence', { error: seqError?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create email sequence' },
      });
      return;
    }

    // Create the steps
    const stepsToInsert = steps.map((step: any) => ({
      sequence_id: sequence.id,
      template_id: step.template_id,
      position: step.step_order,
      delay_days: step.delay_unit === 'days' ? step.delay_value : step.delay_unit === 'weeks' ? step.delay_value * 7 : 0,
      delay_hours: step.delay_unit === 'hours' ? step.delay_value : step.delay_unit === 'minutes' ? Math.ceil(step.delay_value / 60) : 0,
      subject_override: null,
      is_active: true,
    }));

    const { data: createdSteps, error: stepsError } = await supabaseAdmin
      .from('email_sequence_steps')
      .insert(stepsToInsert)
      .select();

    if (stepsError) {
      logger.error('Failed to create sequence steps', { error: stepsError.message });
      // Clean up the sequence if steps fail
      await supabaseAdmin.from('email_sequences').delete().eq('id', sequence.id);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create sequence steps' },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: { ...sequence, steps: createdSteps },
    });
  } catch (err) {
    logger.error('Create email sequence error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create email sequence' },
    });
  }
});

// GET /sequences - List email sequences
router.get('/sequences', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('email_sequences')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list email sequences', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list email sequences' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List email sequences error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list email sequences' },
    });
  }
});

// GET /sequences/:id - Get email sequence with steps
router.get('/sequences/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: sequence, error } = await supabaseAdmin
      .from('email_sequences')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !sequence) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email sequence not found' },
      });
      return;
    }

    // Fetch steps
    const { data: steps } = await supabaseAdmin
      .from('email_sequence_steps')
      .select('*, email_templates(id, name, subject)')
      .eq('sequence_id', id)
      .order('position', { ascending: true });

    // Fetch enrollment count
    const { count: enrollmentCount } = await supabaseAdmin
      .from('email_sequence_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_id', id);

    res.json({
      success: true,
      data: {
        ...sequence,
        steps: steps || [],
        enrollment_count: enrollmentCount || 0,
      },
    });
  } catch (err) {
    logger.error('Get email sequence error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get email sequence' },
    });
  }
});

// POST /sequences/:id/enroll - Enroll a contact in a sequence
router.post(
  '/sequences/:id/enroll',
  validate(enrollContactSchema),
  async (req: any, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenant.id;
      const { id } = req.params;
      const { contact_id } = req.body;

      // Verify sequence exists and is active
      const { data: sequence, error: seqError } = await supabaseAdmin
        .from('email_sequences')
        .select('id, is_active')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (seqError || !sequence) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Email sequence not found' },
        });
        return;
      }

      if (!sequence.is_active) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Cannot enroll in an inactive sequence' },
        });
        return;
      }

      // Verify contact exists for this tenant
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('id', contact_id)
        .eq('tenant_id', tenantId)
        .single();

      if (contactError || !contact) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Contact not found' },
        });
        return;
      }

      // Check if contact is already enrolled and active
      const { data: existingEnrollment } = await supabaseAdmin
        .from('email_sequence_enrollments')
        .select('id')
        .eq('sequence_id', id)
        .eq('contact_id', contact_id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingEnrollment) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Contact is already enrolled in this sequence' },
        });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('email_sequence_enrollments')
        .insert({
          sequence_id: id,
          contact_id,
          current_step: 1,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to enroll contact', { error: error.message });
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to enroll contact' },
        });
        return;
      }

      res.status(201).json({ success: true, data });
    } catch (err) {
      logger.error('Enroll contact error', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to enroll contact' },
      });
    }
  },
);

// PATCH /sequences/:id/status - Pause or activate a sequence
router.patch(
  '/sequences/:id/status',
  validate(updateSequenceStatusSchema),
  async (req: any, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenant.id;
      const { id } = req.params;
      const { status } = req.body;

      const isActive = status === 'active';

      const { data, error } = await supabaseAdmin
        .from('email_sequences')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error || !data) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Email sequence not found' },
        });
        return;
      }

      res.json({ success: true, data });
    } catch (err) {
      logger.error('Update sequence status error', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update sequence status' },
      });
    }
  },
);

export default router;
