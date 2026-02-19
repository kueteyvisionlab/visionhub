import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Sector icons (inline SVG for each of the 9 metiers)               */
/* ------------------------------------------------------------------ */
const sectors = [
  {
    name: "Garage",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
  },
  {
    name: "Hotel",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  {
    name: "Restaurant",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z" />
      </svg>
    ),
  },
  {
    name: "Coiffure",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    name: "Dentiste",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    name: "Avocat",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
      </svg>
    ),
  },
  {
    name: "Paysagiste",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    name: "Consultant",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    name: "E-commerce",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Features data                                                      */
/* ------------------------------------------------------------------ */
const features = [
  {
    title: "CRM Intelligent",
    description:
      "Centralisez tous vos contacts, suivez chaque interaction et exploitez l'IA pour scorer vos leads automatiquement.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    color: "bg-brand-50 text-brand-600",
  },
  {
    title: "Devis & Facturation",
    description:
      "Generez des devis professionnels en moins de 10 minutes. Convertissez-les en factures conformes en un clic.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Pipeline Kanban",
    description:
      "Visualisez votre pipeline commercial en vue Kanban. Glissez-deposez vos opportunites d'une etape a l'autre.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600",
  },
  {
    title: "Email Marketing",
    description:
      "Creez des campagnes email et des sequences automatisees. Segmentez vos contacts et mesurez vos performances.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Open Banking",
    description:
      "Connectez vos comptes bancaires via Bridge API. Rapprochement automatique des paiements et suivi de tresorerie en temps reel.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    color: "bg-rose-50 text-rose-600",
  },
  {
    title: "Portail Client",
    description:
      "Offrez a vos clients un espace dedie pour consulter leurs devis, factures et suivre l'avancement de leurs projets.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
      </svg>
    ),
    color: "bg-sky-50 text-sky-600",
  },
];

/* ------------------------------------------------------------------ */
/*  Steps data                                                         */
/* ------------------------------------------------------------------ */
const steps = [
  {
    step: "01",
    title: "Inscrivez-vous",
    description:
      "Creez votre compte en quelques secondes. Aucune carte bancaire requise pour l'essai gratuit de 14 jours.",
  },
  {
    step: "02",
    title: "Configurez votre metier",
    description:
      "Selectionnez votre secteur d'activite et personnalisez les champs, les workflows et les modeles de documents.",
  },
  {
    step: "03",
    title: "Gerez tout en un seul endroit",
    description:
      "Contacts, devis, factures, pipeline, marketing et comptabilite : tout est centralise dans une seule plateforme.",
  },
];

/* ------------------------------------------------------------------ */
/*  Metrics data                                                       */
/* ------------------------------------------------------------------ */
const metrics = [
  { value: "95%", label: "Parite fonctionnelle avec HubSpot" },
  { value: "9", label: "Metiers supportes nativement" },
  { value: "<10 min", label: "Pour creer votre premier devis" },
  { value: "275 EUR/mois", label: "Cout d'infrastructure complet" },
];

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */
export default function HomePage() {
  return (
    <>
      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white pb-20 pt-20 lg:pt-32">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-100/40 blur-3xl" />
          <div className="absolute -left-40 top-1/2 h-[400px] w-[400px] rounded-full bg-violet-100/30 blur-3xl" />
        </div>

        <div className="section-container section-padding relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Nouveau : Module E-commerce disponible
            </div>

            <h1 className="font-serif text-5xl leading-tight tracking-tight text-surface-900 sm:text-6xl lg:text-7xl">
              Le CRM qui s&apos;adapte{" "}
              <span className="gradient-text">a votre metier</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-surface-600 sm:text-xl">
              La plateforme tout-en-un pour les PME francaises. CRM, devis,
              facturation, marketing et open banking — avec des modules dedies
              pour 9 secteurs d&apos;activite.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup" className="btn-primary !px-8 !py-4 !text-base">
                Demarrer gratuitement
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link href="/demo" className="btn-secondary !px-8 !py-4 !text-base">
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Voir la demo
              </Link>
            </div>

            <p className="mt-6 text-sm text-surface-400">
              Essai gratuit de 14 jours -- Aucune carte bancaire requise
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TRUSTED BY / SECTORS                                         */}
      {/* ============================================================ */}
      <section className="border-y border-surface-100 bg-surface-50 py-16">
        <div className="section-container section-padding">
          <p className="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-surface-400">
            Concu pour les PME francaises
          </p>
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-5 lg:grid-cols-9">
            {sectors.map((sector) => (
              <div
                key={sector.name}
                className="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="text-surface-500">{sector.icon}</div>
                <span className="text-xs font-medium text-surface-600">
                  {sector.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES GRID                                                */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="section-container section-padding">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-4xl tracking-tight text-surface-900 sm:text-5xl">
              Tout ce dont vous avez besoin, rien de superflu
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              Une suite complete d&apos;outils pour gerer votre activite au
              quotidien, sans avoir a jongler entre plusieurs logiciels.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-surface-100 bg-white p-8 transition-all hover:border-brand-200 hover:shadow-lg"
              >
                <div
                  className={`inline-flex rounded-xl p-3 ${feature.color}`}
                >
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-surface-900">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-relaxed text-surface-500">
                  {feature.description}
                </p>
                <Link
                  href="/features"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
                >
                  En savoir plus
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section className="bg-surface-900 py-24">
        <div className="section-container section-padding">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">
              Operationnel en 3 etapes
            </h2>
            <p className="mt-4 text-lg text-surface-400">
              Pas besoin de consultant ni de formation complexe. Commencez a
              utiliser Vision CRM des aujourd&apos;hui.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.step} className="relative">
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-12 hidden h-px w-full bg-gradient-to-r from-brand-500/50 to-transparent lg:block" />
                )}
                <div className="rounded-2xl border border-surface-700 bg-surface-800 p-8">
                  <span className="font-serif text-5xl font-bold text-brand-500/30">
                    {step.step}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-surface-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* METRICS                                                      */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="section-container section-padding">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-4xl tracking-tight text-surface-900 sm:text-5xl">
              Des resultats concrets
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              Vision CRM est concu pour offrir la puissance des grands CRM a un
              prix accessible pour les PME.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-surface-100 bg-surface-50 p-8 text-center"
              >
                <p className="font-serif text-4xl font-bold text-brand-600 lg:text-5xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-medium text-surface-500">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA                                                          */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-700 py-24">
        <div className="section-container section-padding">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">
              Pret a transformer votre activite ?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-brand-100">
              Rejoignez les PME qui ont choisi Vision CRM pour simplifier leur
              gestion quotidienne. A partir de 0 EUR/mois.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-brand-700 shadow-sm transition-all hover:bg-brand-50"
              >
                Commencer gratuitement
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white transition-all hover:border-white/60 hover:bg-white/10"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
