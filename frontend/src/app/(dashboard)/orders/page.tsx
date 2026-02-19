export default function OrdersPage() {
  const orders = [
    { id: 'DEV-2026-042', client: 'SCI Les Jardins', type: 'Devis', amount: '4 800 EUR', status: 'envoye', date: '18/02/2026', statusColor: 'bg-brand-50 text-brand-700' },
    { id: 'FAC-2026-038', client: 'Garage Martin', type: 'Facture', amount: '2 350 EUR', status: 'payee', date: '17/02/2026', statusColor: 'bg-emerald-50 text-emerald-700' },
    { id: 'DEV-2026-041', client: 'Hotel Le Meridien', type: 'Devis', amount: '12 500 EUR', status: 'accepte', date: '16/02/2026', statusColor: 'bg-emerald-50 text-emerald-700' },
    { id: 'FAC-2026-037', client: 'Cabinet Moreau', type: 'Facture', amount: '1 800 EUR', status: 'en attente', date: '15/02/2026', statusColor: 'bg-amber-50 text-amber-700' },
    { id: 'DEV-2026-040', client: 'Restaurant Le Gourmet', type: 'Devis', amount: '6 200 EUR', status: 'brouillon', date: '15/02/2026', statusColor: 'bg-surface-100 text-surface-600' },
    { id: 'FAC-2026-036', client: 'Salon Beaute Plus', type: 'Facture', amount: '950 EUR', status: 'en retard', date: '10/02/2026', statusColor: 'bg-rose-50 text-rose-700' },
    { id: 'DEV-2026-039', client: 'Dr. Lambert', type: 'Devis', amount: '3 400 EUR', status: 'refuse', date: '09/02/2026', statusColor: 'bg-rose-50 text-rose-700' },
    { id: 'FAC-2026-035', client: 'Espaces Verts Durand', type: 'Facture', amount: '7 800 EUR', status: 'payee', date: '08/02/2026', statusColor: 'bg-emerald-50 text-emerald-700' },
  ];

  const stats = [
    { label: 'Devis en cours', value: '12', sub: '45 200 EUR' },
    { label: 'Factures en attente', value: '5', sub: '18 750 EUR' },
    { label: 'Taux d\'acceptation', value: '89%', sub: 'ce mois' },
    { label: 'Delai moyen paiement', value: '12j', sub: '-3j vs mois dernier' },
  ];

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
            className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700">
          <option>Tous types</option>
          <option>Devis</option>
          <option>Factures</option>
        </select>
        <select className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-700">
          <option>Tous statuts</option>
          <option>Brouillon</option>
          <option>Envoye</option>
          <option>Accepte</option>
          <option>Refuse</option>
          <option>Paye</option>
          <option>En retard</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-surface-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100 bg-surface-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Numero</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Client</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-brand-600">{order.id}</td>
                <td className="px-6 py-4 text-sm text-surface-900">{order.client}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${order.type === 'Devis' ? 'bg-violet-50 text-violet-700' : 'bg-brand-50 text-brand-700'}`}>
                    {order.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-surface-900">{order.amount}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${order.statusColor}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-surface-500">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
