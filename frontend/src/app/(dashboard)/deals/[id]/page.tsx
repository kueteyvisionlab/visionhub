import Link from 'next/link';

const deal = {
  id: 'deal-001',
  name: 'Amenagement terrasse',
  company: 'SCI Les Jardins',
  contact: 'Marie Dupont',
  amount: 4800,
  stage: 'Proposition',
  score: 85,
  scoreLabel: 'Chaud',
  probability: 75,
  createdAt: '10/02/2026',
  expectedClose: '15/03/2026',
  lastActivity: '18/02/2026',
  daysInStage: 8,
  assignedTo: 'Admin Vision',
  description: 'Projet d\'amenagement complet de la terrasse avec pose de dalles, creation d\'un espace vert et installation d\'un systeme d\'arrosage automatique.',
};

const activities = [
  { date: '18/02', action: 'Devis DEV-2026-042 envoye au client', type: 'devis', color: 'bg-brand-500' },
  { date: '16/02', action: 'Passage en etape "Proposition"', type: 'stage', color: 'bg-violet-500' },
  { date: '15/02', action: 'Appel avec Marie Dupont - Validation du cahier des charges', type: 'call', color: 'bg-emerald-500' },
  { date: '12/02', action: 'Email envoye : Proposition commerciale', type: 'email', color: 'bg-amber-500' },
  { date: '10/02', action: 'Deal cree depuis le formulaire web', type: 'create', color: 'bg-surface-400' },
];

const stageHistory = [
  { stage: 'Qualification', entered: '10/02/2026', duration: '4 jours' },
  { stage: 'Proposition', entered: '14/02/2026', duration: '8 jours (en cours)' },
];

export default function DealDetailPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/deals" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Pipeline
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{deal.name}</h1>
          <p className="mt-1 text-surface-500">{deal.company} — {deal.contact}</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50">
            Modifier
          </button>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Deplacer l&apos;etape
          </button>
        </div>
      </div>

      {/* Stage progress */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6">
        <div className="flex items-center gap-2">
          {['Qualification', 'Proposition', 'Negociation', 'Gagne'].map((stage, i) => {
            const isActive = stage === deal.stage;
            const isPast = i < ['Qualification', 'Proposition', 'Negociation', 'Gagne'].indexOf(deal.stage);
            return (
              <div key={stage} className="flex flex-1 flex-col items-center">
                <div className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium ${
                  isActive ? 'bg-brand-500 text-white' :
                  isPast ? 'bg-brand-100 text-brand-700' :
                  'bg-surface-100 text-surface-400'
                }`}>
                  {stage}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left - Details + Activity */}
        <div className="space-y-6 lg:col-span-2">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Montant</p>
              <p className="mt-1 text-xl font-bold text-surface-900">{deal.amount.toLocaleString('fr-FR')} EUR</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Probabilite</p>
              <p className="mt-1 text-xl font-bold text-surface-900">{deal.probability}%</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Score</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xl font-bold text-surface-900">{deal.score}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{deal.scoreLabel}</span>
              </div>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Jours en etape</p>
              <p className="mt-1 text-xl font-bold text-surface-900">{deal.daysInStage}j</p>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-surface-900">Description</h2>
            <p className="mt-3 leading-relaxed text-surface-600">{deal.description}</p>
          </div>

          {/* Activity timeline */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-surface-900">Activite</h2>
            <div className="mt-4 space-y-0">
              {activities.map((activity, i) => (
                <div key={i} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${activity.color}`} />
                    {i < activities.length - 1 && <div className="mt-1 w-px flex-1 bg-surface-200" />}
                  </div>
                  <div className="flex-1 -mt-1">
                    <p className="text-sm text-surface-900">{activity.action}</p>
                    <p className="mt-0.5 text-xs text-surface-400">{activity.date}/2026</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Deal info */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Informations</h3>
            <dl className="mt-4 space-y-3">
              {[
                ['Contact', deal.contact],
                ['Entreprise', deal.company],
                ['Responsable', deal.assignedTo],
                ['Cree le', deal.createdAt],
                ['Cloture prevue', deal.expectedClose],
                ['Derniere activite', deal.lastActivity],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-sm text-surface-500">{label}</dt>
                  <dd className="text-sm font-medium text-surface-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Stage history */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Historique des etapes</h3>
            <div className="mt-4 space-y-3">
              {stageHistory.map((h) => (
                <div key={h.stage} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{h.stage}</p>
                    <p className="text-xs text-surface-400">Depuis le {h.entered}</p>
                  </div>
                  <span className="text-xs text-surface-500">{h.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-surface-900">Documents lies</h3>
            <div className="mt-4 space-y-2">
              {[
                { name: 'DEV-2026-042', type: 'Devis', status: 'Envoye', statusColor: 'text-brand-600' },
                { name: 'Cahier des charges.pdf', type: 'Document', status: '', statusColor: '' },
              ].map((doc) => (
                <div key={doc.name} className="flex items-center justify-between rounded-lg border border-surface-100 p-3">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-surface-900">{doc.name}</p>
                      <p className="text-xs text-surface-400">{doc.type}</p>
                    </div>
                  </div>
                  {doc.status && <span className={`text-xs font-medium ${doc.statusColor}`}>{doc.status}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
