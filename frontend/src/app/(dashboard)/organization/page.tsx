'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  sector: string;
  logo_url?: string;
  settings?: Record<string, unknown>;
  created_at: string;
}

interface TenantStats {
  contacts: number;
  deals: number;
  orders: number;
  users: number;
  storage_mb: number;
}

interface Module {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

const DEMO_TENANT: TenantInfo = {
  id: '1', name: 'Vision Lab', slug: 'vision-lab', plan: 'pro', sector: 'technology',
  created_at: '2025-11-01T10:00:00Z',
};

const DEMO_STATS: TenantStats = { contacts: 342, deals: 87, orders: 156, users: 5, storage_mb: 245 };

const ALL_MODULES: Module[] = [
  { key: 'contacts', name: 'Contacts', description: 'Gestion de la base clients et prospects', enabled: true },
  { key: 'deals', name: 'Deals', description: 'Pipeline commercial et suivi des opportunités', enabled: true },
  { key: 'orders', name: 'Devis & Factures', description: 'Création et suivi de devis et factures', enabled: true },
  { key: 'emails', name: 'Email marketing', description: 'Campagnes email et templates', enabled: true },
  { key: 'sms', name: 'SMS', description: 'Campagnes SMS et conversations', enabled: true },
  { key: 'calendar', name: 'Calendrier', description: 'Planification des rendez-vous', enabled: true },
  { key: 'entities', name: 'Entités', description: 'Gestion multi-secteur (véhicules, chambres, etc.)', enabled: true },
  { key: 'forms', name: 'Formulaires', description: 'Formulaires web pour capturer des leads', enabled: false },
  { key: 'banking', name: 'Banque', description: 'Connexion bancaire et rapprochement', enabled: false },
  { key: 'reports', name: 'Rapports', description: 'Rapports BI et analytics avancés', enabled: true },
  { key: 'marketplace', name: 'Marketplace', description: 'Intégrations tierces', enabled: true },
  { key: 'webhooks', name: 'Webhooks', description: 'Notifications HTTP sortantes', enabled: false },
  { key: 'service_orders', name: 'Interventions', description: 'Ordres de service terrain', enabled: false },
  { key: 'portal', name: 'Portail client', description: 'Accès client en libre-service', enabled: false },
];

const SECTORS: Record<string, string> = {
  technology: 'Technologie', real_estate: 'Immobilier', automotive: 'Automobile',
  hospitality: 'Hôtellerie', healthcare: 'Santé', legal: 'Juridique',
  restaurant: 'Restauration', construction: 'BTP', consulting: 'Conseil',
};

const PLANS: Record<string, { label: string; color: string; limits: string }> = {
  free: { label: 'Gratuit', color: 'bg-surface-200 text-surface-600', limits: '100 contacts, 2 utilisateurs' },
  starter: { label: 'Starter', color: 'bg-blue-100 text-blue-700', limits: '1 000 contacts, 5 utilisateurs' },
  pro: { label: 'Pro', color: 'bg-brand-100 text-brand-700', limits: '10 000 contacts, 15 utilisateurs' },
  enterprise: { label: 'Enterprise', color: 'bg-violet-100 text-violet-700', limits: 'Illimité' },
};

export default function OrganizationPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [modules, setModules] = useState<Module[]>(ALL_MODULES);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', sector: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      apiGet<TenantInfo>('/tenants/me'),
      apiGet<TenantStats>('/tenants/me/stats'),
    ]);
    const t = tRes.error || !tRes.data ? DEMO_TENANT : tRes.data;
    setTenant(t);
    setForm({ name: t.name, sector: t.sector });
    setStats(sRes.error || !sRes.data ? DEMO_STATS : sRes.data);
    setLoading(false);
  }

  async function handleSave() {
    if (!tenant) return;
    setSaving(true);
    await apiPatch(`/tenants/${tenant.id}`, form);
    setTenant({ ...tenant, ...form });
    setEditing(false);
    setSaving(false);
  }

  async function toggleModule(key: string) {
    const mod = modules.find((m) => m.key === key);
    if (!mod || tenant === null) return;
    const newEnabled = !mod.enabled;
    setModules((prev) => prev.map((m) => m.key === key ? { ...m, enabled: newEnabled } : m));
    await apiPost(`/tenants/${tenant.id}/modules`, { module: key, enabled: newEnabled });
  }

  if (loading) {
    return <div className="flex justify-center mt-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const plan = PLANS[tenant?.plan || 'free'];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Organisation</h1>
      <p className="mt-1 text-surface-500 dark:text-surface-400">Paramètres de votre espace de travail.</p>

      {/* Org info */}
      <div className="mt-8 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold">
              {tenant?.name?.[0]?.toUpperCase() || 'V'}
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-3">
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
                  <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="rounded-lg border border-surface-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                    {Object.entries(SECTORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{tenant?.name}</h2>
                  <p className="text-sm text-surface-400">{SECTORS[tenant?.sector || ''] || tenant?.sector} • Slug: {tenant?.slug}</p>
                </>
              )}
            </div>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-4 py-2">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm px-4 py-2">Modifier</button>
          )}
        </div>

        {/* Plan */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-700">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.color}`}>{plan.label}</span>
          <span className="text-sm text-surface-500 dark:text-surface-400">{plan.limits}</span>
          <button className="ml-auto text-sm text-brand-600 hover:text-brand-700 font-medium">Changer de plan</button>
        </div>

        <p className="mt-3 text-xs text-surface-400">Créé le {new Date(tenant?.created_at || '').toLocaleDateString('fr-FR')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-5">
          {[
            { label: 'Contacts', value: stats.contacts },
            { label: 'Deals', value: stats.deals },
            { label: 'Factures', value: stats.orders },
            { label: 'Utilisateurs', value: stats.users },
            { label: 'Stockage', value: `${stats.storage_mb} Mo` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-surface-200 bg-white p-4 dark:bg-surface-800 dark:border-surface-700">
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-surface-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modules */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Modules</h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Activez ou désactivez les fonctionnalités de votre CRM.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {modules.map((mod) => (
            <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg border border-surface-100 dark:border-surface-700">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">{mod.name}</p>
                <p className="text-xs text-surface-400">{mod.description}</p>
              </div>
              <button
                onClick={() => toggleModule(mod.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${mod.enabled ? 'bg-brand-500' : 'bg-surface-300 dark:bg-surface-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mod.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
