import { Request } from 'express';

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TenantAddress {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface TenantUsage {
  api_calls?: number;
  emails_sent?: number;
  sms_sent?: number;
  storage_mb?: number;
  [key: string]: number | undefined;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  siret: string | null;
  address: TenantAddress | null;
  phone: string | null;
  plan: TenantPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_credits: number;
  current_usage: TenantUsage;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'super_admin' | 'admin' | 'pro' | 'client';

export interface User {
  id: string;
  tenant_id: string;
  auth_provider_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export type ContactType = 'particulier' | 'entreprise';
export type PreferredChannel = 'whatsapp' | 'sms' | 'email';

export interface Contact {
  id: string;
  tenant_id: string;
  user_id: string | null;
  type: ContactType;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: TenantAddress | null;
  gdpr_consent: boolean;
  preferred_channel: PreferredChannel;
  whatsapp_number: string | null;
  reminder_enabled: boolean;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

export type EntityType =
  | 'vehicle'
  | 'room'
  | 'patient'
  | 'legal_case'
  | 'project'
  | 'appointment';

export interface Entity {
  id: string;
  tenant_id: string;
  contact_id: string;
  entity_type: EntityType;
  primary_identifier: string;
  secondary_identifier: string | null;
  name: string;
  metadata: Json;
  status: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Orders & billing
// ---------------------------------------------------------------------------

export type OrderType = 'quote' | 'invoice';
export type OrderStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  inventory_item_id: string | null;
  metadata: Json | null;
}

export interface Order {
  id: string;
  tenant_id: string;
  contact_id: string;
  entity_id: string | null;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  discount_amount: number;
  notes: string | null;
  valid_until: string | null;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Service orders
// ---------------------------------------------------------------------------

export interface ServiceOrder {
  id: string;
  tenant_id: string;
  order_id: string | null;
  entity_id: string;
  contact_id: string;
  order_type: string;
  status: string;
  assigned_user_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Resources & inventory
// ---------------------------------------------------------------------------

export interface ResourceSchedule {
  id: string;
  tenant_id: string;
  resource_type: string;
  resource_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  assigned_user_id: string | null;
  contact_id: string | null;
  entity_id: string | null;
  status: string;
  notes: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost_price: number | null;
  quantity_in_stock: number;
  reorder_threshold: number;
  unit: string;
  is_active: boolean;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'in' | 'out' | 'adjustment' | 'transfer';

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  inventory_item_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Reminders & reviews
// ---------------------------------------------------------------------------

export type ReminderChannel = 'whatsapp' | 'sms' | 'email';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface AutomatedReminder {
  id: string;
  tenant_id: string;
  contact_id: string;
  entity_id: string | null;
  service_order_id: string | null;
  channel: ReminderChannel;
  scheduled_at: string;
  sent_at: string | null;
  status: ReminderStatus;
  message_template: string;
  message_params: Json | null;
  created_at: string;
}

export interface Review {
  id: string;
  tenant_id: string;
  contact_id: string;
  entity_id: string | null;
  service_order_id: string | null;
  rating: number;
  comment: string | null;
  is_public: boolean;
  source: string;
  response: string | null;
  responded_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Tags, notes, audit
// ---------------------------------------------------------------------------

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  entity_type: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Modules & features
// ---------------------------------------------------------------------------

export interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  is_core: boolean;
  min_plan: TenantPlan;
  price_monthly: number | null;
  created_at: string;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_id: string;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
  config: Json | null;
}

export interface UsageLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  tenant_ids: string[] | null;
  plans: TenantPlan[] | null;
  percentage_rollout: number | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Pipeline & deals
// ---------------------------------------------------------------------------

export interface Pipeline {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string | null;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string;
  entity_id: string | null;
  title: string;
  value: number;
  currency: string;
  expected_close_date: string | null;
  assigned_user_id: string | null;
  probability: number;
  status: 'open' | 'won' | 'lost';
  lost_reason: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  activity_type: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface RevenueForecast {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  pipeline_id: string | null;
  expected_revenue: number;
  weighted_revenue: number;
  deal_count: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Email marketing
// ---------------------------------------------------------------------------

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export interface EmailCampaign {
  id: string;
  tenant_id: string;
  template_id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  unsubscribe_count: number;
  filter_criteria: Json | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSequence {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSequenceStep {
  id: string;
  sequence_id: string;
  template_id: string;
  position: number;
  delay_days: number;
  delay_hours: number;
  subject_override: string | null;
  is_active: boolean;
  created_at: string;
}

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'unsubscribed';

export interface EmailSequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  current_step: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  last_email_sent_at: string | null;
}

export type EmailEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';

export interface EmailEvent {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  sequence_id: string | null;
  contact_id: string;
  event_type: EmailEventType;
  metadata: Json | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// SMS marketing
// ---------------------------------------------------------------------------

export interface SmsTemplate {
  id: string;
  tenant_id: string;
  name: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmsCampaign {
  id: string;
  tenant_id: string;
  template_id: string;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  filter_criteria: Json | null;
  created_at: string;
  updated_at: string;
}

export type SmsEventType = 'sent' | 'delivered' | 'failed' | 'replied';

export interface SmsEvent {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  contact_id: string;
  event_type: SmsEventType;
  metadata: Json | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Web forms
// ---------------------------------------------------------------------------

export interface WebForm {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: Json;
  settings: Json | null;
  thank_you_message: string | null;
  redirect_url: string | null;
  is_active: boolean;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebFormSubmission {
  id: string;
  form_id: string;
  tenant_id: string;
  contact_id: string | null;
  data: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Banking
// ---------------------------------------------------------------------------

export interface BankConnection {
  id: string;
  tenant_id: string;
  provider: string;
  provider_connection_id: string;
  bank_name: string;
  status: 'active' | 'inactive' | 'error';
  last_sync_at: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  tenant_id: string;
  bank_connection_id: string;
  provider_transaction_id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  is_reconciled: boolean;
  reconciled_order_id: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface ReconciliationRule {
  id: string;
  tenant_id: string;
  name: string;
  match_field: string;
  match_pattern: string;
  match_type: 'exact' | 'contains' | 'regex';
  action: string;
  action_params: Json | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API & webhooks
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Webhook {
  id: string;
  tenant_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Json;
  response_status: number | null;
  response_body: string | null;
  duration_ms: number | null;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface SavedReport {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description: string | null;
  report_type: string;
  config: Json;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReport {
  id: string;
  report_id: string;
  tenant_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  last_sent_at: string | null;
  next_send_at: string;
  is_active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Client portal
// ---------------------------------------------------------------------------

export interface ClientPortalSession {
  id: string;
  tenant_id: string;
  contact_id: string;
  token_hash: string;
  expires_at: string;
  last_accessed_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PortalMessage {
  id: string;
  tenant_id: string;
  contact_id: string;
  user_id: string | null;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface PortalQuoteRequest {
  id: string;
  tenant_id: string;
  contact_id: string;
  entity_type: EntityType | null;
  description: string;
  attachments: string[];
  status: 'pending' | 'reviewed' | 'quoted' | 'accepted' | 'rejected';
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API response helpers
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ---------------------------------------------------------------------------
// Express extensions
// ---------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  user: User;
  tenant: Tenant;
}
