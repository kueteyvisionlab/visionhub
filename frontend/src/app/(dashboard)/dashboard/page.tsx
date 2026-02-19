const kpiCards = [
  {
    title: 'Contacts',
    value: '1 247',
    change: '+12% ce mois',
    changeType: 'positive' as const,
    bgColor: 'bg-accent-emerald/10',
    iconColor: 'text-accent-emerald',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    title: 'Deals en cours',
    value: '38',
    change: '245 000 \u20ac',
    changeType: 'neutral' as const,
    bgColor: 'bg-accent-violet/10',
    iconColor: 'text-accent-violet',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'Devis envoy\u00e9s',
    value: '24',
    change: '89% taux acceptation',
    changeType: 'positive' as const,
    bgColor: 'bg-accent-amber/10',
    iconColor: 'text-accent-amber',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: 'CA ce mois',
    value: '42 500 \u20ac',
    change: '+8% vs mois dernier',
    changeType: 'positive' as const,
    bgColor: 'bg-accent-emerald/10',
    iconColor: 'text-accent-emerald',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
];

const recentActivity = [
  {
    initials: 'ML',
    name: 'Marie Lefebvre',
    action: 'a accept\u00e9 le devis',
    target: 'DEV-2024-089',
    time: 'Il y a 15 min',
    color: 'bg-accent-emerald',
  },
  {
    initials: 'PD',
    name: 'Pierre Dupont',
    action: 'a \u00e9t\u00e9 d\u00e9plac\u00e9 vers',
    target: 'N\u00e9gociation',
    time: 'Il y a 45 min',
    color: 'bg-accent-violet',
  },
  {
    initials: 'SB',
    name: 'Sophie Bernard',
    action: 'nouveau contact ajout\u00e9 par',
    target: 'Import CSV',
    time: 'Il y a 2h',
    color: 'bg-brand-500',
  },
  {
    initials: 'JM',
    name: 'Jean Martin',
    action: 'a envoy\u00e9 un email \u00e0',
    target: 'Groupe Innovatech',
    time: 'Il y a 3h',
    color: 'bg-accent-amber',
  },
  {
    initials: 'CR',
    name: 'Claire Rousseau',
    action: 'deal gagn\u00e9',
    target: '18 500 \u20ac',
    time: 'Il y a 5h',
    color: 'bg-accent-emerald',
  },
];

const pipelineColumns = [
  { name: 'Qualification', count: 3, amount: '35 000 \u20ac', color: 'bg-surface-200', barColor: 'bg-surface-800' },
  { name: 'Proposition', count: 5, amount: '82 000 \u20ac', color: 'bg-brand-100', barColor: 'bg-brand-500' },
  { name: 'N\u00e9gociation', count: 2, amount: '48 000 \u20ac', color: 'bg-accent-amber/20', barColor: 'bg-accent-amber' },
  { name: 'Gagn\u00e9', count: 8, amount: '125 000 \u20ac', color: 'bg-accent-emerald/20', barColor: 'bg-accent-emerald' },
];

export default function DashboardPage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Bonjour, Admin</h1>
        <p className="text-sm text-surface-200 mt-1 capitalize">{dateStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-6 shadow-sm border border-surface-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-200">{card.title}</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center ${card.iconColor}`}>
                {card.icon}
              </div>
            </div>
            <p className={`text-sm mt-3 font-medium ${
              card.changeType === 'positive'
                ? 'text-accent-emerald'
                : card.changeType === 'neutral'
                ? 'text-accent-violet'
                : 'text-accent-rose'
            }`}>
              {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom section: Activity + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200">
          <div className="px-6 py-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900">Activit\u00e9 r\u00e9cente</h2>
          </div>
          <div className="divide-y divide-surface-100">
            {recentActivity.map((activity, index) => (
              <div key={index} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full ${activity.color} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
                  {activity.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-900">
                    <span className="font-medium">{activity.name}</span>{' '}
                    {activity.action}{' '}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-surface-200 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200">
          <div className="px-6 py-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold text-surface-900">Pipeline</h2>
          </div>
          <div className="p-6 space-y-5">
            {pipelineColumns.map((col) => (
              <div key={col.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-900">{col.name}</span>
                    <span className="text-xs font-medium bg-surface-100 text-surface-800 px-2 py-0.5 rounded-full">
                      {col.count}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-surface-900">{col.amount}</span>
                </div>
                <div className={`w-full h-3 rounded-full ${col.color}`}>
                  <div
                    className={`h-3 rounded-full ${col.barColor}`}
                    style={{ width: `${(col.count / 8) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
