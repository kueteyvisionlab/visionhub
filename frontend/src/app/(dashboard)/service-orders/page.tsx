'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

interface ServiceOrder {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_name?: string;
  contact_name?: string;
  entity_name?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

const DEMO_ORDERS: ServiceOrder[] = [
  { id: '1', title: 'Réparation carrosserie - Peugeot 308', description: 'Aile avant droite + pare-choc', status: 'in_progress', priority: 'high', assigned_name: 'Marc Durand', contact_name: 'Jean Dupont', entity_name: 'Peugeot 308 AB-123-CD', scheduled_at: '2026-02-20T09:00:00Z', created_at: '2026-02-18T10:00:00Z' },
  { id: '2', title: 'Nettoyage chambre 204', description: 'Préparation check-in VIP', status: 'completed', priority: 'medium', assigned_name: 'Sophie Martin', entity_name: 'Chambre 204 Suite Deluxe', completed_at: '2026-02-19T14:00:00Z', created_at: '2026-02-19T08:00:00Z' },
  { id: '3', title: 'Visite appartement T3 - Rue Hugo', status: 'assigned', priority: 'medium', assigned_name: 'Éric Leroy', contact_name: 'Marie Bernard', entity_name: 'T3 Rue Victor Hugo', scheduled_at: '2026-02-21T10:30:00Z', created_at: '2026-02-19T11:00:00Z' },
  { id: '4', title: 'Consultation suivi orthodontie', description: 'Contrôle trimestriel', status: 'pending', priority: 'low', contact_name: 'Martin Jean', entity_name: 'Dossier #1842', scheduled_at: '2026-02-22T15:00:00Z', created_at: '2026-02-20T09:00:00Z' },
  { id: '5', title: 'Intervention urgente plomberie', description: 'Fuite dans salle de bain chambre 112', status: 'in_progress', priority: 'urgent', assigned_name: 'Pierre Morel', entity_name: 'Chambre 112', created_at: '2026-02-20T07:30:00Z' },
  { id: '6', title: 'Audit juridique dossier Dupont', status: 'assigned', priority: 'high', assigned_name: 'Me. Claire Fontaine', contact_name: 'SCI Horizon', entity_name: 'Dossier Dupont c/ SCI', scheduled_at: '2026-02-24T14:00:00Z', created_at: '2026-02-17T16:00:00Z' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300' },
  assigned: { label: 'Assigné', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'En cours', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Terminé', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Annulé', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-surface-400' },
  medium: { label: 'Moyenne', color: 'text-accent-amber' },
  high: { label: 'Haute', color: 'text-orange-500' },
  urgent: { label: 'Urgente', color: 'text-accent-rose' },
};

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', scheduled_at: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await apiGet<ServiceOrder[]>('/service-orders');
    setOrders(error || !data ? DEMO_ORDERS : data);
    setLoading(false);
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter((o) => o.status === filterStatus);

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    urgent: orders.filter((o) => o.priority === 'urgent' && o.status !== 'completed' && o.status !== 'cancelled').length,
  };

  async function updateStatus(id: string, status: string) {
    await apiPatch(`/service-orders/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: status as ServiceOrder['status'], completed_at: status === 'completed' ? new Date().toISOString() : o.completed_at } : o));
  }

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    const { data } = await apiPost<ServiceOrder>('/service-orders', form);
    const newOrder: ServiceOrder = data || { id: Date.now().toString(), ...form, status: 'pending', priority: form.priority as ServiceOrder['priority'], created_at: new Date().toISOString() };
    setOrders((p) => [newOrder, ...p]);
    setSaving(false);
    setShowModal(false);
    setForm({ title: '', description: '', priority: 'medium', scheduled_at: '' });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Interventions</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Gérez vos ordres de service et missions terrain.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nouvelle intervention
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'En attente', value: stats.pending, color: 'text-surface-600' },
          { label: 'En cours', value: stats.in_progress, color: 'text-accent-amber' },
          { label: 'Terminées', value: stats.completed, color: 'text-accent-emerald' },
          { label: 'Urgentes', value: stats.urgent, color: 'text-accent-rose' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-surface-200 bg-white p-4 dark:bg-surface-800 dark:border-surface-700">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {[{ value: 'all', label: 'Tous' }, ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))].map((f) => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === f.value ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="mt-8 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 text-center py-8 text-surface-400">Aucune intervention</div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((order) => {
            const statusConf = STATUS_CONFIG[order.status];
            const priorityConf = PRIORITY_CONFIG[order.priority];
            return (
              <div key={order.id} className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow dark:bg-surface-800 dark:border-surface-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{order.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConf.color}`}>{statusConf.label}</span>
                      <span className={`text-xs font-medium ${priorityConf.color}`}>● {priorityConf.label}</span>
                    </div>
                    {order.description && <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{order.description}</p>}
                    <div className="mt-2 flex items-center gap-4 text-xs text-surface-400 flex-wrap">
                      {order.assigned_name && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" /></svg>{order.assigned_name}</span>}
                      {order.contact_name && <span>Client: {order.contact_name}</span>}
                      {order.entity_name && <span>Entité: {order.entity_name}</span>}
                      {order.scheduled_at && <span>Planifié: {new Date(order.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                      {order.completed_at && <span>Terminé: {new Date(order.completed_at).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="flex gap-1 ml-4">
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus(order.id, 'assigned')} className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20">Assigner</button>
                      )}
                      {(order.status === 'assigned' || order.status === 'pending') && (
                        <button onClick={() => updateStatus(order.id, 'in_progress')} className="text-xs text-accent-amber hover:text-amber-600 font-medium px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20">Démarrer</button>
                      )}
                      {order.status === 'in_progress' && (
                        <button onClick={() => updateStatus(order.id, 'completed')} className="text-xs text-accent-emerald hover:text-emerald-600 font-medium px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20">Terminer</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Nouvelle intervention</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Titre *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" placeholder="Description de l'intervention" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Priorité</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white">
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Date planifiée</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="mt-1 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-700 dark:border-surface-600 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim()} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
