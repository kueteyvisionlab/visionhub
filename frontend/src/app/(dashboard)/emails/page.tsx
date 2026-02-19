// =============================================================================
// Email Marketing Dashboard — Vision CRM
// Server Component | Next.js 14 | Tailwind CSS
// =============================================================================

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Campaign {
  nom: string;
  statut: "envoyee" | "programmee" | "active";
  statutLabel: string;
  destinataires: string;
  ouvertures: string;
  clics: string;
  date: string;
}

interface Template {
  nom: string;
  type: string;
  modifie: string;
  gradientFrom: string;
  gradientTo: string;
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const stats = [
  {
    label: "Emails envoy\u00e9s",
    value: "8 420",
    change: "+18% ce mois",
    positive: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: "Taux d\u2019ouverture",
    value: "32.5%",
    change: "+2.1 pts",
    positive: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    label: "Taux de clic",
    value: "4.8%",
    change: "+0.5 pts",
    positive: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
      </svg>
    ),
  },
  {
    label: "D\u00e9sabonnements",
    value: "12",
    change: "-25%",
    positive: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
];

const campaigns: Campaign[] = [
  {
    nom: "Offre de rentr\u00e9e 2026",
    statut: "envoyee",
    statutLabel: "Envoy\u00e9e",
    destinataires: "2 450",
    ouvertures: "34%",
    clics: "5.2%",
    date: "15/02/2026",
  },
  {
    nom: "Newsletter F\u00e9vrier",
    statut: "envoyee",
    statutLabel: "Envoy\u00e9e",
    destinataires: "1 890",
    ouvertures: "28%",
    clics: "3.8%",
    date: "12/02/2026",
  },
  {
    nom: "Promotion Saint-Valentin",
    statut: "envoyee",
    statutLabel: "Envoy\u00e9e",
    destinataires: "2 100",
    ouvertures: "42%",
    clics: "8.1%",
    date: "10/02/2026",
  },
  {
    nom: "Relance devis en attente",
    statut: "programmee",
    statutLabel: "Programm\u00e9e",
    destinataires: "340",
    ouvertures: "\u2014",
    clics: "\u2014",
    date: "20/02/2026",
  },
  {
    nom: "Bienvenue nouveaux clients",
    statut: "active",
    statutLabel: "Active (s\u00e9quence)",
    destinataires: "156",
    ouvertures: "45%",
    clics: "6.2%",
    date: "Auto",
  },
  {
    nom: "Anniversaire client",
    statut: "active",
    statutLabel: "Active (s\u00e9quence)",
    destinataires: "89",
    ouvertures: "52%",
    clics: "7.8%",
    date: "Auto",
  },
];

const templates: Template[] = [
  {
    nom: "Promotion g\u00e9n\u00e9rale",
    type: "Promotion",
    modifie: "14/02/2026",
    gradientFrom: "from-[#3269ff]",
    gradientTo: "to-[#8b5cf6]",
  },
  {
    nom: "Newsletter mensuelle",
    type: "Newsletter",
    modifie: "10/02/2026",
    gradientFrom: "from-[#10b981]",
    gradientTo: "to-[#3269ff]",
  },
  {
    nom: "Relance devis",
    type: "Relance",
    modifie: "08/02/2026",
    gradientFrom: "from-[#f59e0b]",
    gradientTo: "to-[#f43f5e]",
  },
  {
    nom: "Bienvenue",
    type: "Onboarding",
    modifie: "05/02/2026",
    gradientFrom: "from-[#8b5cf6]",
    gradientTo: "to-[#f43f5e]",
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function statutBadgeClasses(statut: Campaign["statut"]): string {
  switch (statut) {
    case "envoyee":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "programmee":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "active":
      return "bg-[#3269ff]/10 text-[#3269ff] ring-[#3269ff]/20";
  }
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function EmailMarketingPage() {
  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">
            Email Marketing
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            G\u00e9rez vos campagnes, templates et s\u00e9quences automatiques.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[#3269ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#3269ff] shadow-sm transition hover:bg-[#3269ff]/5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouveau template
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3269ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a46f5]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle campagne
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Stats Row                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-surface-500">
                {stat.label}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3269ff]/10 text-[#3269ff]">
                {stat.icon}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-surface-900">
              {stat.value}
            </p>
            <p
              className={`mt-1 text-xs font-medium ${
                stat.positive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Tabs                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-surface-200">
        <nav className="-mb-px flex gap-6" aria-label="Onglets">
          <button
            type="button"
            className="border-b-2 border-[#3269ff] px-1 pb-3 text-sm font-semibold text-[#3269ff]"
          >
            Campagnes
          </button>
          <button
            type="button"
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-surface-500 transition hover:border-surface-300 hover:text-surface-700"
          >
            Templates
          </button>
        </nav>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Campaigns Table                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                {["Nom", "Statut", "Destinataires", "Ouvertures", "Clics", "Date"].map(
                  (col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {campaigns.map((c) => (
                <tr
                  key={c.nom}
                  className="transition hover:bg-surface-50/60"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-surface-900">
                    {c.nom}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statutBadgeClasses(
                        c.statut
                      )}`}
                    >
                      {c.statutLabel}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-surface-600">
                    {c.destinataires}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-surface-600">
                    {c.ouvertures}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-surface-600">
                    {c.clics}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-surface-500">
                    {c.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Templates Grid                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-surface-900">
          Templates
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <div
              key={t.nom}
              className="group overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {/* Preview placeholder */}
              <div
                className={`h-36 bg-gradient-to-br ${t.gradientFrom} ${t.gradientTo} flex items-center justify-center`}
              >
                <svg
                  className="h-10 w-10 text-white/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>

              {/* Card body */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-surface-900">
                  {t.nom}
                </h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-600">
                    {t.type}
                  </span>
                  <span className="text-xs text-surface-400">
                    Modifi\u00e9 le {t.modifie}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
