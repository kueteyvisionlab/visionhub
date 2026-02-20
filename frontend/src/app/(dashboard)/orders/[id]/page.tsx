'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost } from '@/lib/api';

interface OrderItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

interface Order {
  id: string;
  number: string;
  type: 'quote' | 'invoice';
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue';
  total_ht: number;
  total_ttc: number;
  tax_amount: number;
  discount_amount: number;
  notes: string;
  created_at: string;
  valid_until: string;
  items: OrderItem[];
  contact: {
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-surface-100 text-surface-600',
    sent: 'bg-brand-50 text-brand-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
    paid: 'bg-emerald-50 text-emerald-700',
    overdue: 'bg-rose-50 text-rose-700',
  };

  const labels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    rejected: 'Refusé',
    paid: 'Payée',
    overdue: 'En retard',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-5 w-32 bg-surface-200 rounded"></div>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-40 bg-surface-200 rounded"></div>
          <div className="h-7 w-20 bg-surface-200 rounded-full"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-surface-200 rounded-lg"></div>
          <div className="h-10 w-24 bg-surface-200 rounded-lg"></div>
          <div className="h-10 w-40 bg-surface-200 rounded-lg"></div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-200 bg-white p-8">
            <div className="h-64 bg-surface-100 rounded"></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <div className="h-40 bg-surface-100 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  async function fetchOrder() {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await apiGet<Order>(
      `/orders/${params.id}`,
      session.access_token
    );

    if (fetchError) {
      setError(fetchError);
    } else {
      setOrder(data);
    }

    setLoading(false);
  }

  async function handleAction(action: 'send' | 'accept' | 'reject' | 'pay' | 'duplicate') {
    if (!session?.access_token || !order) return;

    setActionLoading(action);

    const { data, error: actionError } = await apiPost(
      `/orders/${params.id}/${action}`,
      {},
      session.access_token
    );

    if (actionError) {
      alert(`Erreur: ${actionError}`);
    } else {
      if (action === 'duplicate' && data) {
        router.push(`/orders/${data.id}`);
      } else {
        await fetchOrder();
      }
    }

    setActionLoading(null);
  }

  const typeLabel = order?.type === 'quote' ? 'Devis' : 'Facture';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' €';
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-rose-900 font-medium">Erreur lors du chargement de la commande</p>
        <p className="text-rose-700 text-sm mt-1">{error || 'Commande non trouvée'}</p>
        <Link href="/orders" className="inline-block mt-4 text-sm text-rose-600 hover:text-rose-700 underline">
          Retour aux devis & factures
        </Link>
      </div>
    );
  }

  const canSend = order.status === 'draft';
  const canAccept = order.type === 'quote' && order.status === 'sent';
  const canReject = order.type === 'quote' && order.status === 'sent';
  const canPay = order.type === 'invoice' && (order.status === 'sent' || order.status === 'overdue');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Devis & Factures
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-surface-900">{order.number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            Telecharger PDF
          </button>
          <button
            onClick={() => handleAction('duplicate')}
            disabled={actionLoading === 'duplicate'}
            className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
          >
            {actionLoading === 'duplicate' ? 'Duplication...' : 'Dupliquer'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left - Document */}
        <div className="lg:col-span-2">
          {/* Document preview */}
          <div className="rounded-xl border border-surface-200 bg-white">
            {/* Document header */}
            <div className="border-b border-surface-100 p-8">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-600">Vision CRM</h2>
                  <p className="mt-1 text-sm text-surface-500">Garage Dupont SARL</p>
                  <p className="text-sm text-surface-500">12 rue de la Paix, 75001 Paris</p>
                  <p className="text-sm text-surface-500">SIRET : 123 456 789 00012</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-surface-900">{typeLabel}</p>
                  <p className="mt-1 text-lg font-semibold text-surface-700">{order.number}</p>
                  <p className="mt-2 text-sm text-surface-500">Date : {formatDate(order.created_at)}</p>
                  {order.valid_until && (
                    <p className="text-sm text-surface-500">Valide jusqu&apos;au : {formatDate(order.valid_until)}</p>
                  )}
                </div>
              </div>

              <div className="mt-8 rounded-lg bg-surface-50 p-4">
                <p className="text-xs font-semibold uppercase text-surface-400">Client</p>
                <p className="mt-1 font-semibold text-surface-900">
                  {order.contact.first_name} {order.contact.last_name}
                </p>
                {order.contact.company_name && (
                  <p className="text-sm text-surface-600">{order.contact.company_name}</p>
                )}
                <p className="text-sm text-surface-500">{order.contact.email}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="p-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-surface-500">Description</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Qte</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Prix unit.</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">TVA</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm text-surface-900">{item.description}</td>
                      <td className="py-3 text-right text-sm text-surface-700">{item.quantity}</td>
                      <td className="py-3 text-right text-sm text-surface-700">{formatAmount(item.unit_price)}</td>
                      <td className="py-3 text-right text-sm text-surface-500">{item.tax_rate}%</td>
                      <td className="py-3 text-right text-sm font-medium text-surface-900">{formatAmount(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Sous-total HT</span>
                    <span className="font-medium text-surface-900">{formatAmount(order.total_ht)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">Remise</span>
                      <span className="font-medium text-surface-900">-{formatAmount(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">TVA</span>
                    <span className="font-medium text-surface-900">{formatAmount(order.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-surface-200 pt-2">
                    <span className="font-semibold text-surface-900">Total TTC</span>
                    <span className="text-lg font-bold text-brand-600">{formatAmount(order.total_ttc)}</span>
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="mt-8 rounded-lg bg-surface-50 p-4">
                  <p className="text-xs font-semibold uppercase text-surface-400">Notes</p>
                  <p className="mt-1 text-sm text-surface-600">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Actions</h3>
            <div className="mt-4 space-y-2">
              {canSend && (
                <button
                  onClick={() => handleAction('send')}
                  disabled={actionLoading === 'send'}
                  className="w-full rounded-lg border border-surface-200 px-4 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
                >
                  {actionLoading === 'send' ? 'Envoi...' : 'Envoyer par email'}
                </button>
              )}
              {canAccept && (
                <button
                  onClick={() => handleAction('accept')}
                  disabled={actionLoading === 'accept'}
                  className="w-full rounded-lg border border-surface-200 px-4 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
                >
                  {actionLoading === 'accept' ? 'Traitement...' : 'Marquer comme accepté'}
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading === 'reject'}
                  className="w-full rounded-lg border border-rose-200 px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  {actionLoading === 'reject' ? 'Traitement...' : 'Marquer comme refusé'}
                </button>
              )}
              {canPay && (
                <button
                  onClick={() => handleAction('pay')}
                  disabled={actionLoading === 'pay'}
                  className="w-full rounded-lg border border-surface-200 px-4 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
                >
                  {actionLoading === 'pay' ? 'Traitement...' : 'Marquer comme payée'}
                </button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Informations</h3>
            <dl className="mt-4 space-y-3">
              {[
                ['Type', typeLabel],
                ['Statut', order.status === 'draft' ? 'Brouillon' : order.status === 'sent' ? 'Envoyé' : order.status === 'accepted' ? 'Accepté' : order.status === 'rejected' ? 'Refusé' : order.status === 'paid' ? 'Payée' : 'En retard'],
                ['Client', `${order.contact.first_name} ${order.contact.last_name}`],
                ...(order.contact.company_name ? [['Entreprise', order.contact.company_name]] : []),
                ['Date', formatDate(order.created_at)],
                ...(order.valid_until ? [['Validité', formatDate(order.valid_until)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-surface-500">{label}</dt>
                  <dd className="text-sm font-medium text-surface-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
