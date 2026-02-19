import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSmsTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(160),
  variables: z.array(z.string()).nullable().optional(),
});

const createSmsCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  template_id: z.string().uuid(),
  audience_filters: z.record(z.unknown()),
  scheduled_at: z.string().datetime().nullable().optional(),
});

const sendSmsSchema = z.object({
  contact_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  content: z.string().max(160).nullable().optional(),
}).refine(
  (data) => data.template_id || data.content,
  { message: 'Either template_id or content must be provided' },
);

// ---------------------------------------------------------------------------
// SMS Templates
// ---------------------------------------------------------------------------

// POST /templates - Create SMS template
router.post('/templates', validate(createSmsTemplateSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('sms_templates')
      .insert({
        name: req.body.name,
        body: req.body.content,
        variables: req.body.variables || [],
        tenant_id: tenantId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create SMS template', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create SMS template' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create SMS template error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create SMS template' },
    });
  }
});

// GET /templates - List SMS templates
router.get('/templates', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('sms_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list SMS templates', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list SMS templates' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List SMS templates error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list SMS templates' },
    });
  }
});

// ---------------------------------------------------------------------------
// SMS Campaigns
// ---------------------------------------------------------------------------

// POST /campaigns - Create SMS campaign
router.post('/campaigns', validate(createSmsCampaignSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Verify template exists for this tenant
    const { data: template, error: templateError } = await supabaseAdmin
      .from('sms_templates')
      .select('id')
      .eq('id', req.body.template_id)
      .eq('tenant_id', tenantId)
      .single();

    if (templateError || !template) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'SMS template not found' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('sms_campaigns')
      .insert({
        name: req.body.name,
        template_id: req.body.template_id,
        filter_criteria: req.body.audience_filters,
        scheduled_at: req.body.scheduled_at || null,
        tenant_id: tenantId,
        status: 'draft',
        recipient_count: 0,
        delivered_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create SMS campaign', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create SMS campaign' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create SMS campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create SMS campaign' },
    });
  }
});

// GET /campaigns - List SMS campaigns
router.get('/campaigns', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('sms_campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list SMS campaigns', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list SMS campaigns' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List SMS campaigns error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list SMS campaigns' },
    });
  }
});

// GET /campaigns/:id - Get SMS campaign with stats
router.get('/campaigns/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: campaign, error } = await supabaseAdmin
      .from('sms_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !campaign) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'SMS campaign not found' },
      });
      return;
    }

    // Fetch event stats for this campaign
    const { data: events } = await supabaseAdmin
      .from('sms_events')
      .select('event_type')
      .eq('campaign_id', id);

    const stats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      replied: 0,
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
    logger.error('Get SMS campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get SMS campaign' },
    });
  }
});

// POST /campaigns/:id/send - Mark campaign as sending
router.post('/campaigns/:id/send', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // Verify campaign exists and is in a sendable status
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('sms_campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !campaign) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'SMS campaign not found' },
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

    const { data, error } = await supabaseAdmin
      .from('sms_campaigns')
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
      logger.error('Failed to update SMS campaign status', { error: error?.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send SMS campaign' },
      });
      return;
    }

    // TODO: Trigger actual Twilio send via API
    // This is a placeholder - in production, this would queue a job to:
    // 1. Resolve audience_filters to a list of contacts with phone numbers
    // 2. Send SMS via Twilio API
    // 3. Update recipient_count
    // 4. Update status to 'sent' once complete

    res.json({
      success: true,
      data,
      message: 'Campaign marked as sending. Twilio integration pending.',
    });
  } catch (err) {
    logger.error('Send SMS campaign error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send SMS campaign' },
    });
  }
});

// ---------------------------------------------------------------------------
// One-shot SMS
// ---------------------------------------------------------------------------

// POST /send - Send a single SMS to a contact
router.post('/send', validate(sendSmsSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { contact_id, template_id, content } = req.body;

    // Verify contact exists and has a phone number
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, first_name, last_name')
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

    if (!contact.phone) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Contact does not have a phone number' },
      });
      return;
    }

    // Resolve message content
    let messageContent = content;

    if (template_id) {
      const { data: template, error: templateError } = await supabaseAdmin
        .from('sms_templates')
        .select('body, variables')
        .eq('id', template_id)
        .eq('tenant_id', tenantId)
        .single();

      if (templateError || !template) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'SMS template not found' },
        });
        return;
      }

      // Simple variable replacement
      messageContent = template.body
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '');
    }

    // Log the SMS event
    const { data: smsEvent, error: eventError } = await supabaseAdmin
      .from('sms_events')
      .insert({
        tenant_id: tenantId,
        contact_id,
        event_type: 'sent',
        campaign_id: null,
        metadata: {
          content: messageContent,
          phone: contact.phone,
          template_id: template_id || null,
          direction: 'outbound',
        },
      })
      .select()
      .single();

    if (eventError) {
      logger.error('Failed to log SMS event', { error: eventError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send SMS' },
      });
      return;
    }

    // TODO: Actually send SMS via Twilio
    // In production:
    // 1. Call Twilio API to send the SMS
    // 2. Update the event with Twilio message SID
    // 3. Handle delivery status webhooks

    res.status(201).json({
      success: true,
      data: {
        event_id: smsEvent.id,
        contact_id,
        phone: contact.phone,
        content: messageContent,
        status: 'sent',
        message: 'SMS logged. Twilio integration pending.',
      },
    });
  } catch (err) {
    logger.error('Send SMS error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send SMS' },
    });
  }
});

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

// GET /conversations/:contactId - Get SMS/WhatsApp events for a contact
router.get('/conversations/:contactId', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { contactId } = req.params;

    // Verify contact exists for this tenant
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single();

    if (contactError || !contact) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' },
      });
      return;
    }

    // Fetch SMS events for this contact
    const { data: smsEvents, error: smsError } = await supabaseAdmin
      .from('sms_events')
      .select('*')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (smsError) {
      logger.error('Failed to fetch SMS events', { error: smsError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversation' },
      });
      return;
    }

    // Combine and sort by timestamp
    const conversation = (smsEvents || []).map((event) => ({
      id: event.id,
      type: 'sms',
      event_type: event.event_type,
      direction: event.metadata?.direction || 'outbound',
      content: event.metadata?.content || null,
      metadata: event.metadata,
      occurred_at: event.created_at,
    }));

    res.json({ success: true, data: conversation });
  } catch (err) {
    logger.error('Get conversation error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversation' },
    });
  }
});

export default router;
