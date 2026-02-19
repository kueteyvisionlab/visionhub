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

const formFieldSchema = z.object({
  type: z.enum(['text', 'email', 'phone', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file', 'hidden']),
  label: z.string().min(1).max(255),
  required: z.boolean(),
  options: z.array(z.string()).nullable().optional(),
});

const formSettingsSchema = z.object({
  redirect_url: z.string().url().nullable().optional(),
  auto_response: z.string().nullable().optional(),
  notify_email: z.string().email().nullable().optional(),
}).nullable().optional();

const createFormSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  fields: z.array(formFieldSchema).min(1),
  settings: formSettingsSchema,
  pipeline_id: z.string().uuid().nullable().optional(),
});

const updateFormSchema = createFormSchema.partial();

// ---------------------------------------------------------------------------
// Public routes (no auth)
// ---------------------------------------------------------------------------

// POST /:slug/submit - Public form submission
router.post('/:slug/submit', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Fetch the form by slug
    const { data: form, error: formError } = await supabaseAdmin
      .from('web_forms')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Form not found or inactive' },
      });
      return;
    }

    const tenantId = form.tenant_id;
    const fields = form.fields as Array<{
      type: string;
      label: string;
      required: boolean;
      options?: string[] | null;
    }>;

    // Dynamically validate submitted data against form field definitions
    const submittedData = req.body;
    const validationErrors: string[] = [];

    for (const field of fields) {
      const fieldKey = field.label.toLowerCase().replace(/\s+/g, '_');
      const value = submittedData[fieldKey] ?? submittedData[field.label];

      if (field.required && (value === undefined || value === null || value === '')) {
        validationErrors.push(`Field "${field.label}" is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (field.type === 'email' && typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            validationErrors.push(`Field "${field.label}" must be a valid email`);
          }
        }

        if (field.type === 'number' && isNaN(Number(value))) {
          validationErrors.push(`Field "${field.label}" must be a number`);
        }

        if (field.type === 'select' || field.type === 'radio') {
          if (field.options && !field.options.includes(String(value))) {
            validationErrors.push(`Field "${field.label}" must be one of: ${field.options.join(', ')}`);
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Form validation failed',
          details: validationErrors,
        },
      });
      return;
    }

    // Try to find or create a contact based on email
    let contactId: string | null = null;
    const emailField = fields.find((f) => f.type === 'email');

    if (emailField) {
      const emailKey = emailField.label.toLowerCase().replace(/\s+/g, '_');
      const emailValue = submittedData[emailKey] || submittedData[emailField.label];

      if (emailValue) {
        // Try to find existing contact by email
        const { data: existingContact } = await supabaseAdmin
          .from('contacts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('email', emailValue)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          // Extract name fields if available
          const nameFields = fields.filter(
            (f) => f.type === 'text' && (f.label.toLowerCase().includes('name') || f.label.toLowerCase().includes('nom')),
          );

          let firstName = 'Unknown';
          let lastName = 'Unknown';

          for (const nf of nameFields) {
            const nfKey = nf.label.toLowerCase().replace(/\s+/g, '_');
            const nfValue = submittedData[nfKey] || submittedData[nf.label];
            if (nfValue) {
              if (nf.label.toLowerCase().includes('first') || nf.label.toLowerCase().includes('prénom')) {
                firstName = nfValue;
              } else if (nf.label.toLowerCase().includes('last') || nf.label.toLowerCase().includes('nom')) {
                lastName = nfValue;
              } else {
                // Generic name field - use as first name
                firstName = nfValue;
              }
            }
          }

          // Extract phone if available
          const phoneField = fields.find((f) => f.type === 'phone');
          let phone: string | null = null;
          if (phoneField) {
            const phoneKey = phoneField.label.toLowerCase().replace(/\s+/g, '_');
            phone = submittedData[phoneKey] || submittedData[phoneField.label] || null;
          }

          const { data: newContact, error: contactError } = await supabaseAdmin
            .from('contacts')
            .insert({
              tenant_id: tenantId,
              type: 'particulier',
              first_name: firstName,
              last_name: lastName,
              email: emailValue,
              phone,
              gdpr_consent: false,
              preferred_channel: 'email',
              reminder_enabled: true,
              tags: ['web-form'],
            })
            .select()
            .single();

          if (!contactError && newContact) {
            contactId = newContact.id;
          } else {
            logger.warn('Failed to create contact from form submission', {
              error: contactError?.message,
            });
          }
        }
      }
    }

    // Create deal if pipeline_id is set on the form
    const pipelineId = (form.settings as any)?.pipeline_id || form.redirect_url; // fallback check
    let dealId: string | null = null;

    // Check for pipeline_id in the form record or settings
    if (form.pipeline_id && contactId) {
      // Get the first stage of the pipeline
      const { data: firstStage } = await supabaseAdmin
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', form.pipeline_id)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (firstStage) {
        const { data: deal, error: dealError } = await supabaseAdmin
          .from('deals')
          .insert({
            tenant_id: tenantId,
            pipeline_id: form.pipeline_id,
            stage_id: firstStage.id,
            contact_id: contactId,
            title: `${form.name} - Submission`,
            value: 0,
            currency: 'EUR',
            probability: 0,
            status: 'open',
            metadata: { source: 'web_form', form_id: form.id },
          })
          .select()
          .single();

        if (!dealError && deal) {
          dealId = deal.id;
        } else {
          logger.warn('Failed to create deal from form submission', {
            error: dealError?.message,
          });
        }
      }
    }

    // Store the submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('web_form_submissions')
      .insert({
        form_id: form.id,
        tenant_id: tenantId,
        contact_id: contactId,
        data: submittedData,
        ip_address: req.ip || req.headers['x-forwarded-for'] || null,
        user_agent: req.headers['user-agent'] || null,
      })
      .select()
      .single();

    if (submissionError) {
      logger.error('Failed to store form submission', { error: submissionError.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit form' },
      });
      return;
    }

    // Increment submissions_count on the form
    await supabaseAdmin.rpc('increment_counter', {
      table_name: 'web_forms',
      column_name: 'submission_count',
      row_id: form.id,
    }).then(({ error: rpcError }) => {
      if (rpcError) {
        // Fallback: manual increment
        supabaseAdmin
          .from('web_forms')
          .update({ submission_count: (form.submission_count || 0) + 1 })
          .eq('id', form.id)
          .then();
      }
    });

    const responseData: Record<string, any> = {
      submission_id: submission.id,
      message: form.thank_you_message || 'Thank you for your submission!',
    };

    if (contactId) {
      responseData.contact_id = contactId;
    }
    if (dealId) {
      responseData.deal_id = dealId;
    }

    const settings = form.settings as Record<string, any> | null;
    if (settings?.redirect_url) {
      responseData.redirect_url = settings.redirect_url;
    }

    res.status(201).json({ success: true, data: responseData });
  } catch (err) {
    logger.error('Form submission error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit form' },
    });
  }
});

// ---------------------------------------------------------------------------
// All routes below require authentication
// ---------------------------------------------------------------------------
router.use(authenticate as any);

// ---------------------------------------------------------------------------
// Web Forms CRUD
// ---------------------------------------------------------------------------

// POST / - Create web form
router.post('/', validate(createFormSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    // Check slug uniqueness within the tenant
    const { data: existingForm } = await supabaseAdmin
      .from('web_forms')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', req.body.slug)
      .maybeSingle();

    if (existingForm) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'A form with this slug already exists' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('web_forms')
      .insert({
        name: req.body.name,
        slug: req.body.slug,
        fields: req.body.fields,
        settings: req.body.settings || null,
        pipeline_id: req.body.pipeline_id || null,
        tenant_id: tenantId,
        is_active: true,
        submission_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create web form', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create web form' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create web form error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create web form' },
    });
  }
});

// GET / - List web forms for tenant
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;

    const { data, error } = await supabaseAdmin
      .from('web_forms')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to list web forms', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list web forms' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('List web forms error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list web forms' },
    });
  }
});

// GET /:id - Get web form with submission stats
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data: form, error } = await supabaseAdmin
      .from('web_forms')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !form) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Web form not found' },
      });
      return;
    }

    // Fetch recent submission stats
    const { count: totalSubmissions } = await supabaseAdmin
      .from('web_form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentSubmissions } = await supabaseAdmin
      .from('web_form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    res.json({
      success: true,
      data: {
        ...form,
        stats: {
          total_submissions: totalSubmissions || 0,
          submissions_last_30_days: recentSubmissions || 0,
        },
      },
    });
  } catch (err) {
    logger.error('Get web form error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get web form' },
    });
  }
});

// PATCH /:id - Update web form
router.patch('/:id', validate(updateFormSchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // If slug is being updated, check uniqueness
    if (req.body.slug) {
      const { data: existingForm } = await supabaseAdmin
        .from('web_forms')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('slug', req.body.slug)
        .neq('id', id)
        .maybeSingle();

      if (existingForm) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'A form with this slug already exists' },
        });
        return;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('web_forms')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Web form not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update web form error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update web form' },
    });
  }
});

// DELETE /:id - Delete web form
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('web_forms')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Web form not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Web form deleted', id } });
  } catch (err) {
    logger.error('Delete web form error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete web form' },
    });
  }
});

// GET /:id/submissions - List form submissions with pagination
router.get('/:id/submissions', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;
    const { page, limit, offset } = parsePaginationParams(req.query);

    // Verify form exists for this tenant
    const { data: form, error: formError } = await supabaseAdmin
      .from('web_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (formError || !form) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Web form not found' },
      });
      return;
    }

    const { data, error, count } = await supabaseAdmin
      .from('web_form_submissions')
      .select('*, contacts(id, first_name, last_name, email)', { count: 'exact' })
      .eq('form_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list form submissions', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list form submissions' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List form submissions error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list form submissions' },
    });
  }
});

export default router;
