import Link from 'next/link';

const order = {
  id: 'DEV-2026-042',
  type: 'Devis',
  status: 'envoye',
  client: 'Marie Dupont',
  company: 'SCI Les Jardins',
  email: 'marie.dupont@example.com',
  date: '18/02/2026',
  validUntil: '18/03/2026',
  subtotal: 4000,
  tva: 800,
  total: 4800,
  notes: 'Devis valable 30 jours. Acompte de 30% a la commande.',
  items: [
    { description: 'Dalles terrasse gres cerame 60x60', qty: 45, unit: 'm2', price: 55, total: 2475 },
    { description: 'Pose et preparation du sol', qty: 45, unit: 'm2', price: 25, total: 1125 },
    { description: 'Bordures aluminium', qty: 12, unit: 'ml', price: 18, total: 216 },
    { description: 'Systeme arrosage automatique', qty: 1, unit: 'forfait', price: 184, total: 184 },
  ],
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    brouillon: 'bg-surface-100 text-surface-600',
    envoye: 'bg-brand-50 text-brand-700',
    accepte: 'bg-emerald-50 text-emerald-700',
    refuse: 'bg-rose-50 text-rose-700',
    payee: 'bg-emerald-50 text-emerald-700',
    'en attente': 'bg-amber-50 text-amber-700',
    'en retard': 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${styles[status] || styles.brouillon}`}>
      {status}
    </span>
  );
}

export default function OrderDetailPage() {
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
          <h1 className="text-2xl font-bold text-surface-900">{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            Telecharger PDF
          </button>
          <button className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            Dupliquer
          </button>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Convertir en facture
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
                  <p className="text-2xl font-bold text-surface-900">{order.type}</p>
                  <p className="mt-1 text-lg font-semibold text-surface-700">{order.id}</p>
                  <p className="mt-2 text-sm text-surface-500">Date : {order.date}</p>
                  <p className="text-sm text-surface-500">Valide jusqu&apos;au : {order.validUntil}</p>
                </div>
              </div>

              <div className="mt-8 rounded-lg bg-surface-50 p-4">
                <p className="text-xs font-semibold uppercase text-surface-400">Client</p>
                <p className="mt-1 font-semibold text-surface-900">{order.client}</p>
                <p className="text-sm text-surface-600">{order.company}</p>
                <p className="text-sm text-surface-500">{order.email}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="p-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase text-surface-500">Description</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Qte</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Unite</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Prix unit.</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase text-surface-500">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm text-surface-900">{item.description}</td>
                      <td className="py-3 text-right text-sm text-surface-700">{item.qty}</td>
                      <td className="py-3 text-right text-sm text-surface-500">{item.unit}</td>
                      <td className="py-3 text-right text-sm text-surface-700">{item.price.toLocaleString('fr-FR')} EUR</td>
                      <td className="py-3 text-right text-sm font-medium text-surface-900">{item.total.toLocaleString('fr-FR')} EUR</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Sous-total HT</span>
                    <span className="font-medium text-surface-900">{order.subtotal.toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">TVA (20%)</span>
                    <span className="font-medium text-surface-900">{order.tva.toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <div className="flex justify-between border-t border-surface-200 pt-2">
                    <span className="font-semibold text-surface-900">Total TTC</span>
                    <span className="text-lg font-bold text-brand-600">{order.total.toLocaleString('fr-FR')} EUR</span>
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
              <button className="w-full rounded-lg border border-surface-200 px-4 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50">
                Envoyer par email
              </button>
              <button className="w-full rounded-lg border border-surface-200 px-4 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50">
                Marquer comme accepte
              </button>
              <button className="w-full rounded-lg border border-surface-200 px-4 py-2 text-left text-sm font-medium text-surface-700 hover:bg-surface-50">
                Convertir en facture
              </button>
              <button className="w-full rounded-lg border border-rose-200 px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
                Marquer comme refuse
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Informations</h3>
            <dl className="mt-4 space-y-3">
              {[
                ['Type', order.type],
                ['Statut', order.status],
                ['Client', order.client],
                ['Entreprise', order.company],
                ['Date', order.date],
                ['Validite', order.validUntil],
                ['Cree par', 'Admin Vision'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-surface-500">{label}</dt>
                  <dd className="text-sm font-medium capitalize text-surface-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Deal link */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Deal associe</h3>
            <Link href="/deals/deal-001" className="mt-3 block rounded-lg border border-surface-100 p-3 hover:bg-surface-50">
              <p className="text-sm font-medium text-brand-600">Amenagement terrasse</p>
              <p className="mt-0.5 text-xs text-surface-500">4 800 EUR — Proposition</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
