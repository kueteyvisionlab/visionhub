'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const ENTITY_TYPES = [
  { value: 'vehicle', label: 'Véhicule', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'room', label: 'Chambre', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'patient', label: 'Patient', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'property', label: 'Bien immobilier', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'legal_case', label: 'Dossier juridique', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  { value: 'project', label: 'Projet', color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' },
  { value: 'appointment', label: 'RDV', color: 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300' },
];

const DEMO_ENTITIES: Entity[] = [
  { id: '1', name: 'Peugeot 308 - AB-123-CD', type: 'vehicle', description: 'Véhicule client en réparation', status: 'active', created_at: '2026-02-15T10:00:00Z' },
  { id: '2', name: 'Chambre 204 - Suite Deluxe', type: 'room', description: 'Suite avec vue mer, 2 personnes', status: 'active', created_at: '2026-02-10T09:00:00Z' },
  { id: '3', name: 'Martin Jean - Dossier #1842', type: 'patient', description: 'Suivi orthodontie', status: 'active', created_at: '2026-02-08T14:00:00Z' },
  { id: '4', name: 'Appartement T3 - Rue Victor Hugo', type: 'property', description: '72m², 3ème étage, parking', status: 'active', created_at: '2026-01-28T11:00:00Z' },
  { id: '5', name: 'Dossier Dupont c/ SCI Horizon', type: 'legal_case', description: 'Litige bail commercial', status: 'active', created_at: '2026-01-20T16:00:00Z' },
  { id: '6', name: 'Refonte site web - Client Luxor', type: 'project', description: 'Design + dev Next.js', status: 'active', created_at: '2026-02-01T08:00:00Z' },
];

function getTypeBadge(type: string) {
  const t = ENTITY_TYPES.find((et) => et.value === type);
  return t || { value: type, label: type, color: 'bg-surface-100 text-surface-600' };
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [form, setForm] = useState({ name: '', type: 'vehicle', description: '', status: 'active', metadata: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntities();
  }, []);

  async function fetchEntities() {
    setLoading(true);
    const { data, error } = await apiGet<Entity[]>('/entities');
    if (error || !data) {
      setEntities(DEMO_ENTITIES);
    } else {
      setEntities(data);
    }
    setLoading(false);
  }

  const filtered = entities.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function openCreate() {
    setEditEntity(null);
    setForm({ name: '', type: 'vehicle', description: '', status: 'active', metadata: '' });
    setShowModal(true);
  }

  function openEdit(entity: Entity) {
    setEditEntity(entity);
    setForm({
      name: entity.name,
      type: entity.type,
      description: entity.description || '',
      status: entity.status,
      metadata: entity.metadata ? JSON.stringify(entity.metadata, null, 2) : '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      description: form.description,
      status: form.status,
    };
    if (form.metadata.trim()) {
      try {
        payload.metadata = JSON.parse(form.metadata);
      } catch {
        /* ignore invalid JSON */
      }
    }

    if (editEntity) {
      const { data } = await apiPatch<Entity>(`/entities/${editEntity.id}`, payload);
      if (data) {
        setEntities((prev) => prev.map((e) => (e.id === editEntity.id ? { ...e, ...data } : e)));
      }
    } else {
      const { data } = await apiPost<Entity>('/entities', payload);
      if (data) {
        setEntities((prev) => [data, ...prev]);
      }
    }
    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette entité ?')) return;
    await apiDelete(`/entities/${id}`);
    setEntities((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Entités</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Gérez vos entités métier multi-secteur.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'}`}
          >
            Tous ({entities.length})
          </button>
          {ENTITY_TYPES.map((t) => {
            const count = entities.filter((e) => e.type === t.value).length;
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === t.value ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'}`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <svg className="mx-auto w-12 h-12 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="mt-3 text-surface-500 dark:text-surface-400">Aucune entité trouvée</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity) => {
            const badge = getTypeBadge(entity.type);
            return (
              <div key={entity.id} className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-md transition-shadow dark:bg-surface-800 dark:border-surface-700">
                <div className="flex items-start justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(entity)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 dark:hover:bg-surface-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(entity.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-accent-rose dark:hover:bg-rose-900/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-surface-900 dark:text-white">{entity.name}</h3>
                {entity.description && (
                  <p className="mt-1 text-xs text-surface-500 dark:text-surface-400 line-clamp-2">{entity.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 text-xs ${entity.status === 'active' ? 'text-accent-emerald' : 'text-surface-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${entity.status === 'active' ? 'bg-accent-emerald' : 'bg-surface-300'}`} />
                    {entity.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="text-xs text-surface-400">{new Date(entity.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              {editEntity ? 'Modifier l\'entité' : 'Nouvelle entité'}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white"
                  placeholder="Nom de l'entité"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white"
                >
                  {ENTITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white"
                  placeholder="Description optionnelle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Métadonnées (JSON)</label>
                <textarea
                  value={form.metadata}
                  onChange={(e) => setForm({ ...form, metadata: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white"
                  placeholder='{"clé": "valeur"}'
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Statut</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: form.status === 'active' ? 'inactive' : 'active' })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.status === 'active' ? 'bg-accent-emerald' : 'bg-surface-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-surface-500">{form.status === 'active' ? 'Actif' : 'Inactif'}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? 'Enregistrement...' : editEntity ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
