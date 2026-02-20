'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Integration {
  slug: string;
  name: string;
  description: string;
  category: string;
  color: string;
  rating: number;
  installed?: boolean;
}

interface InstalledIntegration {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  installed_at: string;
  config?: Record<string, string>;
}

const ALL_INTEGRATIONS: Integration[] = [
  { slug: 'brevo', name: 'Brevo', description: 'Email marketing, transactionnel et automation.', category: 'Communication', color: 'bg-blue-500', rating: 4.7 },
  { slug: 'twilio', name: 'Twilio', description: 'SMS, WhatsApp et appels téléphoniques.', category: 'Communication', color: 'bg-red-500', rating: 4.5 },
  { slug: 'stripe', name: 'Stripe', description: 'Paiements en ligne, abonnements et factures.', category: 'Paiement', color: 'bg-violet-500', rating: 4.9 },
  { slug: 'gocardless', name: 'GoCardless', description: 'Prélèvements SEPA et paiements récurrents.', category: 'Paiement', color: 'bg-teal-500', rating: 4.3 },
  { slug: 'google-calendar', name: 'Google Calendar', description: 'Synchronisez vos RDV et événements.', category: 'Productivité', color: 'bg-blue-400', rating: 4.6 },
  { slug: 'slack', name: 'Slack', description: 'Notifications et alertes dans vos canaux.', category: 'Communication', color: 'bg-purple-500', rating: 4.4 },
  { slug: 'zapier', name: 'Zapier', description: 'Connectez 5000+ apps sans code.', category: 'Productivité', color: 'bg-orange-500', rating: 4.7 },
  { slug: 'make', name: 'Make (Integromat)', description: 'Automatisation avancée de workflows.', category: 'Productivité', color: 'bg-fuchsia-500', rating: 4.5 },
  { slug: 'quickbooks', name: 'QuickBooks', description: 'Comptabilité et gestion financière.', category: 'Comptabilité', color: 'bg-green-600', rating: 4.3 },
  { slug: 'pennylane', name: 'Pennylane', description: 'Comptabilité et pilotage financier français.', category: 'Comptabilité', color: 'bg-indigo-500', rating: 4.6 },
  { slug: 'mailchimp', name: 'Mailchimp', description: 'Email marketing et landing pages.', category: 'Marketing', color: 'bg-yellow-500', rating: 4.2 },
  { slug: 'google-analytics', name: 'Google Analytics', description: 'Suivi du trafic et des conversions web.', category: 'Marketing', color: 'bg-orange-400', rating: 4.5 },
  { slug: 'notion', name: 'Notion', description: 'Wiki, docs et gestion de projets.', category: 'Productivité', color: 'bg-surface-800', rating: 4.6 },
  { slug: 'hubspot', name: 'HubSpot', description: 'CRM, marketing et service client.', category: 'Marketing', color: 'bg-orange-600', rating: 4.4 },
];

const CATEGORIES = ['Tous', 'Communication', 'Paiement', 'Comptabilité', 'Marketing', 'Productivité'];

const DEMO_INSTALLED: InstalledIntegration[] = [
  { id: 'i1', slug: 'brevo', name: 'Brevo', status: 'active', installed_at: '2026-01-10T10:00:00Z', config: { api_key: 'xkeysib-***' } },
  { id: 'i2', slug: 'stripe', name: 'Stripe', status: 'active', installed_at: '2026-01-15T14:00:00Z', config: { secret_key: 'sk_live_***' } },
  { id: 'i3', slug: 'google-calendar', name: 'Google Calendar', status: 'paused', installed_at: '2026-02-01T09:00:00Z' },
];

export default function MarketplacePage() {
  const [tab, setTab] = useState<'browse' | 'installed'>('browse');
  const [installed, setInstalled] = useState<InstalledIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Tous');
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  useEffect(() => { fetchInstalled(); }, []);

  async function fetchInstalled() {
    setLoading(true);
    const { data, error } = await apiGet<InstalledIntegration[]>('/marketplace/installed');
    setInstalled(error || !data ? DEMO_INSTALLED : data);
    setLoading(false);
  }

  const installedSlugs = new Set(installed.map((i) => i.slug));

  const filteredIntegrations = ALL_INTEGRATIONS.filter((i) => {
    if (filterCategory !== 'Tous' && i.category !== filterCategory) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleInstall(slug: string) {
    const integration = ALL_INTEGRATIONS.find((i) => i.slug === slug);
    if (!integration) return;
    const { data } = await apiPost<InstalledIntegration>('/marketplace/install', { slug });
    const newInstalled: InstalledIntegration = data || { id: Date.now().toString(), slug, name: integration.name, status: 'active', installed_at: new Date().toISOString() };
    setInstalled((p) => [...p, newInstalled]);
    setDetailSlug(null);
  }

  async function handleUninstall(id: string) {
    if (!confirm('Désinstaller cette intégration ?')) return;
    await apiDelete(`/marketplace/installed/${id}`);
    setInstalled((p) => p.filter((i) => i.id !== id));
  }

  async function toggleStatus(id: string) {
    const item = installed.find((i) => i.id === id);
    if (!item) return;
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    await apiPatch(`/marketplace/installed/${id}`, { status: newStatus });
    setInstalled((p) => p.map((i) => i.id === id ? { ...i, status: newStatus } : i));
  }

  function openConfig(item: InstalledIntegration) {
    setConfigId(item.id);
    setConfigValues(item.config || {});
  }

  async function saveConfig() {
    if (!configId) return;
    await apiPatch(`/marketplace/installed/${configId}`, { config: configValues });
    setInstalled((p) => p.map((i) => i.id === configId ? { ...i, config: configValues } : i));
    setConfigId(null);
  }

  const detailIntegration = ALL_INTEGRATIONS.find((i) => i.slug === detailSlug);

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Marketplace</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Découvrez et gérez vos intégrations.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-surface-200 dark:border-surface-700">
        <button onClick={() => setTab('browse')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'browse' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
          Découvrir ({ALL_INTEGRATIONS.length})
        </button>
        <button onClick={() => setTab('installed')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'installed' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
          Installées ({installed.length})
        </button>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tab === 'browse' ? (
        <div className="mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              <input type="text" placeholder="Rechercher une intégration..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterCategory === c ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'}`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integ) => (
              <div key={integ.slug} onClick={() => setDetailSlug(integ.slug)} className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-md hover:border-brand-300 transition-all cursor-pointer dark:bg-surface-800 dark:border-surface-700 dark:hover:border-brand-500">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${integ.color} flex items-center justify-center text-white text-sm font-bold`}>{integ.name[0]}</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{integ.name}</h3>
                    <span className="text-xs text-surface-400">{integ.category}</span>
                  </div>
                  {installedSlugs.has(integ.slug) ? (
                    <span className="text-xs font-medium text-accent-emerald flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      Installé
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">{integ.description}</p>
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(integ.rating) ? 'text-amber-400' : 'text-surface-200 dark:text-surface-600'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                  <span className="ml-1 text-xs text-surface-400">{integ.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Installed tab */
        <div className="mt-6 space-y-3">
          {installed.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-5 py-4 dark:bg-surface-800 dark:border-surface-700">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${ALL_INTEGRATIONS.find((i) => i.slug === item.slug)?.color || 'bg-surface-400'} flex items-center justify-center text-white text-sm font-bold`}>{item.name[0]}</div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{item.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                      {item.status === 'active' ? 'Actif' : item.status === 'paused' ? 'Pause' : 'Erreur'}
                    </span>
                    <span className="text-xs text-surface-400">Installé le {new Date(item.installed_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(item.id)} className={`p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 ${item.status === 'active' ? 'text-accent-emerald' : 'text-surface-400'}`} title={item.status === 'active' ? 'Mettre en pause' : 'Activer'}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.status === 'active' ? 'M15.75 5.25v13.5m-7.5-13.5v13.5' : 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z'} /></svg>
                </button>
                <button onClick={() => openConfig(item)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 dark:hover:bg-surface-700" title="Configurer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                </button>
                <button onClick={() => handleUninstall(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-accent-rose dark:hover:bg-rose-900/20" title="Désinstaller">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </div>
          ))}
          {installed.length === 0 && <p className="text-center text-surface-400 py-8">Aucune intégration installée</p>}
        </div>
      )}

      {/* Detail Modal */}
      {detailIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailSlug(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${detailIntegration.color} flex items-center justify-center text-white text-xl font-bold`}>{detailIntegration.name[0]}</div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{detailIntegration.name}</h2>
                <span className="text-sm text-surface-400">{detailIntegration.category}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-surface-600 dark:text-surface-300">{detailIntegration.description}</p>
            <div className="mt-4 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className={`w-4 h-4 ${s <= Math.round(detailIntegration.rating) ? 'text-amber-400' : 'text-surface-200'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              ))}
              <span className="ml-2 text-sm text-surface-500">{detailIntegration.rating}/5</span>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDetailSlug(null)} className="btn-secondary">Fermer</button>
              {installedSlugs.has(detailIntegration.slug) ? (
                <button onClick={() => { const item = installed.find((i) => i.slug === detailIntegration.slug); if (item) handleUninstall(item.id); }} className="inline-flex items-center justify-center rounded-lg border-2 border-accent-rose bg-transparent px-6 py-3 text-sm font-semibold text-accent-rose transition-all hover:bg-red-50">Désinstaller</button>
              ) : (
                <button onClick={() => handleInstall(detailIntegration.slug)} className="btn-primary">Installer</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfigId(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Configuration</h2>
            <div className="mt-4 space-y-3">
              {['api_key', 'secret_key', 'webhook_url'].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 capitalize">{key.replace(/_/g, ' ')}</label>
                  <input type={key.includes('key') ? 'password' : 'text'} value={configValues[key] || ''} onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder={key.includes('url') ? 'https://...' : '•••'} />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfigId(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveConfig} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
