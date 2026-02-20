'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Order {
  id: number;
  number: string;
  contact_id: number;
  type: 'quote' | 'invoice';
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue';
  total_ttc: number;
  total_ht: number;
  tax_amount: number;
  created_at: string;
  contact?: Contact;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrdersResponse {
  data: Order[];
  pagination: Pagination;
}

const statusConfig = {
  draft: { color: 'bg-surface-100 text-surface-600', label: 'Brouillon' },
  sent: { color: 'bg-brand-50 text-brand-700', label: 'Envoyé' },
  accepted: { color: 'bg-emerald-50 text-emerald-700', label: 'Accepté' },
  rejected: { color: 'bg-rose-50 text-rose-700', label: 'Refusé' },
  paid: { color: 'bg-emerald-50 text-emerald-700', label: 'Payé' },
  overdue: { color: 'bg-rose-50 text-rose-700', label: 'En retard' },
};

const typeConfig = {
  quote: 'Devis',
  invoice: 'Facture',
};

export default function OrdersPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
  });

  const [searchInput, setSearchInput] = useState('');

  const fetchOrders = useCallback(async (page: number = 1) => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await apiGet<OrdersResponse>(
        `/orders?${params.toString()}`,
        session.access_token
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const result = response.data;
      setOrders(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, filters, pagination.limit]);

  useEffect(() => {
    fetchOrders(1);
  }, [filters]);

  useEffect(() => {
    if (!session?.access_token) return;

    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, session?.access_token]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, type: value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    fetchOrders(newPage);
  };

  const handleRowClick = (orderId: number) => {
    router.push(`/orders/${orderId}`);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateStats = () => {
    const quotesInProgress = orders.filter(
      (o) => o.type === 'quote' && (o.status === 'draft' || o.status === 'sent')
    );
    const quotesTotal = quotesInProgress.reduce((sum, o) => sum + o.total_ttc, 0);

    const pendingInvoices = orders.filter(
      (o) => o.type === 'invoice' && (o.status === 'sent' || o.status === 'overdue')
    );
    const pendingTotal = pendingInvoices.reduce((sum, o) => sum + o.total_ttc, 0);

    const acceptedQuotes = orders.filter((o) => o.type === 'quote' && o.status === 'accepted');
    const totalQuotes = orders.filter((o) => o.type === 'quote');
    const acceptanceRate =
      totalQuotes.length > 0
        ? Math.round((acceptedQuotes.length / totalQuotes.length) * 100)
        : 0;

    return [
      {
        label: 'Devis en cours',
        value: quotesInProgress.length.toString(),
        sub: formatAmount(quotesTotal),
      },
      {
        label: 'Factures en attente',
        value: pendingInvoices.length.toString(),
        sub: formatAmount(pendingTotal),
      },
      {
        label: "Taux d'acceptation",
        value: `${acceptanceRate}%`,
        sub: 'ce mois',
      },
      {
        label: 'Delai moyen paiement',
        value: '12j',
        sub: '-3j vs mois dernier',
      },
    ];
  };

  const stats = calculateStats();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Devis & Factures</h1>
          <p className="mt-1 text-surface-500">Gerez vos devis et factures.</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            + Nouvelle facture
          </button>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            + Nouveau devis
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-surface-200 bg-white p-4">
            <p className="text-sm text-surface-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-surface-900">{stat.value}</p>
            <p className="mt-1 text-xs text-surface-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher par numero, client..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={filters.type}
          onChange={handleTypeChange}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700"
        >
          <option value="">Tous types</option>
          <option value="quote">Devis</option>
          <option value="invoice">Factures</option>
        </select>
        <select
          value={filters.status}
          onChange={handleStatusChange}
          className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700"
        >
          <option value="">Tous statuts</option>
          <option value="draft">Brouillon</option>
          <option value="sent">Envoye</option>
          <option value="accepted">Accepte</option>
          <option value="rejected">Refuse</option>
          <option value="paid">Paye</option>
          <option value="overdue">En retard</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-4 flex justify-center items-center py-12">
          <div className="text-surface-500">Chargement...</div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-surface-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Numero
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-surface-500">
                      Aucune commande trouvée
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleRowClick(order.id)}
                      className="hover:bg-surface-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-brand-600">
                        {order.number}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-900">
                        {order.contact?.name || `Contact #${order.contact_id}`}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            order.type === 'quote'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-brand-50 text-brand-700'
                          }`}
                        >
                          {typeConfig[order.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-surface-900">
                        {formatAmount(order.total_ttc)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            statusConfig[order.status].color
                          }`}
                        >
                          {statusConfig[order.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-500">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-surface-500">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
