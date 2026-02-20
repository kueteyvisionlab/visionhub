'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  created_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
}

interface Delivery {
  id: string;
  event: string;
  status: 'success' | 'failure';
  status_code: number;
  response_time: number;
  created_at: string;
}

const EVENT_OPTIONS = [
  { value: 'contact.created', label: 'Contact créé' },
  { value: 'contact.updated', label: 'Contact modifié' },
  { value: 'contact.deleted', label: 'Contact supprimé' },
  { value: 'deal.created', label: 'Deal créé' },
  { value: 'deal.stage_changed', label: 'Deal changement étape' },
  { value: 'deal.won', label: 'Deal gagné' },
  { value: 'deal.lost', label: 'Deal perdu' },
  { value: 'order.created', label: 'Devis/Facture créé' },
  { value: 'order.paid', label: 'Facture payée' },
  { value: 'form.submitted', label: 'Formulaire soumis' },
];

const DEMO_WEBHOOKS: Webhook[] = [
  { id: '1', url: 'https://hooks.zapier.com/hooks/catch/123456/abc', events: ['deal.won', 'deal.stage_changed'], active: true, created_at: '2026-01-20T10:00:00Z', last_triggered: '2026-02-19T15:30:00Z', success_count: 142, failure_count: 3 },
  { id: '2', url: 'https://api.slack.com/webhooks/T1234/B5678', events: ['contact.created', 'order.paid'], active: true, created_at: '2026-02-01T14:00:00Z', last_triggered: '2026-02-20T08:15:00Z', success_count: 67, failure_count: 0 },
  { id: '3', url: 'https://example.com/api/crm-webhook', events: ['contact.created', 'contact.updated', 'deal.created'], active: false, created_at: '2026-01-10T09:00:00Z', success_count: 23, failure_count: 12 },
];

const DEMO_DELIVERIES: Delivery[] = [
  { id: 'd1', event: 'deal.won', status: 'success', status_code: 200, response_time: 145, created_at: '2026-02-19T15:30:00Z' },
  { id: 'd2', event: 'deal.stage_changed', status: 'success', status_code: 200, response_time: 98, created_at: '2026-02-19T14:00:00Z' },
  { id: 'd3', event: 'deal.stage_changed', status: 'failure', status_code: 500, response_time: 2034, created_at: '2026-02-18T11:20:00Z' },
  { id: 'd4', event: 'deal.won', status: 'success', status_code: 200, response_time: 112, created_at: '2026-02-17T16:45:00Z' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);
  const [viewDeliveries, setViewDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [form, setForm] = useState({ url: '', events: [] as string[], secret: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchWebhooks(); }, []);

  async function fetchWebhooks() {
    setLoading(true);
    const { data, error } = await apiGet<Webhook[]>('/webhooks');
    setWebhooks(error || !data ? DEMO_WEBHOOKS : data);
    setLoading(false);
  }

  async function openDeliveries(id: string) {
    setViewDeliveries(id);
    const { data } = await apiGet<Delivery[]>(`/webhooks/${id}/deliveries`);
    setDeliveries(data || DEMO_DELIVERIES);
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }));
  }

  async function handleSave() {
    if (!form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    if (editWebhook) {
      const { data } = await apiPatch<Webhook>(`/webhooks/${editWebhook.id}`, form);
      if (data) setWebhooks((p) => p.map((w) => w.id === editWebhook.id ? { ...w, ...data } : w));
      else setWebhooks((p) => p.map((w) => w.id === editWebhook.id ? { ...w, ...form } : w));
    } else {
      const { data } = await apiPost<Webhook>('/webhooks', form);
      const newW: Webhook = data || { id: Date.now().toString(), ...form, active: true, created_at: new Date().toISOString(), success_count: 0, failure_count: 0 };
      setWebhooks((p) => [...p, newW]);
    }
    setSaving(false);
    setShowModal(false);
    setEditWebhook(null);
  }

  async function toggleActive(id: string) {
    const wh = webhooks.find((w) => w.id === id);
    if (!wh) return;
    await apiPatch(`/webhooks/${id}`, { active: !wh.active });
    setWebhooks((p) => p.map((w) => w.id === id ? { ...w, active: !w.active } : w));
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce webhook ?')) return;
    await apiDelete(`/webhooks/${id}`);
    setWebhooks((p) => p.filter((w) => w.id !== id));
  }

  function openEdit(wh: Webhook) {
    setEditWebhook(wh);
    setForm({ url: wh.url, events: wh.events, secret: wh.secret || '' });
    setShowModal(true);
  }

  if (viewDeliveries) {
    const wh = webhooks.find((w) => w.id === viewDeliveries);
    return (
      <div>
        <button onClick={() => setViewDeliveries(null)} className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour
        </button>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Livraisons</h1>
        <p className="mt-1 text-surface-500 dark:text-surface-400 text-sm font-mono">{wh?.url}</p>
        <div className="mt-6 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-surface-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-surface-500">Événement</th>
                <th className="px-4 py-3 text-center font-medium text-surface-500">Statut</th>
                <th className="px-4 py-3 text-right font-medium text-surface-500">Code</th>
                <th className="px-4 py-3 text-right font-medium text-surface-500">Temps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                  <td className="px-4 py-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">{new Date(d.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3"><span className="rounded bg-surface-100 px-2 py-0.5 text-xs font-mono text-surface-600 dark:bg-surface-700 dark:text-surface-300">{d.event}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                      {d.status === 'success' ? 'Succès' : 'Échec'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-surface-600 dark:text-surface-300">{d.status_code}</td>
                  <td className="px-4 py-3 text-right text-surface-400">{d.response_time}ms</td>
                </tr>
              ))}
              {deliveries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-400">Aucune livraison</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Webhooks</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Configurez des notifications HTTP pour vos événements CRM.</p>
        </div>
        <button onClick={() => { setEditWebhook(null); setForm({ url: '', events: [], secret: '' }); setShowModal(true); }} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau webhook
        </button>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : webhooks.length === 0 ? (
        <div className="mt-12 text-center">
          <svg className="mx-auto w-12 h-12 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.07-9.07 1.757-1.757a4.5 4.5 0 0 1 6.364 6.364l-4.5 4.5a4.5 4.5 0 0 1-7.244-1.242" /></svg>
          <p className="mt-3 text-surface-500">Aucun webhook configuré</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800 dark:border-surface-700">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${wh.active ? 'bg-accent-emerald' : 'bg-surface-300'}`} />
                    <code className="text-sm font-mono text-surface-900 dark:text-white truncate">{wh.url}</code>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 ml-5">
                    {wh.events.map((e) => (
                      <span key={e} className="rounded bg-surface-100 px-2 py-0.5 text-xs font-mono text-surface-500 dark:bg-surface-700 dark:text-surface-400">{e}</span>
                    ))}
                  </div>
                  <div className="mt-2 ml-5 flex items-center gap-4 text-xs text-surface-400">
                    <span className="text-accent-emerald">{wh.success_count} succès</span>
                    {wh.failure_count > 0 && <span className="text-accent-rose">{wh.failure_count} échecs</span>}
                    {wh.last_triggered && <span>Dernier: {new Date(wh.last_triggered).toLocaleString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                  <button onClick={() => toggleActive(wh.id)} className={`p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 ${wh.active ? 'text-accent-emerald' : 'text-surface-400'}`} title={wh.active ? 'Désactiver' : 'Activer'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={wh.active ? 'M15.75 5.25v13.5m-7.5-13.5v13.5' : 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z'} /></svg>
                  </button>
                  <button onClick={() => openDeliveries(wh.id)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 dark:hover:bg-surface-700" title="Livraisons">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
                  </button>
                  <button onClick={() => openEdit(wh)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 dark:hover:bg-surface-700" title="Modifier">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-accent-rose dark:hover:bg-rose-900/20" title="Supprimer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{editWebhook ? 'Modifier le webhook' : 'Nouveau webhook'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">URL *</label>
                <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="https://example.com/webhook" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Événements *</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {EVENT_OPTIONS.map((evt) => (
                    <label key={evt.value} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 cursor-pointer">
                      <input type="checkbox" checked={form.events.includes(evt.value)} onChange={() => toggleEvent(evt.value)} className="rounded border-surface-300" />
                      <span className="text-sm text-surface-700 dark:text-surface-300">{evt.label}</span>
                      <span className="ml-auto text-xs text-surface-400 font-mono">{evt.value}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Secret (optionnel)</label>
                <input type="text" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="whsec_..." />
                <p className="mt-1 text-xs text-surface-400">Utilisé pour signer les payloads (HMAC-SHA256)</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setEditWebhook(null); }} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.url.trim() || form.events.length === 0} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editWebhook ? 'Modifier' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
