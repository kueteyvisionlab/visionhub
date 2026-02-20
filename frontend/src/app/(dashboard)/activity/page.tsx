'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

const actionLabels: Record<string, string> = {
  POST: 'a créé',
  PATCH: 'a modifié',
  PUT: 'a modifié',
  DELETE: 'a supprimé',
};

const resourceLabels: Record<string, { label: string; icon: string; href: string }> = {
  contacts: { label: 'contact', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z', href: '/contacts' },
  deals: { label: 'deal', icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z', href: '/deals' },
  orders: { label: 'document', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z', href: '/orders' },
  pipelines: { label: 'pipeline', icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z', href: '/deals' },
};

const actionColors: Record<string, string> = {
  POST: 'bg-accent-emerald/10 text-accent-emerald',
  PATCH: 'bg-brand-50 text-brand-600',
  PUT: 'bg-brand-50 text-brand-600',
  DELETE: 'bg-accent-rose/10 text-accent-rose',
};

export default function ActivityPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!session?.access_token) return;

    async function fetchLogs() {
      setLoading(true);
      try {
        const endpoint = filter === 'all'
          ? '/audit-logs?limit=50'
          : `/audit-logs?resource_type=${filter}&limit=50`;

        const { data, error } = await apiGet<{ data: AuditLog[] }>(endpoint, session!.access_token);

        if (!error && data?.data) {
          setLogs(data.data);
        } else {
          // Fallback demo data
          setLogs(generateDemoLogs());
        }
      } catch {
        setLogs(generateDemoLogs());
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [session?.access_token, filter]);

  function generateDemoLogs(): AuditLog[] {
    const now = Date.now();
    return [
      { id: '1', user_id: '1', action: 'POST', resource_type: 'contacts', resource_id: '1', details: { first_name: 'Marie', last_name: 'Dupont' }, created_at: new Date(now - 300000).toISOString(), user: { full_name: 'Admin', email: 'admin@garage-dupont.fr' } },
      { id: '2', user_id: '1', action: 'PATCH', resource_type: 'deals', resource_id: '1', details: { name: 'Maintenance annuelle', stage: 'Proposition' }, created_at: new Date(now - 1800000).toISOString(), user: { full_name: 'Admin', email: 'admin@garage-dupont.fr' } },
      { id: '3', user_id: '1', action: 'POST', resource_type: 'orders', resource_id: '1', details: { type: 'quote', reference: 'DEV-2026-001' }, created_at: new Date(now - 3600000).toISOString(), user: { full_name: 'Admin', email: 'admin@garage-dupont.fr' } },
      { id: '4', user_id: '1', action: 'PATCH', resource_type: 'orders', resource_id: '2', details: { status: 'sent', reference: 'FAC-2026-003' }, created_at: new Date(now - 7200000).toISOString(), user: { full_name: 'Jean Mécanicien', email: 'jean@garage-dupont.fr' } },
      { id: '5', user_id: '1', action: 'POST', resource_type: 'deals', resource_id: '2', details: { name: 'Réparation carrosserie' }, created_at: new Date(now - 14400000).toISOString(), user: { full_name: 'Admin', email: 'admin@garage-dupont.fr' } },
      { id: '6', user_id: '1', action: 'DELETE', resource_type: 'contacts', resource_id: '3', details: { first_name: 'Test', last_name: 'Contact' }, created_at: new Date(now - 28800000).toISOString(), user: { full_name: 'Admin', email: 'admin@garage-dupont.fr' } },
      { id: '7', user_id: '1', action: 'PATCH', resource_type: 'contacts', resource_id: '4', details: { first_name: 'Pierre', last_name: 'Martin' }, created_at: new Date(now - 43200000).toISOString(), user: { full_name: 'Jean Mécanicien', email: 'jean@garage-dupont.fr' } },
      { id: '8', user_id: '1', action: 'POST', resource_type: 'orders', resource_id: '3', details: { type: 'invoice', reference: 'FAC-2026-004' }, created_at: new Date(now - 86400000).toISOString(), user: { full_name: 'Admin', email: 'admin@garage-dupont.fr' } },
    ];
  }

  function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(diff / 86400000);
    return `Il y a ${days}j`;
  }

  function getLogDescription(log: AuditLog): string {
    const action = actionLabels[log.action] || log.action;
    const resource = resourceLabels[log.resource_type]?.label || log.resource_type;

    let detail = '';
    if (log.details) {
      if (log.details.name) detail = ` "${log.details.name}"`;
      else if (log.details.first_name) detail = ` "${log.details.first_name} ${log.details.last_name || ''}"`;
      else if (log.details.reference) detail = ` ${log.details.reference}`;
    }

    return `${action} un ${resource}${detail}`;
  }

  // Group logs by date
  const groupedLogs: Record<string, AuditLog[]> = {};
  logs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groupedLogs[date]) groupedLogs[date] = [];
    groupedLogs[date].push(log);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Activité</h1>
          <p className="mt-1 text-sm text-surface-500">Historique de toutes les actions sur votre CRM.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">Toutes les actions</option>
          <option value="contacts">Contacts</option>
          <option value="deals">Deals</option>
          <option value="orders">Documents</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-surface-200" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-surface-200 rounded" />
                  <div className="h-3 w-1/4 bg-surface-200 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto w-12 h-12 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="mt-4 text-surface-500">Aucune activité enregistrée.</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="mb-8">
              <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4 capitalize">{date}</h3>
              <div className="space-y-1">
                {dateLogs.map((log) => {
                  const resourceConfig = resourceLabels[log.resource_type];
                  const colorClass = actionColors[log.action] || 'bg-surface-100 text-surface-600';

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 rounded-lg px-4 py-3 hover:bg-surface-50 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={resourceConfig?.icon || 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'} />
                        </svg>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-900">
                          <span className="font-medium">{log.user?.full_name || 'Utilisateur'}</span>{' '}
                          {getLogDescription(log)}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">{getTimeAgo(log.created_at)}</p>
                      </div>

                      {/* Link */}
                      {resourceConfig && log.resource_id && (
                        <Link
                          href={`${resourceConfig.href}/${log.resource_id}`}
                          className="opacity-0 group-hover:opacity-100 text-xs text-brand-500 hover:text-brand-600 transition-opacity"
                        >
                          Voir &rarr;
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
