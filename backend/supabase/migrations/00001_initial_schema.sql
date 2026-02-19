-- ============================================================================
-- Vision CRM Multi-Tenant: Initial Schema Migration
-- ============================================================================
-- This migration creates the complete database schema for Vision CRM,
-- a multi-tenant CRM platform supporting multiple business verticals.
-- All tenant-scoped tables enforce Row Level Security (RLS) using
-- the session variable `app.current_tenant_id`.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'super_admin', 'admin', 'pro', 'client'
);

CREATE TYPE contact_type AS ENUM (
    'particulier', 'entreprise'
);

CREATE TYPE preferred_channel AS ENUM (
    'whatsapp', 'sms', 'email'
);

CREATE TYPE entity_type AS ENUM (
    'vehicle', 'room', 'patient', 'legal_case', 'project', 'appointment'
);

CREATE TYPE order_type_enum AS ENUM (
    'quote', 'invoice'
);

CREATE TYPE order_status AS ENUM (
    'draft', 'sent', 'accepted', 'rejected', 'paid', 'cancelled'
);

CREATE TYPE service_order_type AS ENUM (
    'repair', 'cleaning', 'meal', 'treatment', 'legal_work', 'landscaping', 'appointment'
);

CREATE TYPE service_order_status AS ENUM (
    'draft', 'scheduled', 'in_progress', 'completed', 'billed', 'cancelled'
);

CREATE TYPE resource_type AS ENUM (
    'mechanic', 'room', 'stylist', 'doctor', 'equipment', 'team', 'table_seat'
);

CREATE TYPE schedule_status AS ENUM (
    'available', 'booked', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE inventory_item_type AS ENUM (
    'spare_part', 'food', 'beverage', 'cosmetic', 'hair_product', 'medical_supply', 'material'
);

CREATE TYPE movement_type AS ENUM (
    'in', 'out', 'adjustment', 'return'
);

CREATE TYPE reminder_type AS ENUM (
    'maintenance', 'booking', 'follow_up', 'deadline', 'renewal', 'appointment'
);

CREATE TYPE review_platform AS ENUM (
    'google', 'booking', 'tripadvisor', 'doctolib', 'trustpilot', 'yelp', 'internal'
);

CREATE TYPE review_status AS ENUM (
    'pending', 'published', 'replied', 'hidden'
);

CREATE TYPE plan_type AS ENUM (
    'free', 'starter', 'pro', 'enterprise'
);

CREATE TYPE campaign_status AS ENUM (
    'draft', 'scheduled', 'sending', 'sent', 'cancelled'
);

CREATE TYPE sequence_status AS ENUM (
    'active', 'paused', 'completed'
);

CREATE TYPE enrollment_status AS ENUM (
    'active', 'paused', 'completed', 'unsubscribed'
);

CREATE TYPE email_event_type AS ENUM (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained'
);

CREATE TYPE deal_status AS ENUM (
    'open', 'won', 'lost'
);

CREATE TYPE webhook_event_type AS ENUM (
    'contact.created', 'contact.updated',
    'order.created', 'order.paid',
    'deal.created', 'deal.stage_changed',
    'service.completed',
    'invoice.sent', 'invoice.paid',
    'appointment.scheduled', 'appointment.cancelled',
    'review.received', 'form.submitted'
);

CREATE TYPE form_field_type AS ENUM (
    'text', 'email', 'phone', 'select', 'textarea', 'checkbox', 'date', 'number'
);

CREATE TYPE bank_connection_status AS ENUM (
    'active', 'expired', 'error'
);

CREATE TYPE sms_event_type AS ENUM (
    'sent', 'delivered', 'failed'
);


-- ============================================================================
-- 2. UTILITY FUNCTIONS
-- ============================================================================

-- Trigger function to auto-update the `updated_at` column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1 tenants
-- --------------------------------------------------------------------------
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    logo_url    TEXT,
    siret       VARCHAR(20),
    address     JSONB,
    phone       VARCHAR(30),
    plan        plan_type NOT NULL DEFAULT 'free',
    stripe_customer_id     VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    monthly_credits        INT NOT NULL DEFAULT 0,
    current_usage          JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 3.2 users
-- --------------------------------------------------------------------------
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    auth_provider_id VARCHAR(255) UNIQUE,
    email            VARCHAR(320) NOT NULL,
    full_name        VARCHAR(255),
    role             user_role NOT NULL DEFAULT 'pro',
    avatar_url       TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- --------------------------------------------------------------------------
-- 3.3 contacts
-- --------------------------------------------------------------------------
CREATE TABLE contacts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id           UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    type              contact_type NOT NULL DEFAULT 'particulier',
    first_name        VARCHAR(150),
    last_name         VARCHAR(150),
    company_name      VARCHAR(255),
    email             VARCHAR(320),
    phone             VARCHAR(30),
    address           JSONB,
    gdpr_consent      BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_channel preferred_channel NOT NULL DEFAULT 'email',
    whatsapp_number   VARCHAR(30),
    reminder_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email);
CREATE INDEX idx_contacts_phone ON contacts(tenant_id, phone);

CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 3.4 tags
-- --------------------------------------------------------------------------
CREATE TABLE tags (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    color      VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_tags_tenant ON tags(tenant_id);

-- --------------------------------------------------------------------------
-- 3.5 contact_tags
-- --------------------------------------------------------------------------
CREATE TABLE contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

-- --------------------------------------------------------------------------
-- 3.6 notes
-- --------------------------------------------------------------------------
CREATE TABLE notes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_tenant ON notes(tenant_id);
CREATE INDEX idx_notes_contact ON notes(contact_id);

-- --------------------------------------------------------------------------
-- 3.7 files
-- --------------------------------------------------------------------------
CREATE TABLE files (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
    entity_id   UUID,  -- Polymorphic FK; enforced at app level
    file_name   VARCHAR(500) NOT NULL,
    file_url    TEXT NOT NULL,
    file_size   INT,
    mime_type   VARCHAR(255),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_contact ON files(contact_id);

-- --------------------------------------------------------------------------
-- 3.8 audit_logs
-- --------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL for super_admin actions
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id   UUID,
    old_data      JSONB,
    new_data      JSONB,
    ip_address    INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);


-- ============================================================================
-- 4. ENTITIES & SERVICES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 4.1 entities
-- --------------------------------------------------------------------------
CREATE TABLE entities (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    entity_type           entity_type NOT NULL,
    primary_identifier    VARCHAR(255) NOT NULL,
    secondary_identifier  VARCHAR(255),
    name                  VARCHAR(255),
    metadata              JSONB NOT NULL DEFAULT '{}',
    status                VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, entity_type, primary_identifier)
);

CREATE INDEX idx_entities_tenant ON entities(tenant_id);
CREATE INDEX idx_entities_contact ON entities(contact_id);
CREATE INDEX idx_entities_type ON entities(tenant_id, entity_type);

CREATE TRIGGER trg_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 4.2 orders
-- --------------------------------------------------------------------------
CREATE TABLE orders (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id              UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    entity_id               UUID REFERENCES entities(id) ON DELETE SET NULL,
    order_number            VARCHAR(50) NOT NULL,
    type                    order_type_enum NOT NULL,
    status                  order_status NOT NULL DEFAULT 'draft',
    subtotal                DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate                DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    tax_amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
    total                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes                   TEXT,
    valid_until             DATE,
    paid_at                 TIMESTAMPTZ,
    stripe_payment_intent_id VARCHAR(255),
    created_by              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_contact ON orders(contact_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 4.3 order_items
-- --------------------------------------------------------------------------
CREATE TABLE order_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    description       TEXT NOT NULL,
    quantity          DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price        DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate          DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    total             DECIMAL(12,2) NOT NULL DEFAULT 0,
    inventory_item_id UUID,  -- FK added after inventory_items table creation
    metadata          JSONB,
    sort_order        INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- --------------------------------------------------------------------------
-- 4.4 service_orders
-- --------------------------------------------------------------------------
CREATE TABLE service_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    entity_id       UUID REFERENCES entities(id) ON DELETE SET NULL,
    order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    type            service_order_type NOT NULL,
    status          service_order_status NOT NULL DEFAULT 'draft',
    description     TEXT,
    scheduled_start TIMESTAMPTZ,
    scheduled_end   TIMESTAMPTZ,
    actual_start    TIMESTAMPTZ,
    actual_end      TIMESTAMPTZ,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_orders_tenant ON service_orders(tenant_id);
CREATE INDEX idx_service_orders_contact ON service_orders(contact_id);
CREATE INDEX idx_service_orders_status ON service_orders(tenant_id, status);
CREATE INDEX idx_service_orders_scheduled ON service_orders(tenant_id, scheduled_start, scheduled_end);

CREATE TRIGGER trg_service_orders_updated_at
    BEFORE UPDATE ON service_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 4.5 resource_schedules
-- --------------------------------------------------------------------------
CREATE TABLE resource_schedules (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    resource_id   UUID NOT NULL,  -- Polymorphic reference (user, entity, etc.)
    resource_name VARCHAR(255),
    start_at      TIMESTAMPTZ NOT NULL,
    end_at        TIMESTAMPTZ NOT NULL,
    status        schedule_status NOT NULL DEFAULT 'available',
    service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
    contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
    notes         TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent overlapping bookings for the same resource
    CONSTRAINT chk_schedule_time CHECK (end_at > start_at)
);

CREATE INDEX idx_resource_schedules_tenant ON resource_schedules(tenant_id);
CREATE INDEX idx_resource_schedules_resource ON resource_schedules(tenant_id, resource_type, resource_id);
CREATE INDEX idx_resource_schedules_time ON resource_schedules(tenant_id, start_at, end_at);
-- Conflict prevention: exclude overlapping time ranges for the same resource
-- (Requires btree_gist extension for exclusion constraint with non-range types)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE resource_schedules
    ADD CONSTRAINT no_schedule_overlap
    EXCLUDE USING gist (
        tenant_id WITH =,
        resource_type WITH =,
        resource_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    )
    WHERE (status NOT IN ('cancelled'));

CREATE TRIGGER trg_resource_schedules_updated_at
    BEFORE UPDATE ON resource_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 4.6 inventory_items
-- --------------------------------------------------------------------------
CREATE TABLE inventory_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type            inventory_item_type NOT NULL,
    name            VARCHAR(255) NOT NULL,
    sku             VARCHAR(100),
    description     TEXT,
    unit            VARCHAR(50) DEFAULT 'unit',
    current_stock   DECIMAL(12,2) NOT NULL DEFAULT 0,
    min_stock       DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_cost       DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
    supplier        VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);

CREATE INDEX idx_inventory_items_tenant ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_type ON inventory_items(tenant_id, type);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(tenant_id)
    WHERE current_stock <= min_stock AND is_active = TRUE;

CREATE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add deferred FK from order_items to inventory_items
ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_inventory
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

-- --------------------------------------------------------------------------
-- 4.7 inventory_movements
-- --------------------------------------------------------------------------
CREATE TABLE inventory_movements (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id       UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    quantity      DECIMAL(12,2) NOT NULL,
    reference     VARCHAR(255),
    notes         TEXT,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_tenant ON inventory_movements(tenant_id);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);

-- --------------------------------------------------------------------------
-- 4.8 automated_reminders
-- --------------------------------------------------------------------------
CREATE TABLE automated_reminders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    entity_id       UUID REFERENCES entities(id) ON DELETE SET NULL,
    type            reminder_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    channel         preferred_channel NOT NULL DEFAULT 'email',
    scheduled_at    TIMESTAMPTZ NOT NULL,
    sent_at         TIMESTAMPTZ,
    is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule VARCHAR(255),  -- iCal RRULE format
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_tenant ON automated_reminders(tenant_id);
CREATE INDEX idx_reminders_scheduled ON automated_reminders(scheduled_at)
    WHERE sent_at IS NULL;
CREATE INDEX idx_reminders_contact ON automated_reminders(contact_id);

CREATE TRIGGER trg_reminders_updated_at
    BEFORE UPDATE ON automated_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 4.9 reviews
-- --------------------------------------------------------------------------
CREATE TABLE reviews (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
    platform      review_platform NOT NULL DEFAULT 'internal',
    external_id   VARCHAR(255),
    rating        SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title         VARCHAR(500),
    content       TEXT,
    reply         TEXT,
    replied_at    TIMESTAMPTZ,
    status        review_status NOT NULL DEFAULT 'pending',
    metadata      JSONB DEFAULT '{}',
    reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_tenant ON reviews(tenant_id);
CREATE INDEX idx_reviews_platform ON reviews(tenant_id, platform);
CREATE INDEX idx_reviews_contact ON reviews(contact_id);

CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 5. MODULES & PLATFORM
-- ============================================================================

-- --------------------------------------------------------------------------
-- 5.1 modules
-- --------------------------------------------------------------------------
CREATE TABLE modules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(100),
    is_core     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- 5.2 tenant_modules
-- --------------------------------------------------------------------------
CREATE TABLE tenant_modules (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id    UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    config_json  JSONB NOT NULL DEFAULT '{}',
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, module_id)
);

CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);

-- --------------------------------------------------------------------------
-- 5.3 usage_logs (partition-ready by created_at)
-- --------------------------------------------------------------------------
CREATE TABLE usage_logs (
    id         UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module     VARCHAR(100) NOT NULL,
    action     VARCHAR(100) NOT NULL,
    quantity   INT NOT NULL DEFAULT 1,
    unit_cost  DECIMAL(8,4) NOT NULL DEFAULT 0,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions (one per quarter, extend as needed)
CREATE TABLE usage_logs_2025_q1 PARTITION OF usage_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE usage_logs_2025_q2 PARTITION OF usage_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE usage_logs_2025_q3 PARTITION OF usage_logs
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE usage_logs_2025_q4 PARTITION OF usage_logs
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE usage_logs_2026_q1 PARTITION OF usage_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE usage_logs_2026_q2 PARTITION OF usage_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE INDEX idx_usage_logs_tenant ON usage_logs(tenant_id, created_at);

-- --------------------------------------------------------------------------
-- 5.4 feature_flags
-- --------------------------------------------------------------------------
CREATE TABLE feature_flags (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT,
    is_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percentage  INT NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- 6. PIPELINE & DEALS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 6.1 pipelines
-- --------------------------------------------------------------------------
CREATE TABLE pipelines (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pipelines_tenant ON pipelines(tenant_id);

-- --------------------------------------------------------------------------
-- 6.2 pipeline_stages
-- --------------------------------------------------------------------------
CREATE TABLE pipeline_stages (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id    UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    display_order  INT NOT NULL DEFAULT 0,
    probability    INT NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    color          VARCHAR(7),
    is_closed_won  BOOLEAN NOT NULL DEFAULT FALSE,
    is_closed_lost BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id, display_order);

-- --------------------------------------------------------------------------
-- 6.3 deals
-- --------------------------------------------------------------------------
CREATE TABLE deals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id         UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id            UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
    lead_score          INT NOT NULL DEFAULT 0,
    score_breakdown     JSONB,
    owner_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              deal_status NOT NULL DEFAULT 'open',
    expected_close_date DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_tenant ON deals(tenant_id);
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id, stage_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_owner ON deals(owner_user_id);
CREATE INDEX idx_deals_status ON deals(tenant_id, status);

CREATE TRIGGER trg_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 6.4 deal_activities
-- --------------------------------------------------------------------------
CREATE TABLE deal_activities (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description   TEXT,
    metadata      JSONB,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_activities_deal ON deal_activities(deal_id);

-- --------------------------------------------------------------------------
-- 6.5 revenue_forecasts
-- --------------------------------------------------------------------------
CREATE TABLE revenue_forecasts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id       UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    period_start      DATE NOT NULL,
    period_end        DATE NOT NULL,
    total_pipeline    DECIMAL(12,2) NOT NULL DEFAULT 0,
    weighted_pipeline DECIMAL(12,2) NOT NULL DEFAULT 0,
    actual_revenue    DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_forecasts_tenant ON revenue_forecasts(tenant_id);
CREATE INDEX idx_revenue_forecasts_period ON revenue_forecasts(tenant_id, period_start, period_end);


-- ============================================================================
-- 7. EMAIL MARKETING
-- ============================================================================

-- --------------------------------------------------------------------------
-- 7.1 email_templates
-- --------------------------------------------------------------------------
CREATE TABLE email_templates (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    subject        VARCHAR(500) NOT NULL,
    html_body      TEXT NOT NULL,
    json_structure JSONB,
    category       VARCHAR(100),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);

CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 7.2 email_campaigns
-- --------------------------------------------------------------------------
CREATE TABLE email_campaigns (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id      UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    subject          VARCHAR(500) NOT NULL,
    subject_b        VARCHAR(500),  -- A/B test variant
    audience_filters JSONB,
    status           campaign_status NOT NULL DEFAULT 'draft',
    scheduled_at     TIMESTAMPTZ,
    sent_at          TIMESTAMPTZ,
    stats            JSONB NOT NULL DEFAULT '{"sent":0,"delivered":0,"opened":0,"clicked":0,"bounced":0}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_tenant ON email_campaigns(tenant_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(tenant_id, status);

CREATE TRIGGER trg_email_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 7.3 email_sequences
-- --------------------------------------------------------------------------
CREATE TABLE email_sequences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    trigger_type    VARCHAR(100) NOT NULL,
    trigger_config  JSONB,
    stop_conditions JSONB,
    status          sequence_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_sequences_tenant ON email_sequences(tenant_id);

CREATE TRIGGER trg_email_sequences_updated_at
    BEFORE UPDATE ON email_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 7.4 email_sequence_steps
-- --------------------------------------------------------------------------
CREATE TABLE email_sequence_steps (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
    step_order  INT NOT NULL DEFAULT 0,
    delay_value INT NOT NULL DEFAULT 1,
    delay_unit  VARCHAR(10) NOT NULL DEFAULT 'days',
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    conditions  JSONB
);

CREATE INDEX idx_sequence_steps_sequence ON email_sequence_steps(sequence_id, step_order);

-- --------------------------------------------------------------------------
-- 7.5 email_sequence_enrollments
-- --------------------------------------------------------------------------
CREATE TABLE email_sequence_enrollments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id       UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
    contact_id        UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    current_step      INT NOT NULL DEFAULT 0,
    status            enrollment_status NOT NULL DEFAULT 'active',
    next_email_due_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sequence_id, contact_id)
);

CREATE INDEX idx_enrollments_due ON email_sequence_enrollments(next_email_due_at)
    WHERE status = 'active';

CREATE TRIGGER trg_enrollments_updated_at
    BEFORE UPDATE ON email_sequence_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 7.6 email_events
-- --------------------------------------------------------------------------
CREATE TABLE email_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    sequence_id UUID REFERENCES email_sequences(id) ON DELETE SET NULL,
    contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    event_type  email_event_type NOT NULL,
    event_data  JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_tenant ON email_events(tenant_id);
CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX idx_email_events_contact ON email_events(contact_id);
CREATE INDEX idx_email_events_occurred ON email_events(occurred_at);


-- ============================================================================
-- 8. SMS & WHATSAPP
-- ============================================================================

-- --------------------------------------------------------------------------
-- 8.1 sms_templates
-- --------------------------------------------------------------------------
CREATE TABLE sms_templates (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    content    TEXT NOT NULL,  -- 160 char SMS template
    variables  JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_templates_tenant ON sms_templates(tenant_id);

-- --------------------------------------------------------------------------
-- 8.2 sms_campaigns
-- --------------------------------------------------------------------------
CREATE TABLE sms_campaigns (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id      UUID NOT NULL REFERENCES sms_templates(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    audience_filters JSONB,
    status           campaign_status NOT NULL DEFAULT 'draft',
    scheduled_at     TIMESTAMPTZ,
    sent_at          TIMESTAMPTZ,
    stats            JSONB DEFAULT '{"sent":0,"delivered":0,"failed":0}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_campaigns_tenant ON sms_campaigns(tenant_id);

-- --------------------------------------------------------------------------
-- 8.3 sms_events
-- --------------------------------------------------------------------------
CREATE TABLE sms_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id         UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,
    contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    event_type          sms_event_type NOT NULL,
    provider_message_id VARCHAR(255),
    metadata            JSONB,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_events_tenant ON sms_events(tenant_id);
CREATE INDEX idx_sms_events_campaign ON sms_events(campaign_id);


-- ============================================================================
-- 9. WEB FORMS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 9.1 web_forms
-- --------------------------------------------------------------------------
CREATE TABLE web_forms (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(200) NOT NULL,
    fields            JSONB NOT NULL DEFAULT '[]',
    settings          JSONB DEFAULT '{}',  -- redirect_url, auto_response, notify_email
    pipeline_id       UUID REFERENCES pipelines(id) ON DELETE SET NULL,  -- auto-create deal
    status            VARCHAR(20) NOT NULL DEFAULT 'active',
    views_count       INT NOT NULL DEFAULT 0,
    submissions_count INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_web_forms_tenant ON web_forms(tenant_id);

CREATE TRIGGER trg_web_forms_updated_at
    BEFORE UPDATE ON web_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 9.2 web_form_submissions
-- --------------------------------------------------------------------------
CREATE TABLE web_form_submissions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id    UUID NOT NULL REFERENCES web_forms(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    data       JSONB NOT NULL DEFAULT '{}',
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,  -- created on submit
    deal_id    UUID REFERENCES deals(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_submissions_form ON web_form_submissions(form_id);
CREATE INDEX idx_form_submissions_tenant ON web_form_submissions(tenant_id);


-- ============================================================================
-- 10. BANKING
-- ============================================================================

-- --------------------------------------------------------------------------
-- 10.1 bank_connections
-- --------------------------------------------------------------------------
CREATE TABLE bank_connections (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider              VARCHAR(50) NOT NULL DEFAULT 'bridge',
    external_id           VARCHAR(255),
    bank_name             VARCHAR(255),
    status                bank_connection_status NOT NULL DEFAULT 'active',
    last_sync_at          TIMESTAMPTZ,
    credentials_encrypted TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_connections_tenant ON bank_connections(tenant_id);

CREATE TRIGGER trg_bank_connections_updated_at
    BEFORE UPDATE ON bank_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 10.2 bank_transactions
-- --------------------------------------------------------------------------
CREATE TABLE bank_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connection_id       UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    external_id         VARCHAR(255) NOT NULL UNIQUE,
    date                DATE NOT NULL,
    description         TEXT,
    amount              DECIMAL(12,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'EUR',
    category            VARCHAR(100),
    is_reconciled       BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_transactions_tenant ON bank_transactions(tenant_id);
CREATE INDEX idx_bank_transactions_connection ON bank_transactions(connection_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(tenant_id, date);
CREATE INDEX idx_bank_transactions_unreconciled ON bank_transactions(tenant_id)
    WHERE is_reconciled = FALSE;

-- --------------------------------------------------------------------------
-- 10.3 reconciliation_rules
-- --------------------------------------------------------------------------
CREATE TABLE reconciliation_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    match_criteria  JSONB NOT NULL,
    auto_reconcile  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_rules_tenant ON reconciliation_rules(tenant_id);


-- ============================================================================
-- 11. INTEGRATIONS & API
-- ============================================================================

-- --------------------------------------------------------------------------
-- 11.1 api_keys
-- --------------------------------------------------------------------------
CREATE TABLE api_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key_hash    VARCHAR(255) NOT NULL UNIQUE,
    prefix      VARCHAR(8) NOT NULL,
    scopes      JSONB NOT NULL DEFAULT '[]',
    last_used_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);

-- --------------------------------------------------------------------------
-- 11.2 webhooks
-- --------------------------------------------------------------------------
CREATE TABLE webhooks (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    events     TEXT[] NOT NULL,
    secret     VARCHAR(255) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);

CREATE TRIGGER trg_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 11.3 webhook_deliveries
-- --------------------------------------------------------------------------
CREATE TABLE webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    response_status INT,
    response_body   TEXT,
    attempts        INT NOT NULL DEFAULT 0,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(created_at)
    WHERE delivered_at IS NULL AND attempts < 5;

-- --------------------------------------------------------------------------
-- 11.4 integration_templates
-- --------------------------------------------------------------------------
CREATE TABLE integration_templates (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug          VARCHAR(100) NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    category      VARCHAR(100),
    logo_url      TEXT,
    config_schema JSONB,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- 11.5 tenant_integrations
-- --------------------------------------------------------------------------
CREATE TABLE tenant_integrations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id      UUID NOT NULL REFERENCES integration_templates(id) ON DELETE CASCADE,
    config_encrypted TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    installed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, template_id)
);

CREATE INDEX idx_tenant_integrations_tenant ON tenant_integrations(tenant_id);


-- ============================================================================
-- 12. ANALYTICS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 12.1 saved_reports
-- --------------------------------------------------------------------------
CREATE TABLE saved_reports (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    type       VARCHAR(100) NOT NULL,
    config     JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_tenant ON saved_reports(tenant_id);

CREATE TRIGGER trg_saved_reports_updated_at
    BEFORE UPDATE ON saved_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 12.2 scheduled_reports
-- --------------------------------------------------------------------------
CREATE TABLE scheduled_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id   UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
    frequency   VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    recipients  JSONB NOT NULL DEFAULT '[]',
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at)
    WHERE is_active = TRUE;


-- ============================================================================
-- 13. CLIENT PORTAL
-- ============================================================================

-- --------------------------------------------------------------------------
-- 13.1 client_portal_sessions
-- --------------------------------------------------------------------------
CREATE TABLE client_portal_sessions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_sessions_tenant ON client_portal_sessions(tenant_id);
CREATE INDEX idx_portal_sessions_contact ON client_portal_sessions(contact_id);
CREATE INDEX idx_portal_sessions_expires ON client_portal_sessions(expires_at);

-- --------------------------------------------------------------------------
-- 13.2 portal_messages
-- --------------------------------------------------------------------------
CREATE TABLE portal_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    direction  VARCHAR(3) NOT NULL CHECK (direction IN ('in', 'out')),
    content    TEXT NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_messages_tenant ON portal_messages(tenant_id);
CREATE INDEX idx_portal_messages_contact ON portal_messages(contact_id);
CREATE INDEX idx_portal_messages_unread ON portal_messages(contact_id)
    WHERE read_at IS NULL;

-- --------------------------------------------------------------------------
-- 13.3 portal_quote_requests
-- --------------------------------------------------------------------------
CREATE TABLE portal_quote_requests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    entity_id   UUID REFERENCES entities(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portal_quote_requests_tenant ON portal_quote_requests(tenant_id);
CREATE INDEX idx_portal_quote_requests_contact ON portal_quote_requests(contact_id);


-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Every tenant-scoped table gets RLS enabled with policies that filter on
-- the session variable `app.current_tenant_id`. This ensures complete
-- data isolation between tenants.
-- ============================================================================

-- Helper: list of all tenant-scoped tables and their tenant_id column.
-- We apply the same pattern to each one.

-- --------------------------------------------------------------------------
-- 14.1 users
-- --------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON users
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON users
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON users
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON users
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.2 contacts
-- --------------------------------------------------------------------------
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON contacts
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON contacts
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON contacts
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON contacts
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.3 tags
-- --------------------------------------------------------------------------
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON tags
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON tags
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON tags
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON tags
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.4 notes
-- --------------------------------------------------------------------------
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON notes
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON notes
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON notes
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON notes
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.5 files
-- --------------------------------------------------------------------------
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON files
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON files
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON files
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON files
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.6 audit_logs (tenant_id can be NULL for super_admin actions)
-- --------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON audit_logs
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY tenant_isolation_insert ON audit_logs
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::uuid
        OR tenant_id IS NULL
    );
CREATE POLICY tenant_isolation_update ON audit_logs
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON audit_logs
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.7 entities
-- --------------------------------------------------------------------------
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON entities
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON entities
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON entities
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON entities
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.8 orders
-- --------------------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON orders
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON orders
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON orders
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON orders
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.9 service_orders
-- --------------------------------------------------------------------------
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON service_orders
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON service_orders
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON service_orders
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON service_orders
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.10 resource_schedules
-- --------------------------------------------------------------------------
ALTER TABLE resource_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON resource_schedules
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON resource_schedules
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON resource_schedules
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON resource_schedules
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.11 inventory_items
-- --------------------------------------------------------------------------
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON inventory_items
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON inventory_items
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON inventory_items
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON inventory_items
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.12 inventory_movements
-- --------------------------------------------------------------------------
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON inventory_movements
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON inventory_movements
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON inventory_movements
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON inventory_movements
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.13 automated_reminders
-- --------------------------------------------------------------------------
ALTER TABLE automated_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON automated_reminders
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON automated_reminders
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON automated_reminders
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON automated_reminders
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.14 reviews
-- --------------------------------------------------------------------------
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON reviews
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON reviews
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON reviews
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON reviews
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.15 tenant_modules
-- --------------------------------------------------------------------------
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON tenant_modules
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON tenant_modules
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON tenant_modules
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON tenant_modules
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.16 usage_logs
-- --------------------------------------------------------------------------
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON usage_logs
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON usage_logs
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON usage_logs
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON usage_logs
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.17 pipelines
-- --------------------------------------------------------------------------
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON pipelines
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON pipelines
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON pipelines
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON pipelines
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.18 deals
-- --------------------------------------------------------------------------
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON deals
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON deals
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON deals
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON deals
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.19 revenue_forecasts
-- --------------------------------------------------------------------------
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON revenue_forecasts
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON revenue_forecasts
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON revenue_forecasts
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON revenue_forecasts
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.20 email_templates
-- --------------------------------------------------------------------------
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON email_templates
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON email_templates
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON email_templates
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON email_templates
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.21 email_campaigns
-- --------------------------------------------------------------------------
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON email_campaigns
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON email_campaigns
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON email_campaigns
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON email_campaigns
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.22 email_sequences
-- --------------------------------------------------------------------------
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON email_sequences
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON email_sequences
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON email_sequences
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON email_sequences
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.23 email_events
-- --------------------------------------------------------------------------
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON email_events
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON email_events
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON email_events
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON email_events
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.24 sms_templates
-- --------------------------------------------------------------------------
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON sms_templates
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON sms_templates
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON sms_templates
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON sms_templates
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.25 sms_campaigns
-- --------------------------------------------------------------------------
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON sms_campaigns
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON sms_campaigns
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON sms_campaigns
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON sms_campaigns
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.26 sms_events
-- --------------------------------------------------------------------------
ALTER TABLE sms_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON sms_events
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON sms_events
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON sms_events
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON sms_events
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.27 web_forms
-- --------------------------------------------------------------------------
ALTER TABLE web_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON web_forms
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON web_forms
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON web_forms
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON web_forms
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.28 web_form_submissions
-- --------------------------------------------------------------------------
ALTER TABLE web_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON web_form_submissions
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON web_form_submissions
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON web_form_submissions
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON web_form_submissions
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.29 bank_connections
-- --------------------------------------------------------------------------
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON bank_connections
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON bank_connections
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON bank_connections
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON bank_connections
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.30 bank_transactions
-- --------------------------------------------------------------------------
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON bank_transactions
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON bank_transactions
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON bank_transactions
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON bank_transactions
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.31 reconciliation_rules
-- --------------------------------------------------------------------------
ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON reconciliation_rules
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON reconciliation_rules
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON reconciliation_rules
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON reconciliation_rules
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.32 api_keys
-- --------------------------------------------------------------------------
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON api_keys
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON api_keys
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON api_keys
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON api_keys
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.33 webhooks
-- --------------------------------------------------------------------------
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON webhooks
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON webhooks
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON webhooks
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON webhooks
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.34 tenant_integrations
-- --------------------------------------------------------------------------
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON tenant_integrations
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON tenant_integrations
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON tenant_integrations
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON tenant_integrations
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.35 saved_reports
-- --------------------------------------------------------------------------
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON saved_reports
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON saved_reports
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON saved_reports
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON saved_reports
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.36 client_portal_sessions
-- --------------------------------------------------------------------------
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON client_portal_sessions
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON client_portal_sessions
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON client_portal_sessions
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON client_portal_sessions
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.37 portal_messages
-- --------------------------------------------------------------------------
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON portal_messages
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON portal_messages
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON portal_messages
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON portal_messages
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- --------------------------------------------------------------------------
-- 14.38 portal_quote_requests
-- --------------------------------------------------------------------------
ALTER TABLE portal_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON portal_quote_requests
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_insert ON portal_quote_requests
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_update ON portal_quote_requests
    FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
               WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_delete ON portal_quote_requests
    FOR DELETE USING (tenant_id = current_setting('app.current_tenant_id')::uuid);


-- ============================================================================
-- 15. FINAL NOTES
-- ============================================================================
-- Tables WITHOUT tenant_id (platform-level, no RLS):
--   - tenants (the root table itself)
--   - modules (global module registry)
--   - feature_flags (global feature toggles)
--   - integration_templates (global integration catalog)
--   - order_items (secured via parent order's RLS + CASCADE)
--   - pipeline_stages (secured via parent pipeline's RLS + CASCADE)
--   - deal_activities (secured via parent deal's RLS + CASCADE)
--   - email_sequence_steps (secured via parent sequence's RLS + CASCADE)
--   - email_sequence_enrollments (secured via parent sequence's RLS + CASCADE)
--   - webhook_deliveries (secured via parent webhook's RLS + CASCADE)
--   - scheduled_reports (secured via parent report's RLS + CASCADE)
--
-- contact_tags is a join table secured by the RLS on both contacts and tags.
--
-- To use RLS, the application must set the tenant context before queries:
--   SELECT set_config('app.current_tenant_id', '<tenant-uuid>', true);
-- ============================================================================
