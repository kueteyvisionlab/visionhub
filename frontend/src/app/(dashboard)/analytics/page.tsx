export default function AnalyticsPage() {
  const kpis = [
    { label: 'Chiffre d\'affaires', value: '127 500 EUR', change: '+15%', positive: true, period: 'vs trimestre dernier' },
    { label: 'Nouveaux contacts', value: '342', change: '+23%', positive: true, period: 'ce trimestre' },
    { label: 'Taux de conversion', value: '18.5%', change: '+2.3pts', positive: true, period: 'vs trimestre dernier' },
    { label: 'Panier moyen', value: '3 250 EUR', change: '-5%', positive: false, period: 'vs trimestre dernier' },
  ];

  const revenueByMonth = [
    { month: 'Sep', value: 32000, pct: 64 },
    { month: 'Oct', value: 38000, pct: 76 },
    { month: 'Nov', value: 35000, pct: 70 },
    { month: 'Dec', value: 42000, pct: 84 },
    { month: 'Jan', value: 45000, pct: 90 },
    { month: 'Fev', value: 50000, pct: 100 },
  ];

  const topClients = [
    { name: 'SCI Les Jardins', revenue: '18 500 EUR', deals: 4 },
    { name: 'Garage Martin', revenue: '15 200 EUR', deals: 7 },
    { name: 'Hotel Le Meridien', revenue: '12 800 EUR', deals: 2 },
    { name: 'Cabinet Moreau', revenue: '9 600 EUR', deals: 5 },
    { name: 'Restaurant Le Gourmet', revenue: '8 400 EUR', deals: 3 },
  ];

  const conversionFunnel = [
    { stage: 'Leads', count: 1247, pct: 100, color: 'bg-surface-300' },
    { stage: 'Qualifies', count: 485, pct: 39, color: 'bg-brand-300' },
    { stage: 'Proposition', count: 198, pct: 16, color: 'bg-brand-400' },
    { stage: 'Negociation', count: 87, pct: 7, color: 'bg-brand-500' },
    { stage: 'Gagnes', count: 52, pct: 4, color: 'bg-accent-emerald' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Analytiques</h1>
          <p className="mt-1 text-surface-500">Vue d&apos;ensemble de vos performances commerciales.</p>
        </div>
        <select className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
          <option>Ce trimestre</option>
          <option>Ce mois</option>
          <option>Cette annee</option>
          <option>Personnalise</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-surface-200 bg-white p-5">
            <p className="text-sm font-medium text-surface-500">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-surface-900">{kpi.value}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-sm font-medium ${kpi.positive ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                {kpi.change}
              </span>
              <span className="text-xs text-surface-400">{kpi.period}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Chiffre d&apos;affaires</h2>
          <p className="mt-1 text-sm text-surface-500">Evolution sur les 6 derniers mois</p>
          <div className="mt-6 flex items-end gap-3" style={{ height: 200 }}>
            {revenueByMonth.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-surface-600">{(m.value / 1000).toFixed(0)}k</span>
                <div
                  className="w-full rounded-t-md bg-brand-500 transition-all hover:bg-brand-600"
                  style={{ height: `${m.pct}%` }}
                />
                <span className="text-xs text-surface-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top clients */}
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-surface-900">Top clients</h2>
          <p className="mt-1 text-sm text-surface-500">Par chiffre d&apos;affaires</p>
          <div className="mt-6 space-y-4">
            {topClients.map((client, i) => (
              <div key={client.name} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-surface-900">{client.name}</p>
                  <p className="text-xs text-surface-400">{client.deals} deals</p>
                </div>
                <span className="text-sm font-semibold text-surface-700">{client.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-surface-900">Entonnoir de conversion</h2>
        <p className="mt-1 text-sm text-surface-500">Du lead au deal gagne</p>
        <div className="mt-6 space-y-3">
          {conversionFunnel.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-4">
              <span className="w-28 text-sm font-medium text-surface-700">{stage.stage}</span>
              <div className="flex-1">
                <div className="h-8 rounded-lg bg-surface-100">
                  <div
                    className={`flex h-8 items-center rounded-lg px-3 ${stage.color}`}
                    style={{ width: `${Math.max(stage.pct, 8)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{stage.count}</span>
                  </div>
                </div>
              </div>
              <span className="w-12 text-right text-sm text-surface-400">{stage.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
