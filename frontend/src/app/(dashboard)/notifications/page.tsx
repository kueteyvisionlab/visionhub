'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

interface Notification {
  id: string;
  type: 'deal_won' | 'deal_lost' | 'new_contact' | 'order_paid' | 'task_due' | 'mention' | 'system';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'deal_won', title: 'Deal gagné !', message: 'SCI Les Jardins - Rénovation complète (18 500 €)', read: false, link: '/deals/1', created_at: '2026-02-20T09:30:00Z' },
  { id: '2', type: 'order_paid', title: 'Facture payée', message: 'Facture #2024-089 réglée par Garage Martin (2 800 €)', read: false, link: '/orders/1', created_at: '2026-02-20T08:15:00Z' },
  { id: '3', type: 'new_contact', title: 'Nouveau contact', message: 'Sophie Bernard ajoutée via formulaire web', read: false, link: '/contacts/3', created_at: '2026-02-19T16:45:00Z' },
  { id: '4', type: 'task_due', title: 'Rappel tâche', message: 'Relance devis Hotel Le Meridien - échéance demain', read: true, created_at: '2026-02-19T14:00:00Z' },
  { id: '5', type: 'deal_lost', title: 'Deal perdu', message: 'Cabinet Moreau - Migration IT (budget insuffisant)', read: true, link: '/deals/5', created_at: '2026-02-19T11:30:00Z' },
  { id: '6', type: 'mention', title: 'Vous êtes mentionné', message: 'Marc vous a mentionné dans le deal "Refonte site Luxor"', read: true, link: '/deals/6', created_at: '2026-02-18T17:20:00Z' },
  { id: '7', type: 'system', title: 'Mise à jour système', message: 'Nouvelle fonctionnalité : import CSV disponible pour les contacts', read: true, created_at: '2026-02-18T10:00:00Z' },
  { id: '8', type: 'new_contact', title: 'Nouveau contact', message: 'Pierre Lefort ajouté manuellement', read: true, link: '/contacts/8', created_at: '2026-02-17T15:30:00Z' },
  { id: '9', type: 'order_paid', title: 'Facture payée', message: 'Facture #2024-085 réglée par Restaurant Le Gourmet', read: true, link: '/orders/5', created_at: '2026-02-17T09:00:00Z' },
  { id: '10', type: 'deal_won', title: 'Deal gagné !', message: 'Hotel Le Meridien - Extension spa (12 800 €)', read: true, link: '/deals/3', created_at: '2026-02-16T14:45:00Z' },
];

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  deal_won: { icon: '🎉', color: 'text-accent-emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  deal_lost: { icon: '😞', color: 'text-accent-rose', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  new_contact: { icon: '👤', color: 'text-brand-600', bg: 'bg-brand-100 dark:bg-brand-900/30' },
  order_paid: { icon: '💰', color: 'text-accent-emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  task_due: { icon: '⏰', color: 'text-accent-amber', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  mention: { icon: '@', color: 'text-brand-600', bg: 'bg-brand-100 dark:bg-brand-900/30' },
  system: { icon: '⚙️', color: 'text-surface-500', bg: 'bg-surface-100 dark:bg-surface-700' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    setLoading(true);
    const { data, error } = await apiGet<Notification[]>('/notifications');
    setNotifications(error || !data ? DEMO_NOTIFICATIONS : data);
    setLoading(false);
  }

  const filtered = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.read) return false;
    if (filterRead === 'read' && !n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAsRead(id: string) {
    await apiPatch(`/notifications/${id}`, { read: true });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await apiPatch('/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // Group by date
  const grouped: Record<string, Notification[]> = {};
  filtered.forEach((n) => {
    const date = new Date(n.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(n);
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Notifications
            {unreadCount > 0 && <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-rose text-white text-xs font-bold">{unreadCount}</span>}
          </h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Centre de notifications de votre CRM.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {[{ value: 'all', label: 'Toutes' }, { value: 'deal_won', label: 'Deals gagnés' }, { value: 'order_paid', label: 'Paiements' }, { value: 'new_contact', label: 'Contacts' }, { value: 'task_due', label: 'Tâches' }].map((f) => (
            <button key={f.value} onClick={() => setFilterType(f.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === f.value ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'}`}>{f.label}</button>
          ))}
        </div>
        <select value={filterRead} onChange={(e) => setFilterRead(e.target.value as 'all' | 'unread' | 'read')} className="rounded-lg border border-surface-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white">
          <option value="all">Toutes</option>
          <option value="unread">Non lues</option>
          <option value="read">Lues</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-12 flex justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <svg className="mx-auto w-12 h-12 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
          <p className="mt-3 text-surface-500">Aucune notification</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([date, notifs]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">{date}</h3>
              <div className="space-y-2">
                {notifs.map((n) => {
                  const conf = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.read) markAsRead(n.id); if (n.link) window.location.href = n.link; }}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                        n.read
                          ? 'border-surface-100 bg-white hover:bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:hover:bg-surface-700/50'
                          : 'border-brand-200 bg-brand-50/50 hover:bg-brand-50 dark:bg-brand-900/10 dark:border-brand-800 dark:hover:bg-brand-900/20'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${conf.bg}`}>
                        {conf.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium ${n.read ? 'text-surface-700 dark:text-surface-300' : 'text-surface-900 dark:text-white'}`}>{n.title}</h4>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                        </div>
                        <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{n.message}</p>
                      </div>
                      <span className="text-xs text-surface-400 whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
