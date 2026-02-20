'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface FormField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string;
}

interface WebForm {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'draft' | 'archived';
  fields: FormField[];
  redirect_url?: string;
  notification_email?: string;
  submission_count: number;
  created_at: string;
}

interface Submission {
  id: string;
  form_id: string;
  data: Record<string, string>;
  status: 'new' | 'read' | 'processed';
  created_at: string;
}

const DEMO_FORMS: WebForm[] = [
  { id: '1', name: 'Formulaire de contact', slug: 'contact', status: 'active', fields: [{ name: 'Nom', type: 'text', required: true }, { name: 'Email', type: 'email', required: true }, { name: 'Message', type: 'textarea', required: true }], submission_count: 47, created_at: '2026-01-15T10:00:00Z' },
  { id: '2', name: 'Demande de devis', slug: 'demande-devis', status: 'active', fields: [{ name: 'Entreprise', type: 'text', required: true }, { name: 'Email', type: 'email', required: true }, { name: 'Téléphone', type: 'phone', required: false }, { name: 'Besoin', type: 'textarea', required: true }], submission_count: 23, created_at: '2026-01-20T14:00:00Z' },
  { id: '3', name: 'Inscription newsletter', slug: 'newsletter', status: 'draft', fields: [{ name: 'Prénom', type: 'text', required: true }, { name: 'Email', type: 'email', required: true }, { name: 'RGPD', type: 'checkbox', required: true }], submission_count: 0, created_at: '2026-02-10T09:00:00Z' },
  { id: '4', name: 'Satisfaction client', slug: 'satisfaction', status: 'archived', fields: [{ name: 'Nom', type: 'text', required: false }, { name: 'Note', type: 'select', required: true, options: '1,2,3,4,5' }, { name: 'Commentaire', type: 'textarea', required: false }], submission_count: 112, created_at: '2025-11-01T08:00:00Z' },
];

const DEMO_SUBMISSIONS: Submission[] = [
  { id: 's1', form_id: '1', data: { Nom: 'Marie Dupont', Email: 'marie@example.com', Message: 'Je souhaite un RDV.' }, status: 'new', created_at: '2026-02-19T15:30:00Z' },
  { id: 's2', form_id: '1', data: { Nom: 'Pierre Martin', Email: 'pierre@company.fr', Message: 'Demande d\'information.' }, status: 'read', created_at: '2026-02-18T10:00:00Z' },
  { id: 's3', form_id: '1', data: { Nom: 'Sophie Bernard', Email: 'sophie@gmail.com', Message: 'Intéressée par vos services.' }, status: 'processed', created_at: '2026-02-17T09:15:00Z' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  archived: 'bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400',
};

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-brand-100 text-brand-700' },
  read: { label: 'Lu', color: 'bg-surface-200 text-surface-600' },
  processed: { label: 'Traité', color: 'bg-emerald-100 text-emerald-700' },
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[àáâ]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ïî]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function FormsPage() {
  const [forms, setForms] = useState<WebForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewSubs, setViewSubs] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', redirect_url: '', notification_email: '' });
  const [fields, setFields] = useState<FormField[]>([{ name: '', type: 'text' as const, required: false }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchForms(); }, []);

  async function fetchForms() {
    setLoading(true);
    const { data, error } = await apiGet<WebForm[]>('/forms');
    setForms(error || !data ? DEMO_FORMS : data);
    setLoading(false);
  }

  async function viewSubmissions(formId: string) {
    setViewSubs(formId);
    const { data } = await apiGet<Submission[]>(`/forms/${formId}/submissions`);
    setSubmissions(data || DEMO_SUBMISSIONS.filter((s) => s.form_id === formId));
  }

  function addField() {
    setFields([...fields, { name: '', type: 'text', required: false }]);
  }

  function removeField(i: number) {
    setFields(fields.filter((_, idx) => idx !== i));
  }

  function moveField(i: number, dir: -1 | 1) {
    const newFields = [...fields];
    const j = i + dir;
    if (j < 0 || j >= newFields.length) return;
    [newFields[i], newFields[j]] = [newFields[j], newFields[i]];
    setFields(newFields);
  }

  function updateField(i: number, key: keyof FormField, value: string | boolean) {
    const newFields = [...fields];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newFields[i] as any)[key] = value;
    setFields(newFields);
  }

  async function handleSave() {
    if (!form.name.trim() || fields.some((f) => !f.name.trim())) return;
    setSaving(true);
    const payload = { ...form, slug: form.slug || slugify(form.name), fields, status: 'draft' };
    const { data } = await apiPost<WebForm>('/forms', payload);
    if (data) {
      setForms((prev) => [data, ...prev]);
    } else {
      const fake: WebForm = { id: Date.now().toString(), ...payload, status: 'draft', submission_count: 0, created_at: new Date().toISOString() };
      setForms((prev) => [fake, ...prev]);
    }
    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce formulaire ?')) return;
    await apiDelete(`/forms/${id}`);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
  }

  if (viewSubs) {
    const currentForm = forms.find((f) => f.id === viewSubs);
    return (
      <div>
        <button onClick={() => setViewSubs(null)} className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Retour aux formulaires
        </button>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Soumissions — {currentForm?.name}</h1>
        <p className="mt-1 text-surface-500 dark:text-surface-400">{submissions.length} soumission(s)</p>
        <div className="mt-6 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-surface-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-surface-500">Données</th>
                <th className="px-4 py-3 text-left font-medium text-surface-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                  <td className="px-4 py-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">{new Date(sub.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-surface-900 dark:text-white">
                    {Object.entries(sub.data).map(([k, v]) => (
                      <span key={k} className="mr-3"><span className="text-surface-400">{k}:</span> {v}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SUB_STATUS[sub.status]?.color || ''}`}>
                      {SUB_STATUS[sub.status]?.label || sub.status}
                    </span>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-surface-400">Aucune soumission</td></tr>
              )}
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
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Formulaires</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Créez des formulaires pour capturer des leads.</p>
        </div>
        <button onClick={() => { setForm({ name: '', slug: '', description: '', redirect_url: '', notification_email: '' }); setFields([{ name: '', type: 'text', required: false }]); setShowModal(true); }} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouveau formulaire
        </button>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : forms.length === 0 ? (
        <div className="mt-12 text-center">
          <svg className="mx-auto w-12 h-12 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
          <p className="mt-3 text-surface-500">Aucun formulaire créé</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <div key={f.id} className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-md transition-shadow dark:bg-surface-800 dark:border-surface-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{f.name}</h3>
                  <p className="mt-0.5 text-xs text-surface-400 font-mono">/{f.slug}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[f.status]}`}>
                  {f.status === 'active' ? 'Actif' : f.status === 'draft' ? 'Brouillon' : 'Archivé'}
                </span>
              </div>
              {f.description && <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">{f.description}</p>}
              <div className="mt-3 flex items-center gap-4 text-xs text-surface-400">
                <span>{f.fields.length} champ(s)</span>
                <span>{f.submission_count} soumission(s)</span>
              </div>
              <div className="mt-3 text-xs text-surface-400">{new Date(f.created_at).toLocaleDateString('fr-FR')}</div>
              <div className="mt-4 flex gap-2 border-t border-surface-100 dark:border-surface-700 pt-3">
                <button onClick={() => viewSubmissions(f.id)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Soumissions</button>
                <button onClick={() => copyLink(f.slug)} className="text-xs text-surface-500 hover:text-surface-700 font-medium">Copier lien</button>
                <button onClick={() => handleDelete(f.id)} className="text-xs text-accent-rose hover:text-red-700 font-medium ml-auto">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Nouveau formulaire</h2>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Formulaire de contact" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Slug</label>
                  <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="formulaire-contact" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
              </div>

              {/* Fields builder */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Champs du formulaire</label>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-700">
                      <input type="text" value={field.name} onChange={(e) => updateField(i, 'name', e.target.value)} className="flex-1 rounded border border-surface-200 px-2 py-1.5 text-sm dark:bg-surface-600 dark:border-surface-500 dark:text-white" placeholder="Nom du champ" />
                      <select value={field.type} onChange={(e) => updateField(i, 'type', e.target.value)} className="rounded border border-surface-200 px-2 py-1.5 text-sm dark:bg-surface-600 dark:border-surface-500 dark:text-white">
                        <option value="text">Texte</option>
                        <option value="email">Email</option>
                        <option value="phone">Téléphone</option>
                        <option value="textarea">Zone texte</option>
                        <option value="select">Liste</option>
                        <option value="checkbox">Case</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-surface-500">
                        <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, 'required', e.target.checked)} className="rounded" />
                        Requis
                      </label>
                      <button onClick={() => moveField(i, -1)} className="p-1 text-surface-400 hover:text-surface-600" title="Monter"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg></button>
                      <button onClick={() => moveField(i, 1)} className="p-1 text-surface-400 hover:text-surface-600" title="Descendre"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg></button>
                      {fields.length > 1 && <button onClick={() => removeField(i)} className="p-1 text-accent-rose hover:text-red-700"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>}
                    </div>
                  ))}
                </div>
                <button onClick={addField} className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium">+ Ajouter un champ</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">URL de redirection</label>
                  <input type="text" value={form.redirect_url} onChange={(e) => setForm({ ...form, redirect_url: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email de notification</label>
                  <input type="email" value={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="admin@example.com" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? 'Création...' : 'Créer le formulaire'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
