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
// Metadata schemas per entity_type
// ---------------------------------------------------------------------------

const vehicleMetadataSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  color: z.string().optional(),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  mileage: z.number().optional(),
  fuel_type: z.string().optional(),
});

const roomMetadataSchema = z.object({
  floor: z.number().int().optional(),
  capacity: z.number().int().optional(),
  amenities: z.array(z.string()).optional(),
  rate_per_night: z.number().optional(),
  room_type: z.string().optional(),
});

const patientMetadataSchema = z.object({
  date_of_birth: z.string().optional(),
  blood_type: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  insurance_number: z.string().optional(),
  medical_history: z.string().optional(),
});

const legalCaseMetadataSchema = z.object({
  case_number: z.string().optional(),
  court: z.string().optional(),
  jurisdiction: z.string().optional(),
  case_type: z.string().optional(),
  opposing_party: z.string().optional(),
  filing_date: z.string().optional(),
});

const projectMetadataSchema = z.object({
  budget: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  project_type: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

const appointmentMetadataSchema = z.object({
  appointment_type: z.string().optional(),
  duration_minutes: z.number().int().optional(),
  location: z.string().optional(),
  recurrence: z.string().optional(),
});

const metadataSchemas: Record<string, z.ZodSchema> = {
  vehicle: vehicleMetadataSchema,
  room: roomMetadataSchema,
  patient: patientMetadataSchema,
  legal_case: legalCaseMetadataSchema,
  project: projectMetadataSchema,
  appointment: appointmentMetadataSchema,
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const entityTypes = ['vehicle', 'room', 'patient', 'legal_case', 'project', 'appointment'] as const;

const createEntitySchema = z.object({
  contact_id: z.string().uuid(),
  entity_type: z.enum(entityTypes),
  primary_identifier: z.string().min(1).max(255),
  secondary_identifier: z.string().max(255).nullable().optional(),
  name: z.string().min(1).max(255),
  metadata: z.record(z.unknown()).default({}),
  status: z.string().max(50).default('active'),
});

const updateEntitySchema = z.object({
  contact_id: z.string().uuid().optional(),
  primary_identifier: z.string().min(1).max(255).optional(),
  secondary_identifier: z.string().max(255).nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.string().max(50).optional(),
});

// ---------------------------------------------------------------------------
// GET / - List entities with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { page, limit, offset } = parsePaginationParams(req.query);

    const entityType = req.query.entity_type as string | undefined;
    const contactId = req.query.contact_id as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    let query = supabaseAdmin
      .from('entities')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,primary_identifier.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list entities', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list entities' },
      });
      return;
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(page, limit, count || 0),
    });
  } catch (err) {
    logger.error('List entities error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list entities' },
    });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create entity with metadata validation per type
// ---------------------------------------------------------------------------
router.post('/', validate(createEntitySchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { entity_type, metadata, ...rest } = req.body;

    // Validate metadata per entity type
    const metadataSchema = metadataSchemas[entity_type];
    if (metadataSchema) {
      const metaResult = metadataSchema.safeParse(metadata);
      if (!metaResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid metadata for entity type '${entity_type}'`,
            details: metaResult.error.issues,
          },
        });
        return;
      }
    }

    // Verify contact belongs to tenant
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', rest.contact_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!contact) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Contact not found in this tenant' },
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('entities')
      .insert({
        ...rest,
        entity_type,
        metadata,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create entity', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create entity' },
      });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create entity error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create entity' },
    });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get entity
// ---------------------------------------------------------------------------
router.get('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('entities')
      .select('*, contact:contacts(id, first_name, last_name, email)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Entity not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get entity error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get entity' },
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id - Update entity
// ---------------------------------------------------------------------------
router.patch('/:id', validate(updateEntitySchema), async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    // If metadata is being updated, validate it
    if (req.body.metadata) {
      const { data: existing } = await supabaseAdmin
        .from('entities')
        .select('entity_type')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (existing) {
        const metadataSchema = metadataSchemas[existing.entity_type];
        if (metadataSchema) {
          const metaResult = metadataSchema.safeParse(req.body.metadata);
          if (!metaResult.success) {
            res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `Invalid metadata for entity type '${existing.entity_type}'`,
                details: metaResult.error.issues,
              },
            });
            return;
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('entities')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Entity not found' },
      });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update entity error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update entity' },
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete entity
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenantId = authReq.tenant.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('entities')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Entity not found' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'Entity deleted', id } });
  } catch (err) {
    logger.error('Delete entity error', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete entity' },
    });
  }
});

export default router;
