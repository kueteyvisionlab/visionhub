interface Deal {
  id: number;
  company: string;
  amount: string;
  contact: string;
  score: 'hot' | 'warm' | 'cold';
  daysInStage: number;
}

interface PipelineColumn {
  name: string;
  color: string;
  headerBg: string;
  deals: Deal[];
}

const pipeline: PipelineColumn[] = [
  {
    name: 'Qualification',
    color: 'border-t-surface-800',
    headerBg: 'bg-surface-100',
    deals: [
      { id: 1, company: 'TechVision SAS', amount: '15 000 \u20ac', contact: 'Nicolas Garnier', score: 'warm', daysInStage: 3 },
      { id: 2, company: 'M\u00e9dia Sud', amount: '8 500 \u20ac', contact: 'Isabelle Petit', score: 'cold', daysInStage: 7 },
      { id: 3, company: 'EcoTransport', amount: '12 000 \u20ac', contact: 'Luc Fontaine', score: 'warm', daysInStage: 2 },
    ],
  },
  {
    name: 'Proposition',
    color: 'border-t-brand-500',
    headerBg: 'bg-brand-50',
    deals: [
      { id: 4, company: 'Groupe Innovatech', amount: '25 000 \u20ac', contact: 'Marie Lefebvre', score: 'hot', daysInStage: 5 },
      { id: 5, company: 'DigiCom France', amount: '18 000 \u20ac', contact: 'Sophie Bernard', score: 'warm', daysInStage: 12 },
      { id: 6, company: 'BatiGroupe', amount: '22 000 \u20ac', contact: 'Pierre Dupont', score: 'hot', daysInStage: 4 },
      { id: 7, company: 'NordLogistique', amount: '9 500 \u20ac', contact: 'Am\u00e9lie Durand', score: 'cold', daysInStage: 18 },
    ],
  },
  {
    name: 'N\u00e9gociation',
    color: 'border-t-accent-amber',
    headerBg: 'bg-accent-amber/10',
    deals: [
      { id: 8, company: 'LuxeH\u00f4tels', amount: '32 000 \u20ac', contact: 'Claire Rousseau', score: 'hot', daysInStage: 8 },
      { id: 9, company: 'GreenLogistics', amount: '14 500 \u20ac', contact: 'Thomas Moreau', score: 'warm', daysInStage: 6 },
      { id: 10, company: 'ArtisanPro', amount: '7 800 \u20ac', contact: 'Paul Mercier', score: 'warm', daysInStage: 3 },
    ],
  },
  {
    name: 'Gagn\u00e9',
    color: 'border-t-accent-emerald',
    headerBg: 'bg-accent-emerald/10',
    deals: [
      { id: 11, company: 'ACME Corp', amount: '28 000 \u20ac', contact: 'Jean Martin', score: 'hot', daysInStage: 1 },
      { id: 12, company: 'SolairePlus', amount: '19 500 \u20ac', contact: 'Laura Blanchard', score: 'hot', daysInStage: 1 },
      { id: 13, company: 'FoodExpress', amount: '11 200 \u20ac', contact: 'Marc Leroy', score: 'hot', daysInStage: 2 },
      { id: 14, company: 'UrbanDesign', amount: '16 800 \u20ac', contact: 'Julie Fabre', score: 'hot', daysInStage: 1 },
    ],
  },
];

function ScoreBadge({ score }: { score: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    hot: { label: 'Chaud', classes: 'bg-accent-emerald/10 text-accent-emerald' },
    warm: { label: 'Ti\u00e8de', classes: 'bg-accent-amber/10 text-accent-amber' },
    cold: { label: 'Froid', classes: 'bg-surface-100 text-surface-800' },
  };
  const { label, classes } = config[score] || config.cold;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function formatTotal(deals: Deal[]): string {
  const total = deals.reduce((sum, deal) => {
    const num = parseInt(deal.amount.replace(/[^\d]/g, ''), 10);
    return sum + num;
  }, 0);
  return total.toLocaleString('fr-FR') + ' \u20ac';
}

export default function DealsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Pipeline</h1>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau deal
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {pipeline.map((column) => (
          <div key={column.name} className={`rounded-xl border border-surface-200 bg-surface-50 overflow-hidden border-t-4 ${column.color}`}>
            {/* Column Header */}
            <div className={`px-4 py-3 ${column.headerBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-surface-900">{column.name}</h3>
                  <span className="text-xs font-medium bg-white text-surface-800 px-2 py-0.5 rounded-full shadow-sm">
                    {column.deals.length}
                  </span>
                </div>
                <span className="text-xs font-semibold text-surface-800">
                  {formatTotal(column.deals)}
                </span>
              </div>
            </div>

            {/* Deal Cards */}
            <div className="p-3 space-y-3">
              {column.deals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white rounded-lg border border-surface-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-surface-900 leading-tight">
                      {deal.company}
                    </h4>
                    <ScoreBadge score={deal.score} />
                  </div>
                  <p className="text-lg font-bold text-surface-900">{deal.amount}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-[10px] font-semibold">
                        {deal.contact
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <span className="text-xs text-surface-800">{deal.contact}</span>
                    </div>
                    <span className="text-xs text-surface-200">
                      {deal.daysInStage}j
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
