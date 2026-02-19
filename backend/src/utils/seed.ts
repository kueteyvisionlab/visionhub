import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase Admin Client (bypasses RLS with service_role key)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type InsertResult = { count: number; ids: string[] };

async function insert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<InsertResult> {
  const { data, error } = await supabase
    .from(table)
    .insert(rows as any)
    .select('id');

  if (error) {
    console.error(`  [ERROR] ${table}: ${error.message}`);
    return { count: 0, ids: [] };
  }
  return { count: data?.length ?? 0, ids: (data ?? []).map((r: any) => r.id) };
}

async function insertComposite<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<number> {
  const { error } = await supabase.from(table).insert(rows as any);
  if (error) {
    console.error(`  [ERROR] ${table}: ${error.message}`);
    return 0;
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
export async function seed(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  Vision CRM — Seed Data');
  console.log('='.repeat(70));
  console.log();

  const summary: Record<string, number> = {};
  const track = (label: string, count: number) => {
    summary[label] = (summary[label] ?? 0) + count;
  };

  // -----------------------------------------------------------------------
  // 0. Idempotency check
  // -----------------------------------------------------------------------
  console.log('[0/18] Checking idempotency...');
  const { data: existingTenants } = await supabase
    .from('tenants')
    .select('slug')
    .in('slug', ['garage-dupont', 'hotel-le-parisien']);

  if (existingTenants && existingTenants.length > 0) {
    console.log('  Seed data already exists. Skipping.');
    console.log('  Found tenants:', existingTenants.map((t: any) => t.slug).join(', '));
    console.log('  To re-seed, delete existing tenants first.');
    return;
  }

  // -----------------------------------------------------------------------
  // 1. Modules
  // -----------------------------------------------------------------------
  console.log('[1/18] Inserting modules...');
  const modulesRes = await insert('modules', [
    { slug: 'crm',        name: 'CRM',        description: 'Gestion des contacts, deals et pipeline', category: 'core', is_core: true },
    { slug: 'billing',    name: 'Facturation', description: 'Devis, factures et paiements',            category: 'core', is_core: true },
    { slug: 'garage',     name: 'Garage',      description: 'Gestion automobile: véhicules, réparations, pièces', category: 'vertical', is_core: false },
    { slug: 'hotel',      name: 'Hôtellerie',  description: 'Gestion hôtelière: chambres, réservations, housekeeping', category: 'vertical', is_core: false },
    { slug: 'restaurant', name: 'Restaurant',  description: 'Gestion de restaurant: tables, commandes, stocks', category: 'vertical', is_core: false },
    { slug: 'salon',      name: 'Salon',       description: 'Salon de coiffure / beauté: rendez-vous, prestations', category: 'vertical', is_core: false },
  ]);
  track('modules', modulesRes.count);
  const [modCrmId, modBillingId, modGarageId, modHotelId] = modulesRes.ids;

  // -----------------------------------------------------------------------
  // 2. Feature Flags
  // -----------------------------------------------------------------------
  console.log('[2/18] Inserting feature flags...');
  const ffRes = await insert('feature_flags', [
    { name: 'email_marketing', description: 'Campagnes email et séquences automatisées', is_enabled: true,  rollout_percentage: 100 },
    { name: 'pipeline_kanban', description: 'Vue Kanban du pipeline de ventes',          is_enabled: true,  rollout_percentage: 100 },
    { name: 'lead_scoring',    description: 'Scoring automatique des leads',             is_enabled: true,  rollout_percentage: 100 },
    { name: 'open_banking',    description: 'Connexion bancaire et rapprochement',       is_enabled: true,  rollout_percentage: 50  },
  ]);
  track('feature_flags', ffRes.count);

  // -----------------------------------------------------------------------
  // 3. Tenant 1 — Garage Dupont
  // -----------------------------------------------------------------------
  console.log('[3/18] Inserting Tenant 1: Garage Dupont...');
  const garageRes = await insert('tenants', [{
    name: 'Garage Dupont',
    slug: 'garage-dupont',
    siret: '12345678901234',
    address: { street: '12 rue de la Mécanique', city: 'Lyon', zip: '69003', country: 'FR' },
    phone: '+33472000001',
    plan: 'pro',
    monthly_credits: 500,
    current_usage: { contacts: 10, orders: 6, emails_sent: 0 },
  }]);
  track('tenants', garageRes.count);
  const garageTenantId = garageRes.ids[0];

  // -----------------------------------------------------------------------
  // 4. Tenant 2 — Hôtel Le Parisien
  // -----------------------------------------------------------------------
  console.log('[4/18] Inserting Tenant 2: Hôtel Le Parisien...');
  const hotelRes = await insert('tenants', [{
    name: 'Hôtel Le Parisien',
    slug: 'hotel-le-parisien',
    siret: '98765432109876',
    address: { street: '45 avenue des Champs', city: 'Paris', zip: '75008', country: 'FR' },
    phone: '+33142000001',
    plan: 'starter',
    monthly_credits: 200,
    current_usage: { contacts: 8, orders: 4, emails_sent: 0 },
  }]);
  track('tenants', hotelRes.count);
  const hotelTenantId = hotelRes.ids[0];

  // -----------------------------------------------------------------------
  // 5. Users
  // -----------------------------------------------------------------------
  console.log('[5/18] Inserting users...');
  const garageUsersRes = await insert('users', [
    { tenant_id: garageTenantId, email: 'marc@garage-dupont.fr',    full_name: 'Marc Dupont',   role: 'admin', is_active: true },
    { tenant_id: garageTenantId, email: 'julie@garage-dupont.fr',   full_name: 'Julie Martin',  role: 'pro',   is_active: true },
    { tenant_id: garageTenantId, email: 'thomas@garage-dupont.fr',  full_name: 'Thomas Petit',  role: 'pro',   is_active: true },
  ]);
  track('users', garageUsersRes.count);
  const [marcId, julieId, thomasId] = garageUsersRes.ids;

  const hotelUsersRes = await insert('users', [
    { tenant_id: hotelTenantId, email: 'sophie@hotel-parisien.fr', full_name: 'Sophie Laurent', role: 'admin', is_active: true },
    { tenant_id: hotelTenantId, email: 'pierre@hotel-parisien.fr', full_name: 'Pierre Moreau',  role: 'pro',   is_active: true },
  ]);
  track('users', hotelUsersRes.count);
  const [sophieId, pierreId] = hotelUsersRes.ids;

  // -----------------------------------------------------------------------
  // 6. Tenant Modules
  // -----------------------------------------------------------------------
  console.log('[6/18] Inserting tenant modules...');
  const tmRes1 = await insert('tenant_modules', [
    { tenant_id: garageTenantId, module_id: modCrmId,     is_enabled: true },
    { tenant_id: garageTenantId, module_id: modBillingId,  is_enabled: true },
    { tenant_id: garageTenantId, module_id: modGarageId,   is_enabled: true },
  ]);
  track('tenant_modules', tmRes1.count);

  const tmRes2 = await insert('tenant_modules', [
    { tenant_id: hotelTenantId, module_id: modCrmId,     is_enabled: true },
    { tenant_id: hotelTenantId, module_id: modBillingId,  is_enabled: true },
    { tenant_id: hotelTenantId, module_id: modHotelId,    is_enabled: true },
  ]);
  track('tenant_modules', tmRes2.count);

  // -----------------------------------------------------------------------
  // 7. Contacts
  // -----------------------------------------------------------------------
  console.log('[7/18] Inserting contacts...');

  // Garage contacts (10)
  const garageContactsRes = await insert('contacts', [
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Jean', last_name: 'Lefebvre',
      email: 'jean.lefebvre@email.fr', phone: '+33612345001',
      gdpr_consent: true, preferred_channel: 'email',
      address: { street: '8 rue Pasteur', city: 'Lyon', zip: '69001', country: 'FR' },
      notes: 'Client fidèle depuis 2019',
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Marie', last_name: 'Durand',
      email: 'marie.durand@gmail.com', phone: '+33612345002',
      gdpr_consent: true, preferred_channel: 'sms',
      address: { street: '22 avenue Jean Jaurès', city: 'Villeurbanne', zip: '69100', country: 'FR' },
    },
    {
      tenant_id: garageTenantId, type: 'entreprise',
      first_name: 'Alain', last_name: 'Martin',
      company_name: 'SARL Transports Martin',
      email: 'alain.martin@transports-martin.fr', phone: '+33472345003',
      gdpr_consent: true, preferred_channel: 'email',
      address: { street: '150 route de Vienne', city: 'Lyon', zip: '69008', country: 'FR' },
      notes: 'Flotte de 12 véhicules utilitaires',
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Claire', last_name: 'Bernard',
      email: 'claire.bernard@hotmail.fr', phone: '+33612345004',
      gdpr_consent: false, preferred_channel: 'email',
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Philippe', last_name: 'Robert',
      email: 'philippe.robert@email.fr', phone: '+33612345005',
      gdpr_consent: true, preferred_channel: 'whatsapp',
      whatsapp_number: '+33612345005',
      address: { street: '5 place Bellecour', city: 'Lyon', zip: '69002', country: 'FR' },
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Nathalie', last_name: 'Moreau',
      email: 'nathalie.moreau@orange.fr', phone: '+33612345006',
      gdpr_consent: true, preferred_channel: 'email',
    },
    {
      tenant_id: garageTenantId, type: 'entreprise',
      first_name: 'David', last_name: 'Garcia',
      company_name: 'Auto-École Garcia',
      email: 'david.garcia@ae-garcia.fr', phone: '+33472345007',
      gdpr_consent: true, preferred_channel: 'email',
      address: { street: '88 cours Gambetta', city: 'Lyon', zip: '69003', country: 'FR' },
      notes: 'Entretien de 5 véhicules auto-école',
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Sophie', last_name: 'Roux',
      email: 'sophie.roux@free.fr', phone: '+33612345008',
      gdpr_consent: false, preferred_channel: 'sms',
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'François', last_name: 'Blanc',
      email: 'francois.blanc@email.fr', phone: '+33612345009',
      gdpr_consent: true, preferred_channel: 'email',
      address: { street: '14 rue de la République', city: 'Lyon', zip: '69001', country: 'FR' },
    },
    {
      tenant_id: garageTenantId, type: 'particulier',
      first_name: 'Isabelle', last_name: 'Fournier',
      email: 'isabelle.fournier@gmail.com', phone: '+33612345010',
      gdpr_consent: true, preferred_channel: 'email',
      notes: 'Nouveau client — recommandé par Jean Lefebvre',
    },
  ]);
  track('contacts', garageContactsRes.count);
  const [
    jeanId, marieId, alainId, claireId, philippeId,
    nathalieId, davidId, sophieRId, francoisId, isabelleId,
  ] = garageContactsRes.ids;

  // Hotel contacts (8)
  const hotelContactsRes = await insert('contacts', [
    {
      tenant_id: hotelTenantId, type: 'particulier',
      first_name: 'Emma', last_name: 'Müller',
      email: 'emma.muller@web.de', phone: '+491701234567',
      gdpr_consent: true, preferred_channel: 'email',
      notes: 'Touriste allemande, séjour annuel',
    },
    {
      tenant_id: hotelTenantId, type: 'entreprise',
      first_name: 'Antoine', last_name: 'Leroy',
      company_name: 'Leroy Consulting SARL',
      email: 'antoine.leroy@leroy-consulting.fr', phone: '+33145678901',
      gdpr_consent: true, preferred_channel: 'email',
      address: { street: '10 rue de Rivoli', city: 'Paris', zip: '75001', country: 'FR' },
      notes: 'Client corporate — réservations régulières pour séminaires',
    },
    {
      tenant_id: hotelTenantId, type: 'particulier',
      first_name: 'John', last_name: 'Smith',
      email: 'john.smith@outlook.com', phone: '+447911123456',
      gdpr_consent: true, preferred_channel: 'email',
      notes: 'Touriste anglais, couple',
    },
    {
      tenant_id: hotelTenantId, type: 'particulier',
      first_name: 'Chloé', last_name: 'Girard',
      email: 'chloe.girard@gmail.com', phone: '+33678901234',
      gdpr_consent: true, preferred_channel: 'whatsapp',
      whatsapp_number: '+33678901234',
      address: { street: '3 rue Monge', city: 'Paris', zip: '75005', country: 'FR' },
      notes: 'Habituée — week-ends réguliers',
    },
    {
      tenant_id: hotelTenantId, type: 'entreprise',
      first_name: 'Marc', last_name: 'Dubois',
      company_name: 'EventPro SAS',
      email: 'marc.dubois@eventpro.fr', phone: '+33156789012',
      gdpr_consent: true, preferred_channel: 'email',
      address: { street: '25 boulevard Haussmann', city: 'Paris', zip: '75009', country: 'FR' },
      notes: 'Organisateur événements — mariage et séminaires',
    },
    {
      tenant_id: hotelTenantId, type: 'particulier',
      first_name: 'Yuki', last_name: 'Tanaka',
      email: 'yuki.tanaka@yahoo.co.jp', phone: '+819012345678',
      gdpr_consent: false, preferred_channel: 'email',
      notes: 'Touriste japonaise',
    },
    {
      tenant_id: hotelTenantId, type: 'particulier',
      first_name: 'Laurent', last_name: 'Petit',
      email: 'laurent.petit@sfr.fr', phone: '+33612340001',
      gdpr_consent: true, preferred_channel: 'sms',
    },
    {
      tenant_id: hotelTenantId, type: 'particulier',
      first_name: 'Camille', last_name: 'Dupuis',
      email: 'camille.dupuis@email.fr', phone: '+33612340002',
      gdpr_consent: true, preferred_channel: 'email',
      notes: 'Réservation groupe (anniversaire)',
    },
  ]);
  track('contacts', hotelContactsRes.count);
  const [
    emmaId, antoineId, johnId, chloeId,
    marcDId, yukiId, laurentPId, camilleId,
  ] = hotelContactsRes.ids;

  // -----------------------------------------------------------------------
  // 8. Tags
  // -----------------------------------------------------------------------
  console.log('[8/18] Inserting tags...');
  const garageTagsRes = await insert('tags', [
    { tenant_id: garageTenantId, name: 'VIP',                 color: '#eab308' },
    { tenant_id: garageTenantId, name: 'Flotte entreprise',   color: '#3b82f6' },
    { tenant_id: garageTenantId, name: 'Particulier fidèle',  color: '#10b981' },
    { tenant_id: garageTenantId, name: 'Nouveau client',      color: '#8b5cf6' },
  ]);
  track('tags', garageTagsRes.count);
  const [gTagVip, gTagFlotte, gTagFidele, gTagNouveau] = garageTagsRes.ids;

  const hotelTagsRes = await insert('tags', [
    { tenant_id: hotelTenantId, name: 'VIP',       color: '#eab308' },
    { tenant_id: hotelTenantId, name: 'Corporate', color: '#3b82f6' },
    { tenant_id: hotelTenantId, name: 'Touriste',  color: '#06b6d4' },
    { tenant_id: hotelTenantId, name: 'Habitué',   color: '#10b981' },
    { tenant_id: hotelTenantId, name: 'Groupe',    color: '#f97316' },
  ]);
  track('tags', hotelTagsRes.count);
  const [hTagVip, hTagCorp, hTagTouriste, hTagHabitue, hTagGroupe] = hotelTagsRes.ids;

  // -----------------------------------------------------------------------
  // 9. Contact Tags
  // -----------------------------------------------------------------------
  console.log('[9/18] Linking contacts to tags...');
  const ctCount = await insertComposite('contact_tags', [
    // Garage
    { contact_id: jeanId,      tag_id: gTagVip },
    { contact_id: jeanId,      tag_id: gTagFidele },
    { contact_id: alainId,     tag_id: gTagFlotte },
    { contact_id: davidId,     tag_id: gTagFlotte },
    { contact_id: philippeId,  tag_id: gTagFidele },
    { contact_id: isabelleId,  tag_id: gTagNouveau },
    { contact_id: claireId,    tag_id: gTagNouveau },
    // Hotel
    { contact_id: chloeId,    tag_id: hTagHabitue },
    { contact_id: chloeId,    tag_id: hTagVip },
    { contact_id: antoineId,  tag_id: hTagCorp },
    { contact_id: marcDId,    tag_id: hTagCorp },
    { contact_id: emmaId,     tag_id: hTagTouriste },
    { contact_id: johnId,     tag_id: hTagTouriste },
    { contact_id: yukiId,     tag_id: hTagTouriste },
    { contact_id: camilleId,  tag_id: hTagGroupe },
  ]);
  track('contact_tags', ctCount);

  // -----------------------------------------------------------------------
  // 10. Entities
  // -----------------------------------------------------------------------
  console.log('[10/18] Inserting entities...');

  // Garage entities — vehicles (8)
  const garageEntitiesRes = await insert('entities', [
    {
      tenant_id: garageTenantId, contact_id: jeanId, entity_type: 'vehicle',
      primary_identifier: 'AB-123-CD', secondary_identifier: 'VF1RFE00X12345678',
      name: 'Renault Clio 2020',
      metadata: { brand: 'Renault', model: 'Clio', year: 2020, fuel: 'essence', mileage: 45000, color: 'Blanc' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: marieId, entity_type: 'vehicle',
      primary_identifier: 'EF-456-GH', secondary_identifier: 'VF3LCBHZ6JS123456',
      name: 'Peugeot 308 2019',
      metadata: { brand: 'Peugeot', model: '308', year: 2019, fuel: 'diesel', mileage: 68000, color: 'Gris' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: philippeId, entity_type: 'vehicle',
      primary_identifier: 'IJ-789-KL', secondary_identifier: 'WBAPH5C55BA123456',
      name: 'BMW X3 2021',
      metadata: { brand: 'BMW', model: 'X3', year: 2021, fuel: 'diesel', mileage: 32000, color: 'Noir' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: claireId, entity_type: 'vehicle',
      primary_identifier: 'MN-012-OP', secondary_identifier: 'VF7SXHMZ6LT654321',
      name: 'Citroën C3 2018',
      metadata: { brand: 'Citroën', model: 'C3', year: 2018, fuel: 'essence', mileage: 78000, color: 'Rouge' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: alainId, entity_type: 'vehicle',
      primary_identifier: 'QR-345-ST', secondary_identifier: 'WDB9066331S789012',
      name: 'Mercedes Sprinter 2020',
      metadata: { brand: 'Mercedes', model: 'Sprinter', year: 2020, fuel: 'diesel', mileage: 120000, color: 'Blanc' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: nathalieId, entity_type: 'vehicle',
      primary_identifier: 'UV-678-WX', secondary_identifier: 'VNKKTUD32JA098765',
      name: 'Toyota Yaris 2022',
      metadata: { brand: 'Toyota', model: 'Yaris', year: 2022, fuel: 'hybride', mileage: 18000, color: 'Bleu' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: francoisId, entity_type: 'vehicle',
      primary_identifier: 'YZ-901-AB', secondary_identifier: 'WVWZZZ3CZWE456789',
      name: 'Volkswagen Golf 2020',
      metadata: { brand: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'essence', mileage: 55000, color: 'Gris' },
      status: 'active',
    },
    {
      tenant_id: garageTenantId, contact_id: davidId, entity_type: 'vehicle',
      primary_identifier: 'CD-234-EF', secondary_identifier: 'VF1RFB00X56789012',
      name: 'Renault Kangoo 2021',
      metadata: { brand: 'Renault', model: 'Kangoo', year: 2021, fuel: 'diesel', mileage: 42000, color: 'Blanc' },
      status: 'active',
    },
  ]);
  track('entities', garageEntitiesRes.count);
  const [
    clioId, peugeot308Id, bmwX3Id, citroenC3Id,
    sprinterId, yarisId, golfId, kangooId,
  ] = garageEntitiesRes.ids;

  // Hotel entities — rooms (6)
  const hotelEntitiesRes = await insert('entities', [
    {
      tenant_id: hotelTenantId, contact_id: emmaId, entity_type: 'room',
      primary_identifier: '101', name: 'Chambre 101',
      metadata: { type: 'Standard Double', floor: 1, capacity: 2, bed: '1 double', rate_per_night: 120, amenities: ['wifi', 'tv', 'minibar'] },
      status: 'active',
    },
    {
      tenant_id: hotelTenantId, contact_id: johnId, entity_type: 'room',
      primary_identifier: '102', name: 'Chambre 102',
      metadata: { type: 'Single', floor: 1, capacity: 1, bed: '1 simple', rate_per_night: 89, amenities: ['wifi', 'tv'] },
      status: 'active',
    },
    {
      tenant_id: hotelTenantId, contact_id: chloeId, entity_type: 'room',
      primary_identifier: '201', name: 'Chambre 201',
      metadata: { type: 'Supérieure', floor: 2, capacity: 2, bed: '1 king', rate_per_night: 180, amenities: ['wifi', 'tv', 'minibar', 'balcon', 'vue ville'] },
      status: 'active',
    },
    {
      tenant_id: hotelTenantId, contact_id: laurentPId, entity_type: 'room',
      primary_identifier: '202', name: 'Chambre 202',
      metadata: { type: 'Standard Double', floor: 2, capacity: 2, bed: '2 simples', rate_per_night: 120, amenities: ['wifi', 'tv', 'minibar'] },
      status: 'active',
    },
    {
      tenant_id: hotelTenantId, contact_id: antoineId, entity_type: 'room',
      primary_identifier: '301', name: 'Suite 301',
      metadata: { type: 'Suite Deluxe', floor: 3, capacity: 4, bed: '1 king + 1 canapé-lit', rate_per_night: 380, amenities: ['wifi', 'tv', 'minibar', 'jacuzzi', 'terrasse', 'vue mer', 'room service'] },
      status: 'active',
    },
    {
      tenant_id: hotelTenantId, contact_id: camilleId, entity_type: 'room',
      primary_identifier: '302', name: 'Suite Junior 302',
      metadata: { type: 'Suite Junior', floor: 3, capacity: 3, bed: '1 king', rate_per_night: 260, amenities: ['wifi', 'tv', 'minibar', 'balcon', 'vue ville'] },
      status: 'active',
    },
  ]);
  track('entities', hotelEntitiesRes.count);
  const [room101Id, room102Id, room201Id, room202Id, suite301Id, suite302Id] = hotelEntitiesRes.ids;

  // -----------------------------------------------------------------------
  // 11. Pipelines + Stages
  // -----------------------------------------------------------------------
  console.log('[11/18] Inserting pipelines and stages...');

  const garagePipeRes = await insert('pipelines', [
    { tenant_id: garageTenantId, name: 'Ventes & Réparations', is_default: true },
  ]);
  track('pipelines', garagePipeRes.count);
  const garagePipelineId = garagePipeRes.ids[0];

  const garageStagesRes = await insert('pipeline_stages', [
    { pipeline_id: garagePipelineId, name: 'Prospect',       display_order: 0, probability: 10,  color: '#94a3b8', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: garagePipelineId, name: 'Devis envoyé',   display_order: 1, probability: 30,  color: '#3b82f6', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: garagePipelineId, name: 'Négociation',    display_order: 2, probability: 60,  color: '#f59e0b', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: garagePipelineId, name: 'Signé',          display_order: 3, probability: 90,  color: '#10b981', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: garagePipelineId, name: 'Gagné',          display_order: 4, probability: 100, color: '#059669', is_closed_won: true,  is_closed_lost: false },
    { pipeline_id: garagePipelineId, name: 'Perdu',          display_order: 5, probability: 0,   color: '#ef4444', is_closed_won: false, is_closed_lost: true  },
  ]);
  track('pipeline_stages', garageStagesRes.count);
  const [gsProspect, gsDevisEnvoye, gsNego, gsSigne, gsGagne, gsPerdu] = garageStagesRes.ids;

  const hotelPipeRes = await insert('pipelines', [
    { tenant_id: hotelTenantId, name: 'Réservations Groupe', is_default: true },
  ]);
  track('pipelines', hotelPipeRes.count);
  const hotelPipelineId = hotelPipeRes.ids[0];

  const hotelStagesRes = await insert('pipeline_stages', [
    { pipeline_id: hotelPipelineId, name: 'Demande reçue',        display_order: 0, probability: 10,  color: '#94a3b8', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: hotelPipelineId, name: 'Proposition envoyée',  display_order: 1, probability: 40,  color: '#3b82f6', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: hotelPipelineId, name: 'Confirmé',             display_order: 2, probability: 80,  color: '#10b981', is_closed_won: false, is_closed_lost: false },
    { pipeline_id: hotelPipelineId, name: 'Facturé',              display_order: 3, probability: 100, color: '#059669', is_closed_won: true,  is_closed_lost: false },
    { pipeline_id: hotelPipelineId, name: 'Annulé',               display_order: 4, probability: 0,   color: '#ef4444', is_closed_won: false, is_closed_lost: true  },
  ]);
  track('pipeline_stages', hotelStagesRes.count);
  const [hsDemande, hsProposition, hsConfirme, hsFacture, hsAnnule] = hotelStagesRes.ids;

  // -----------------------------------------------------------------------
  // 12. Orders + Order Items
  // -----------------------------------------------------------------------
  console.log('[12/18] Inserting orders and order items...');

  // -- Garage orders (6)
  const garageOrdersRes = await insert('orders', [
    {
      tenant_id: garageTenantId, contact_id: jeanId, entity_id: clioId,
      order_number: 'DEV-2026-001', type: 'quote', status: 'draft',
      subtotal: 74.92, tax_rate: 20.00, tax_amount: 14.98, total: 89.90,
      notes: 'Vidange + filtre à huile', valid_until: '2026-03-15',
      created_by: marcId,
    },
    {
      tenant_id: garageTenantId, contact_id: marieId, entity_id: peugeot308Id,
      order_number: 'DEV-2026-002', type: 'quote', status: 'sent',
      subtotal: 375.00, tax_rate: 20.00, tax_amount: 75.00, total: 450.00,
      notes: 'Remplacement plaquettes et disques avant', valid_until: '2026-03-20',
      created_by: julieId,
    },
    {
      tenant_id: garageTenantId, contact_id: philippeId, entity_id: bmwX3Id,
      order_number: 'FAC-2026-001', type: 'invoice', status: 'paid',
      subtotal: 266.67, tax_rate: 20.00, tax_amount: 53.33, total: 320.00,
      notes: 'Révision complète 30 000 km', paid_at: '2026-01-20T14:30:00Z',
      created_by: marcId,
    },
    {
      tenant_id: garageTenantId, contact_id: claireId, entity_id: citroenC3Id,
      order_number: 'DEV-2026-003', type: 'quote', status: 'accepted',
      subtotal: 1000.00, tax_rate: 20.00, tax_amount: 200.00, total: 1200.00,
      notes: 'Réparation carrosserie aile avant droite', valid_until: '2026-04-01',
      created_by: thomasId,
    },
    {
      tenant_id: garageTenantId, contact_id: alainId, entity_id: sprinterId,
      order_number: 'FAC-2026-002', type: 'invoice', status: 'paid',
      subtotal: 741.67, tax_rate: 20.00, tax_amount: 148.33, total: 890.00,
      notes: 'Remplacement 4 pneus utilitaire', paid_at: '2026-02-05T10:00:00Z',
      created_by: julieId,
    },
    {
      tenant_id: garageTenantId, contact_id: jeanId, entity_id: clioId,
      order_number: 'DEV-2026-004', type: 'quote', status: 'rejected',
      subtotal: 54.17, tax_rate: 20.00, tax_amount: 10.83, total: 65.00,
      notes: 'Diagnostic électronique', valid_until: '2026-02-28',
      created_by: thomasId,
    },
  ]);
  track('orders', garageOrdersRes.count);
  const [
    ordVidangeId, ordFreinsId, ordRevisionId,
    ordCarrosserieId, ordPneusId, ordDiagnosticId,
  ] = garageOrdersRes.ids;

  // -- Hotel orders (4)
  const hotelOrdersRes = await insert('orders', [
    {
      tenant_id: hotelTenantId, contact_id: antoineId, entity_id: suite301Id,
      order_number: 'DEV-H-2026-001', type: 'quote', status: 'sent',
      subtotal: 3750.00, tax_rate: 20.00, tax_amount: 750.00, total: 4500.00,
      notes: 'Séminaire 2 jours — 15 participants, salle + hébergement', valid_until: '2026-04-15',
      created_by: sophieId,
    },
    {
      tenant_id: hotelTenantId, contact_id: chloeId, entity_id: suite301Id,
      order_number: 'FAC-H-2026-001', type: 'invoice', status: 'paid',
      subtotal: 741.67, tax_rate: 20.00, tax_amount: 148.33, total: 890.00,
      notes: 'Séjour Suite Deluxe — 2 nuits', paid_at: '2026-01-28T16:00:00Z',
      created_by: pierreId,
    },
    {
      tenant_id: hotelTenantId, contact_id: marcDId, entity_id: suite302Id,
      order_number: 'DEV-H-2026-002', type: 'quote', status: 'draft',
      subtotal: 10000.00, tax_rate: 20.00, tax_amount: 2000.00, total: 12000.00,
      notes: 'Package mariage — réception + hébergement 30 invités', valid_until: '2026-06-30',
      created_by: sophieId,
    },
    {
      tenant_id: hotelTenantId, contact_id: laurentPId, entity_id: room202Id,
      order_number: 'FAC-H-2026-002', type: 'invoice', status: 'paid',
      subtotal: 125.00, tax_rate: 20.00, tax_amount: 25.00, total: 150.00,
      notes: 'Nuitée Standard Double', paid_at: '2026-02-10T11:00:00Z',
      created_by: pierreId,
    },
  ]);
  track('orders', hotelOrdersRes.count);
  const [ordSeminaireId, ordSuiteSejourId, ordMariageId, ordNuiteeId] = hotelOrdersRes.ids;

  // -- Order Items
  console.log('  Inserting order items...');

  const orderItemsRes = await insert('order_items', [
    // Vidange Clio
    { order_id: ordVidangeId, description: 'Huile moteur 5W30 (5L)',        quantity: 1, unit_price: 42.00, tax_rate: 20.00, total: 42.00, sort_order: 0 },
    { order_id: ordVidangeId, description: 'Filtre à huile',                quantity: 1, unit_price: 12.92, tax_rate: 20.00, total: 12.92, sort_order: 1 },
    { order_id: ordVidangeId, description: 'Main d\'oeuvre vidange',         quantity: 1, unit_price: 20.00, tax_rate: 20.00, total: 20.00, sort_order: 2 },
    // Freins 308
    { order_id: ordFreinsId, description: 'Plaquettes de frein avant',      quantity: 1, unit_price: 85.00,  tax_rate: 20.00, total: 85.00,  sort_order: 0 },
    { order_id: ordFreinsId, description: 'Disques de frein avant (x2)',    quantity: 2, unit_price: 95.00,  tax_rate: 20.00, total: 190.00, sort_order: 1 },
    { order_id: ordFreinsId, description: 'Main d\'oeuvre freinage',        quantity: 1, unit_price: 100.00, tax_rate: 20.00, total: 100.00, sort_order: 2 },
    // Révision X3
    { order_id: ordRevisionId, description: 'Kit révision BMW X3',          quantity: 1, unit_price: 180.00, tax_rate: 20.00, total: 180.00, sort_order: 0 },
    { order_id: ordRevisionId, description: 'Main d\'oeuvre révision',      quantity: 2, unit_price: 43.33,  tax_rate: 20.00, total: 86.67,  sort_order: 1 },
    // Carrosserie C3
    { order_id: ordCarrosserieId, description: 'Aile avant droite Citroën C3', quantity: 1, unit_price: 350.00, tax_rate: 20.00, total: 350.00, sort_order: 0 },
    { order_id: ordCarrosserieId, description: 'Peinture et vernis',           quantity: 1, unit_price: 280.00, tax_rate: 20.00, total: 280.00, sort_order: 1 },
    { order_id: ordCarrosserieId, description: 'Main d\'oeuvre carrosserie',   quantity: 1, unit_price: 370.00, tax_rate: 20.00, total: 370.00, sort_order: 2 },
    // Pneus Sprinter
    { order_id: ordPneusId, description: 'Pneu utilitaire 225/75 R16 (x4)',  quantity: 4, unit_price: 145.00, tax_rate: 20.00, total: 580.00, sort_order: 0 },
    { order_id: ordPneusId, description: 'Montage + équilibrage (x4)',       quantity: 4, unit_price: 25.00,  tax_rate: 20.00, total: 100.00, sort_order: 1 },
    { order_id: ordPneusId, description: 'Géométrie',                        quantity: 1, unit_price: 61.67,  tax_rate: 20.00, total: 61.67,  sort_order: 2 },
    // Diagnostic Clio
    { order_id: ordDiagnosticId, description: 'Diagnostic électronique complet', quantity: 1, unit_price: 54.17, tax_rate: 20.00, total: 54.17, sort_order: 0 },
    // Séminaire
    { order_id: ordSeminaireId, description: 'Location salle conférence (2 jours)',  quantity: 2, unit_price: 500.00, tax_rate: 20.00, total: 1000.00, sort_order: 0 },
    { order_id: ordSeminaireId, description: 'Hébergement chambre standard (x15)',   quantity: 15, unit_price: 120.00, tax_rate: 20.00, total: 1800.00, sort_order: 1 },
    { order_id: ordSeminaireId, description: 'Pause café + déjeuner (x15, 2 jours)', quantity: 30, unit_price: 25.00, tax_rate: 20.00, total: 750.00, sort_order: 2 },
    { order_id: ordSeminaireId, description: 'Vidéoprojecteur + paperboard',          quantity: 1, unit_price: 200.00, tax_rate: 20.00, total: 200.00, sort_order: 3 },
    // Suite séjour
    { order_id: ordSuiteSejourId, description: 'Suite Deluxe (2 nuits)',    quantity: 2, unit_price: 380.00, tax_rate: 20.00, total: 760.00, sort_order: 0 },
    { order_id: ordSuiteSejourId, description: 'Petit-déjeuner buffet',    quantity: 2, unit_price: -9.17,  tax_rate: 20.00, total: -18.33, sort_order: 1 }, // included
    // Mariage
    { order_id: ordMariageId, description: 'Location salle réception',              quantity: 1,  unit_price: 3000.00, tax_rate: 20.00, total: 3000.00, sort_order: 0 },
    { order_id: ordMariageId, description: 'Hébergement invités (30 chambres)',      quantity: 30, unit_price: 120.00,  tax_rate: 20.00, total: 3600.00, sort_order: 1 },
    { order_id: ordMariageId, description: 'Menu mariage (80 couverts)',             quantity: 80, unit_price: 35.00,   tax_rate: 20.00, total: 2800.00, sort_order: 2 },
    { order_id: ordMariageId, description: 'Décoration florale salle',              quantity: 1,  unit_price: 600.00,  tax_rate: 20.00, total: 600.00,  sort_order: 3 },
    // Nuitée
    { order_id: ordNuiteeId, description: 'Standard Double (1 nuit)',      quantity: 1, unit_price: 120.00, tax_rate: 20.00, total: 120.00, sort_order: 0 },
    { order_id: ordNuiteeId, description: 'Taxe de séjour',               quantity: 1, unit_price: 5.00,   tax_rate: 20.00, total: 5.00,   sort_order: 1 },
  ]);
  track('order_items', orderItemsRes.count);

  // -----------------------------------------------------------------------
  // 13. Deals
  // -----------------------------------------------------------------------
  console.log('[13/18] Inserting deals...');

  const garageDealsRes = await insert('deals', [
    {
      tenant_id: garageTenantId, pipeline_id: garagePipelineId, stage_id: gsDevisEnvoye,
      name: 'Freins Peugeot 308 — Marie Durand', contact_id: marieId, order_id: ordFreinsId,
      amount: 450.00, lead_score: 65, score_breakdown: { engagement: 20, budget: 25, urgency: 20 },
      owner_user_id: julieId, status: 'open', expected_close_date: '2026-03-10',
    },
    {
      tenant_id: garageTenantId, pipeline_id: garagePipelineId, stage_id: gsGagne,
      name: 'Révision BMW X3 — Philippe Robert', contact_id: philippeId, order_id: ordRevisionId,
      amount: 320.00, lead_score: 90, score_breakdown: { engagement: 30, budget: 30, urgency: 30 },
      owner_user_id: marcId, status: 'won', expected_close_date: '2026-01-20',
    },
    {
      tenant_id: garageTenantId, pipeline_id: garagePipelineId, stage_id: gsNego,
      name: 'Carrosserie C3 — Claire Bernard', contact_id: claireId, order_id: ordCarrosserieId,
      amount: 1200.00, lead_score: 55, score_breakdown: { engagement: 15, budget: 20, urgency: 20 },
      owner_user_id: thomasId, status: 'open', expected_close_date: '2026-03-25',
    },
    {
      tenant_id: garageTenantId, pipeline_id: garagePipelineId, stage_id: gsGagne,
      name: 'Pneus Sprinter — Transports Martin', contact_id: alainId, order_id: ordPneusId,
      amount: 890.00, lead_score: 85, score_breakdown: { engagement: 30, budget: 25, urgency: 30 },
      owner_user_id: julieId, status: 'won', expected_close_date: '2026-02-05',
    },
    {
      tenant_id: garageTenantId, pipeline_id: garagePipelineId, stage_id: gsPerdu,
      name: 'Diagnostic Clio — Jean Lefebvre', contact_id: jeanId, order_id: ordDiagnosticId,
      amount: 65.00, lead_score: 30, score_breakdown: { engagement: 10, budget: 10, urgency: 10 },
      owner_user_id: thomasId, status: 'lost', expected_close_date: '2026-02-15',
    },
  ]);
  track('deals', garageDealsRes.count);

  const hotelDealsRes = await insert('deals', [
    {
      tenant_id: hotelTenantId, pipeline_id: hotelPipelineId, stage_id: hsProposition,
      name: 'Séminaire Leroy Consulting', contact_id: antoineId, order_id: ordSeminaireId,
      amount: 4500.00, lead_score: 70, score_breakdown: { engagement: 25, budget: 25, urgency: 20 },
      owner_user_id: sophieId, status: 'open', expected_close_date: '2026-04-01',
    },
    {
      tenant_id: hotelTenantId, pipeline_id: hotelPipelineId, stage_id: hsDemande,
      name: 'Mariage Dubois — EventPro', contact_id: marcDId, order_id: ordMariageId,
      amount: 12000.00, lead_score: 45, score_breakdown: { engagement: 15, budget: 15, urgency: 15 },
      owner_user_id: sophieId, status: 'open', expected_close_date: '2026-06-15',
    },
    {
      tenant_id: hotelTenantId, pipeline_id: hotelPipelineId, stage_id: hsFacture,
      name: 'Séjour Suite — Chloé Girard', contact_id: chloeId, order_id: ordSuiteSejourId,
      amount: 890.00, lead_score: 95, score_breakdown: { engagement: 35, budget: 30, urgency: 30 },
      owner_user_id: pierreId, status: 'won', expected_close_date: '2026-01-28',
    },
  ]);
  track('deals', hotelDealsRes.count);

  // -----------------------------------------------------------------------
  // 14. Service Orders
  // -----------------------------------------------------------------------
  console.log('[14/18] Inserting service orders...');

  const garageSORes = await insert('service_orders', [
    {
      tenant_id: garageTenantId, contact_id: marieId, entity_id: peugeot308Id, order_id: ordFreinsId,
      type: 'repair', status: 'scheduled', description: 'Remplacement plaquettes et disques de frein avant',
      scheduled_start: '2026-03-01T08:00:00Z', scheduled_end: '2026-03-01T12:00:00Z',
      assigned_to: thomasId, notes: 'Pièces commandées — livraison prévue 28/02',
      metadata: { bay: 2, priority: 'normal' },
      created_by: julieId,
    },
    {
      tenant_id: garageTenantId, contact_id: philippeId, entity_id: bmwX3Id, order_id: ordRevisionId,
      type: 'repair', status: 'completed', description: 'Révision complète 30 000 km',
      scheduled_start: '2026-01-18T09:00:00Z', scheduled_end: '2026-01-18T17:00:00Z',
      actual_start: '2026-01-18T09:15:00Z', actual_end: '2026-01-18T16:30:00Z',
      assigned_to: marcId, notes: 'RAS — véhicule en bon état',
      metadata: { bay: 1, priority: 'normal' },
      created_by: marcId,
    },
    {
      tenant_id: garageTenantId, contact_id: claireId, entity_id: citroenC3Id, order_id: ordCarrosserieId,
      type: 'repair', status: 'in_progress', description: 'Réparation carrosserie aile avant droite',
      scheduled_start: '2026-02-17T08:00:00Z', scheduled_end: '2026-02-19T18:00:00Z',
      actual_start: '2026-02-17T08:30:00Z',
      assigned_to: thomasId, notes: 'Peinture en cours de séchage',
      metadata: { bay: 3, priority: 'normal' },
      created_by: thomasId,
    },
    {
      tenant_id: garageTenantId, contact_id: alainId, entity_id: sprinterId, order_id: ordPneusId,
      type: 'repair', status: 'billed', description: 'Remplacement 4 pneus + géométrie',
      scheduled_start: '2026-02-04T14:00:00Z', scheduled_end: '2026-02-04T17:00:00Z',
      actual_start: '2026-02-04T14:00:00Z', actual_end: '2026-02-04T16:45:00Z',
      assigned_to: julieId, notes: 'Géométrie dans les normes après intervention',
      metadata: { bay: 2, priority: 'high' },
      created_by: julieId,
    },
  ]);
  track('service_orders', garageSORes.count);

  const hotelSORes = await insert('service_orders', [
    {
      tenant_id: hotelTenantId, contact_id: chloeId, entity_id: room201Id,
      type: 'cleaning', status: 'completed', description: 'Nettoyage complet chambre 201 après départ',
      scheduled_start: '2026-01-30T10:00:00Z', scheduled_end: '2026-01-30T11:30:00Z',
      actual_start: '2026-01-30T10:05:00Z', actual_end: '2026-01-30T11:20:00Z',
      assigned_to: pierreId, notes: 'Remplacement draps et serviettes',
      metadata: { checklist: ['draps', 'serviettes', 'minibar', 'aspirateur', 'salle de bain'] },
      created_by: sophieId,
    },
    {
      tenant_id: hotelTenantId, contact_id: emmaId, entity_id: room101Id,
      type: 'cleaning', status: 'scheduled', description: 'Préparation chambre 101 — arrivée touriste',
      scheduled_start: '2026-02-20T14:00:00Z', scheduled_end: '2026-02-20T15:00:00Z',
      assigned_to: pierreId, notes: 'Demande extra: oreiller hypoallergénique',
      metadata: { checklist: ['draps', 'serviettes', 'minibar', 'aspirateur', 'salle de bain', 'oreiller spécial'] },
      created_by: sophieId,
    },
    {
      tenant_id: hotelTenantId, contact_id: laurentPId, entity_id: room202Id,
      type: 'cleaning', status: 'in_progress', description: 'Nettoyage chambre 202',
      scheduled_start: '2026-02-19T10:00:00Z', scheduled_end: '2026-02-19T11:00:00Z',
      actual_start: '2026-02-19T10:10:00Z',
      assigned_to: pierreId,
      metadata: { checklist: ['draps', 'serviettes', 'minibar', 'aspirateur', 'salle de bain'] },
      created_by: pierreId,
    },
  ]);
  track('service_orders', hotelSORes.count);

  // -----------------------------------------------------------------------
  // 15. Email Templates
  // -----------------------------------------------------------------------
  console.log('[15/18] Inserting email templates...');

  const garageTemplatesRes = await insert('email_templates', [
    {
      tenant_id: garageTenantId,
      name: 'Rappel vidange',
      subject: '{{first_name}}, votre vidange approche !',
      html_body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#1e3a5f">Bonjour {{first_name}} !</h2>
  <p>D'après nos dossiers, votre <strong>{{vehicle_name}}</strong> ({{plate}}) approche des <strong>{{next_mileage}} km</strong>.</p>
  <p>Il est temps de planifier votre prochaine vidange pour garder votre moteur en pleine forme.</p>
  <p><a href="{{booking_url}}" style="background:#1e3a5f;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Prendre rendez-vous</a></p>
  <p style="color:#666;font-size:12px">Garage Dupont — 12 rue de la Mécanique, 69003 Lyon<br>Tél. : 04 72 00 00 01</p>
</div>`,
      json_structure: { variables: ['first_name', 'vehicle_name', 'plate', 'next_mileage', 'booking_url'] },
      category: 'maintenance',
    },
    {
      tenant_id: garageTenantId,
      name: 'Promo pneus hiver',
      subject: 'Offre spéciale pneus hiver — jusqu\'à -20% !',
      html_body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#1e3a5f">L'hiver arrive, {{first_name}} !</h2>
  <p>Profitez de notre offre spéciale sur les pneus hiver :</p>
  <ul>
    <li><strong>-20%</strong> sur les pneus Michelin Alpin</li>
    <li><strong>Montage offert</strong> pour tout jeu de 4 pneus</li>
    <li>Offre valable jusqu'au <strong>{{end_date}}</strong></li>
  </ul>
  <p><a href="{{promo_url}}" style="background:#e63946;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Voir l'offre</a></p>
  <p style="color:#666;font-size:12px">Garage Dupont — 12 rue de la Mécanique, 69003 Lyon</p>
</div>`,
      json_structure: { variables: ['first_name', 'end_date', 'promo_url'] },
      category: 'promotion',
    },
  ]);
  track('email_templates', garageTemplatesRes.count);

  const hotelTemplatesRes = await insert('email_templates', [
    {
      tenant_id: hotelTenantId,
      name: 'Confirmation réservation',
      subject: 'Confirmation de votre réservation — Hôtel Le Parisien',
      html_body: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto">
  <h2 style="color:#2c3e50">Bonjour {{first_name}},</h2>
  <p>Nous avons le plaisir de confirmer votre réservation :</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Chambre</strong></td><td style="padding:8px;border-bottom:1px solid #eee">{{room_name}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Arrivée</strong></td><td style="padding:8px;border-bottom:1px solid #eee">{{check_in}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Départ</strong></td><td style="padding:8px;border-bottom:1px solid #eee">{{check_out}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Total</strong></td><td style="padding:8px;border-bottom:1px solid #eee">{{total}} EUR</td></tr>
  </table>
  <p>N'hésitez pas à nous contacter pour toute demande particulière.</p>
  <p>À très bientôt,<br><em>L'équipe de l'Hôtel Le Parisien</em></p>
  <p style="color:#999;font-size:12px">45 avenue des Champs, 75008 Paris — Tél. : 01 42 00 00 01</p>
</div>`,
      json_structure: { variables: ['first_name', 'room_name', 'check_in', 'check_out', 'total'] },
      category: 'transactional',
    },
    {
      tenant_id: hotelTenantId,
      name: 'Offre week-end',
      subject: '{{first_name}}, escapade week-end à -30% !',
      html_body: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto">
  <h2 style="color:#2c3e50">Un week-end d'exception vous attend</h2>
  <p>Cher(e) {{first_name}},</p>
  <p>Profitez de notre offre exclusive :</p>
  <ul>
    <li><strong>-30%</strong> sur les chambres Supérieures et Suites</li>
    <li><strong>Petit-déjeuner offert</strong></li>
    <li>Late check-out <strong>14h</strong></li>
  </ul>
  <p>Valable les week-ends de {{month}}, sous réserve de disponibilité.</p>
  <p><a href="{{booking_url}}" style="background:#2c3e50;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Réserver maintenant</a></p>
  <p style="color:#999;font-size:12px">Hôtel Le Parisien — 45 avenue des Champs, 75008 Paris</p>
</div>`,
      json_structure: { variables: ['first_name', 'month', 'booking_url'] },
      category: 'promotion',
    },
  ]);
  track('email_templates', hotelTemplatesRes.count);

  // -----------------------------------------------------------------------
  // 16. Notes
  // -----------------------------------------------------------------------
  console.log('[16/18] Inserting notes...');

  const notesRes = await insert('notes', [
    // Garage
    { tenant_id: garageTenantId, contact_id: jeanId, user_id: marcId, content: 'Jean est un client de longue date. Toujours ponctuel à ses RDV. Préfère être rappelé le matin.' },
    { tenant_id: garageTenantId, contact_id: alainId, user_id: julieId, content: 'Flotte Transports Martin : vérifier contrat annuel d\'entretien. Renouvellement prévu en mai 2026.' },
    { tenant_id: garageTenantId, contact_id: claireId, user_id: thomasId, content: 'Claire hésite entre réparation et remplacement du véhicule. Lui proposer un devis comparatif.' },
    { tenant_id: garageTenantId, contact_id: philippeId, user_id: marcId, content: 'Philippe souhaite passer au full électrique. Lui envoyer des infos sur les entretiens VE.' },
    // Hotel
    { tenant_id: hotelTenantId, contact_id: chloeId, user_id: sophieId, content: 'Chloé préfère la chambre 201 avec vue ville. Toujours réserver en priorité si dispo.' },
    { tenant_id: hotelTenantId, contact_id: antoineId, user_id: sophieId, content: 'Leroy Consulting organise 2 séminaires/an. Proposer un tarif négocié annuel.' },
    { tenant_id: hotelTenantId, contact_id: marcDId, user_id: pierreId, content: 'EventPro cherche un lieu pour mariage 80 personnes en septembre. Envoyer la brochure mariage.' },
  ]);
  track('notes', notesRes.count);

  // -----------------------------------------------------------------------
  // 17. Automated Reminders
  // -----------------------------------------------------------------------
  console.log('[17/18] Inserting automated reminders...');

  const remindersRes = await insert('automated_reminders', [
    // Garage
    {
      tenant_id: garageTenantId, contact_id: jeanId, entity_id: clioId,
      type: 'maintenance', title: 'Rappel vidange — Renault Clio',
      message: 'Bonjour Jean, votre Renault Clio approche des 50 000 km. Pensez à planifier votre vidange !',
      channel: 'email', scheduled_at: '2026-04-01T08:00:00Z',
      is_recurring: true, recurrence_rule: 'FREQ=MONTHLY;INTERVAL=6',
      metadata: { mileage_trigger: 50000 },
    },
    {
      tenant_id: garageTenantId, contact_id: alainId, entity_id: sprinterId,
      type: 'maintenance', title: 'Contrôle technique — Mercedes Sprinter',
      message: 'Le contrôle technique de votre Mercedes Sprinter (QR-345-ST) doit être effectué avant le 15/06/2026.',
      channel: 'email', scheduled_at: '2026-05-15T08:00:00Z',
      is_recurring: false,
      metadata: { ct_deadline: '2026-06-15' },
    },
    // Hotel
    {
      tenant_id: hotelTenantId, contact_id: chloeId, entity_id: room201Id,
      type: 'follow_up', title: 'Offre fidélité — Chloé Girard',
      message: 'Chère Chloé, en tant que cliente fidèle, profitez de -15% sur votre prochain séjour !',
      channel: 'email', scheduled_at: '2026-03-01T10:00:00Z',
      is_recurring: true, recurrence_rule: 'FREQ=MONTHLY;INTERVAL=3',
    },
    {
      tenant_id: hotelTenantId, contact_id: antoineId,
      type: 'follow_up', title: 'Relance séminaire — Leroy Consulting',
      message: 'Bonjour Antoine, avez-vous eu le temps d\'étudier notre proposition pour le séminaire d\'avril ?',
      channel: 'email', scheduled_at: '2026-02-25T09:00:00Z',
      is_recurring: false,
    },
  ]);
  track('automated_reminders', remindersRes.count);

  // -----------------------------------------------------------------------
  // 18. Reviews
  // -----------------------------------------------------------------------
  console.log('[18/18] Inserting reviews...');

  const reviewsRes = await insert('reviews', [
    // Garage (3)
    {
      tenant_id: garageTenantId, contact_id: jeanId,
      platform: 'google', rating: 5,
      title: 'Excellent garage !',
      content: 'Équipe très professionnelle. Ma Clio a été réparée rapidement et le prix était raisonnable. Je recommande vivement !',
      status: 'published',
      reviewed_at: '2026-01-25T14:30:00Z',
    },
    {
      tenant_id: garageTenantId, contact_id: philippeId,
      platform: 'google', rating: 4,
      title: 'Bon service',
      content: 'Révision de mon BMW X3 bien faite. Seul bémol : le délai d\'attente un peu long. Mais le travail est soigné.',
      reply: 'Merci Philippe pour votre retour ! Nous travaillons à réduire nos délais. À bientôt !',
      replied_at: '2026-01-22T09:00:00Z',
      status: 'replied',
      reviewed_at: '2026-01-21T16:00:00Z',
    },
    {
      tenant_id: garageTenantId, contact_id: alainId,
      platform: 'trustpilot', rating: 5,
      title: 'Partenaire fiable pour notre flotte',
      content: 'Nous confions l\'entretien de nos 12 véhicules utilitaires au Garage Dupont depuis 3 ans. Toujours un travail impeccable et des tarifs compétitifs pour les professionnels.',
      status: 'published',
      reviewed_at: '2026-02-08T11:00:00Z',
    },
    // Hotel (2)
    {
      tenant_id: hotelTenantId, contact_id: chloeId,
      platform: 'booking', rating: 5,
      title: 'Mon adresse préférée à Paris',
      content: 'La Suite 301 est magnifique. Le jacuzzi et la terrasse avec vue mer (enfin, vue ville !) sont un vrai bonheur. Le personnel est aux petits soins. Je reviens chaque mois !',
      status: 'published',
      reviewed_at: '2026-01-30T18:00:00Z',
    },
    {
      tenant_id: hotelTenantId, contact_id: johnId,
      platform: 'tripadvisor', rating: 4,
      title: 'Great location, lovely hotel',
      content: 'Perfect location near the Champs-Élysées. The room was clean and comfortable. Breakfast could be more varied but overall a very pleasant stay. Would come back!',
      reply: 'Thank you John for your kind review! We are working on expanding our breakfast menu. Hope to see you again soon!',
      replied_at: '2026-02-12T10:00:00Z',
      status: 'replied',
      reviewed_at: '2026-02-11T09:00:00Z',
    },
  ]);
  track('reviews', reviewsRes.count);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log();
  console.log('='.repeat(70));
  console.log('  Seed Summary');
  console.log('='.repeat(70));
  for (const [label, count] of Object.entries(summary)) {
    console.log(`  ${label.padEnd(25)} ${count}`);
  }
  console.log('='.repeat(70));
  console.log('  Seed completed successfully!');
  console.log();
}

// ---------------------------------------------------------------------------
// Run directly
// ---------------------------------------------------------------------------
seed().then(() => process.exit(0)).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
