'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface Report {
  id: string;
  name: string;
  type: string;
  period: string;
  format: string;
  schedule?: string;
  data?: Record<string, unknown>;
  created_at: string;
}

const REPORT_TYPES = [
  { value: 'commercial', label: 'Performance commerciale', icon: '📊', description: 'Revenus par période, taux de conversion, objectifs' },
  { value: 'pipeline', label: 'Pipeline des deals', icon: '🔄', description: 'Deals par étape, forecast, valeur pipeline' },
  { value: 'contacts', label: 'Activité contacts', icon: '👥', description: 'Nouveaux contacts, scores, engagement' },
  { value: 'invoicing', label: 'Facturation', icon: '💰', description: 'Factures émises, impayés, délais paiement' },
  { value: 'team', label: 'Performance équipe', icon: '🏆', description: 'Résultats par membre, deals, activité' },
];

const DEMO_REPORTS: Report[] = [
  { id: '1', name: 'Performance Q4 2025', type: 'commercial', period: 'Q4 2025', format: 'pdf', created_at: '2026-01-05T10:00:00Z' },
  { id: '2', name: 'Pipeline Février 2026', type: 'pipeline', period: 'Février 2026', format: 'csv', schedule: 'weekly', created_at: '2026-02-01T08:00:00Z' },
  { id: '3', name: 'Activité contacts — Janvier', type: 'contacts', period: 'Janvier 2026', format: 'pdf', created_at: '2026-02-01T09:00:00Z' },
];

const DEMO_DATA = {
  commercial: { revenue: '127 500 €', deals_won: 52, conversion_rate: '18.5%', avg_deal: '3 250 €', rows: [
    { period: 'Semaine 1', revenue: '8 200 €', deals: 3, conversion: '15%' },
    { period: 'Semaine 2', revenue: '12 400 €', deals: 5, conversion: '20%' },
    { period: 'Semaine 3', revenue: '9 800 €', deals: 4, conversion: '17%' },
    { period: 'Semaine 4', revenue: '11 100 €', deals: 4, conversion: '22%' },
  ]},
  pipeline: { total_value: '245 000 €', open_deals: 87, avg_time: '23 jours', forecast: '68 000 €', rows: [
    { stage: 'Prospection', count: 45, value: '90 000 €', pct: '37%' },
    { stage: 'Qualification', count: 22, value: '66 000 €', pct: '27%' },
    { stage: 'Proposition', count: 12, value: '54 000 €', pct: '22%' },
    { stage: 'Négociation', count: 8, value: '35 000 €', pct: '14%' },
  ]},
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [form, setForm] = useState({ type: 'commercial', period: 'month', format: 'pdf', schedule: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    const { data, error } = await apiGet<Report[]>('/reports');
    setReports(error || !data ? DEMO_REPORTS : data);
    setLoading(false);
  }

  async function handleGenerate() {
    setSaving(true);
    const periodLabel = form.period === 'month' ? 'Ce mois' : form.period === 'quarter' ? 'Ce trimestre' : 'Cette année';
    const typeName = REPORT_TYPES.find((t) => t.value === form.type)?.label || form.type;
    const payload = { name: `${typeName} — ${periodLabel}`, type: form.type, period: periodLabel, format: form.format, schedule: form.schedule || undefined };
    const { data } = await apiPost<Report>('/reports', payload);
    if (data) {
      setReports((prev) => [data, ...prev]);
    } else {
      const fake: Report = { id: Date.now().toString(), ...payload, created_at: new Date().toISOString() };
      setReports((prev) => [fake, ...prev]);
    }
    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce rapport ?')) return;
    await apiDelete(`/reports/${id}`);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  if (viewReport) {
    const demoData = DEMO_DATA[viewReport.type as keyof typeof DEMO_DATA] || DEMO_DATA.commercial;
    const kpis = Object.entries(demoData).filter(([k]) => k !== 'rows') as [string, string | number][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((demoData as any).rows || []) as Record<string, string>[];
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

    return (
      <div>
        <button onClick={() => setViewReport(null)} className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{viewReport.name}</h1>
            <p className="mt-1 text-surface-500 dark:text-surface-400">Généré le {new Date(viewReport.created_at).toLocaleDateString('fr-FR')} • {viewReport.format.toUpperCase()}</p>
          </div>
          <button className="btn-secondary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Télécharger
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(([key, val]) => (
            <div key={key} className="rounded-xl border border-surface-200 bg-white p-4 dark:bg-surface-800 dark:border-surface-700">
              <p className="text-xs font-medium text-surface-500 uppercase">{key.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-xl font-bold text-surface-900 dark:text-white">{String(val)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-900">
              <tr>{cols.map((c) => <th key={c} className="px-4 py-3 text-left font-medium text-surface-500 capitalize">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                  {cols.map((c) => <td key={c} className="px-4 py-3 text-surface-700 dark:text-surface-300">{row[c]}</td>)}
                </tr>
              ))}
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
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Rapports</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Générez et consultez vos rapports d&apos;activité.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Générer un rapport
        </button>
      </div>

      {/* Predefined templates */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Rapports prédéfinis</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => { setForm({ ...form, type: rt.value }); setShowModal(true); }}
              className="rounded-xl border border-surface-200 bg-white p-4 text-left hover:shadow-md hover:border-brand-300 transition-all dark:bg-surface-800 dark:border-surface-700 dark:hover:border-brand-500"
            >
              <span className="text-2xl">{rt.icon}</span>
              <h3 className="mt-2 text-sm font-semibold text-surface-900 dark:text-white">{rt.label}</h3>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{rt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Saved reports */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Rapports sauvegardés</h2>
        {loading ? (
          <div className="mt-6 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : reports.length === 0 ? (
          <p className="mt-4 text-surface-400 text-sm">Aucun rapport sauvegardé</p>
        ) : (
          <div className="mt-4 space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-5 py-4 hover:shadow-sm transition-shadow dark:bg-surface-800 dark:border-surface-700">
                <div className="flex items-center gap-4">
                  <span className="text-xl">{REPORT_TYPES.find((t) => t.value === r.type)?.icon || '📄'}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{r.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-surface-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                      <span className="text-xs text-surface-400 uppercase">{r.format}</span>
                      {r.schedule && (
                        <span className="inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                          {r.schedule === 'daily' ? 'Quotidien' : r.schedule === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewReport(r)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 dark:hover:bg-surface-700" title="Voir">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-accent-rose dark:hover:bg-rose-900/20" title="Supprimer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Générer un rapport</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Type de rapport</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                  {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Période</label>
                <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Format</label>
                <div className="mt-1 flex gap-3">
                  {['pdf', 'csv', 'excel'].map((f) => (
                    <button key={f} onClick={() => setForm({ ...form, format: f })} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.format === f ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'border-surface-200 text-surface-600 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-300'}`}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Planification (optionnel)</label>
                <select value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                  <option value="">Pas de planification</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                </select>
              </div>
              {form.schedule && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email de réception</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="admin@example.com" />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleGenerate} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
