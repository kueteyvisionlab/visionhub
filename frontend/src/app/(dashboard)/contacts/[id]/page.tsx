import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Contact Detail Page – Server Component (hardcoded demo data)      */
/* ------------------------------------------------------------------ */

/* ---------- helpers ---------- */
function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "emerald" | "amber" | "rose" | "violet" | "brand" | "outline-danger";
}) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  const variants: Record<string, string> = {
    default:
      "bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300",
    emerald:
      "bg-accent-emerald/10 text-accent-emerald dark:bg-accent-emerald/20",
    amber: "bg-accent-amber/10 text-accent-amber dark:bg-accent-amber/20",
    rose: "bg-accent-rose/10 text-accent-rose dark:bg-accent-rose/20",
    violet:
      "bg-accent-violet/10 text-accent-violet dark:bg-accent-violet/20",
    brand: "bg-brand-500/10 text-brand-500",
    "outline-danger":
      "border border-accent-rose text-accent-rose bg-transparent",
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 ${className}`}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">
      {children}
    </h2>
  );
}

/* ---------- page ---------- */
export default function ContactDetailPage() {
  /* ---- demo data ---- */
  const contact = {
    id: "c-001",
    prenom: "Marie",
    nom: "Dupont",
    initials: "MD",
    email: "marie.dupont@example.com",
    telephone: "06 12 34 56 78",
    entreprise: "SCI Les Jardins",
    type: "Client",
    score: 85,
    scoreLabel: "Chaud",
    dateCreation: "15/01/2026",
    tags: ["VIP", "B2B"],
  };

  const timeline: {
    date: string;
    label: string;
    dot: "brand" | "emerald" | "amber" | "violet" | "surface";
  }[] = [
    { date: "18/02", label: "Devis DEV-2026-042 envoyé", dot: "brand" },
    {
      date: "15/02",
      label: "Appel téléphonique — Discussion projet jardin",
      dot: "emerald",
    },
    {
      date: "12/02",
      label: "Email ouvert : Newsletter Février",
      dot: "amber",
    },
    {
      date: "10/02",
      label: "Deal créé : Aménagement terrasse — 4 800 €",
      dot: "violet",
    },
    {
      date: "05/02",
      label: "Note ajoutée : Client intéressé par entretien annuel",
      dot: "surface",
    },
    {
      date: "28/01",
      label: "Devis DEV-2026-035 accepté",
      dot: "emerald",
    },
    {
      date: "20/01",
      label: "Premier contact via formulaire web",
      dot: "brand",
    },
    { date: "15/01", label: "Contact créé", dot: "surface" },
  ];

  const deals = [
    {
      nom: "Aménagement terrasse",
      montant: "4 800 €",
      etape: "Proposition",
      variant: "brand" as const,
    },
    {
      nom: "Entretien annuel",
      montant: "1 200 €",
      etape: "Qualification",
      variant: "violet" as const,
    },
  ];

  const devis = [
    { ref: "DEV-2026-042", statut: "Envoyé", variant: "amber" as const },
    { ref: "DEV-2026-035", statut: "Accepté", variant: "emerald" as const },
  ];

  const notes = [
    {
      date: "10/02/2026",
      texte:
        "Client très intéressé par un contrat d'entretien annuel. Relancer début mars pour finaliser.",
    },
    {
      date: "20/01/2026",
      texte:
        "Premier échange positif. Souhaite un devis pour l'aménagement de sa terrasse et l'entretien du jardin.",
    },
  ];

  /* ---- dot colour map ---- */
  const dotColors: Record<string, string> = {
    brand: "bg-brand-500",
    emerald: "bg-accent-emerald",
    amber: "bg-accent-amber",
    violet: "bg-accent-violet",
    surface: "bg-surface-400",
  };

  /* ================================================================ */
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* left */}
        <div className="flex items-center gap-4">
          <Link
            href="/contacts"
            className="flex items-center gap-1 text-sm font-medium text-surface-500 transition hover:text-brand-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Contacts
          </Link>

          <span className="hidden h-6 w-px bg-surface-200 dark:bg-surface-700 sm:block" />

          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            {contact.prenom} {contact.nom}
          </h1>

          <Badge variant="brand">{contact.type}</Badge>
        </div>

        {/* right – action buttons */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.06.56l-3.535.884.884-3.536a2 2 0 01.56-1.06z"
              />
            </svg>
            Modifier
          </button>

          <button className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-4 py-2 text-sm font-medium text-surface-700 shadow-sm transition hover:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Envoyer email
          </button>

          <button className="inline-flex items-center gap-2 rounded-lg border border-accent-rose px-4 py-2 text-sm font-medium text-accent-rose shadow-sm transition hover:bg-accent-rose/5 focus:outline-none focus:ring-2 focus:ring-accent-rose/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3"
              />
            </svg>
            Supprimer
          </button>
        </div>
      </div>

      {/* ==================== BODY (3-col grid) ==================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ============ LEFT – 2 cols ============ */}
        <div className="space-y-6 lg:col-span-2">
          {/* ---- Contact info card ---- */}
          <Card>
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
                {contact.initials}
              </div>

              {/* Info grid */}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                  {contact.prenom} {contact.nom}
                </h2>

                <p className="mt-1 text-sm text-surface-500">
                  {contact.entreprise}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {/* Email */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Email
                    </dt>
                    <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-brand-500 underline-offset-2 hover:underline"
                      >
                        {contact.email}
                      </a>
                    </dd>
                  </div>

                  {/* Telephone */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Téléphone
                    </dt>
                    <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                      {contact.telephone}
                    </dd>
                  </div>

                  {/* Entreprise */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Entreprise
                    </dt>
                    <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                      {contact.entreprise}
                    </dd>
                  </div>

                  {/* Type */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Type
                    </dt>
                    <dd className="mt-1">
                      <Badge variant="brand">{contact.type}</Badge>
                    </dd>
                  </div>

                  {/* Score */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Score
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                        {contact.score}
                      </span>
                      <Badge variant="emerald">{contact.scoreLabel}</Badge>
                    </dd>
                  </div>

                  {/* Date creation */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Date de création
                    </dt>
                    <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                      {contact.dateCreation}
                    </dd>
                  </div>

                  {/* Tags */}
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Tags
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ---- Timeline card ---- */}
          <Card>
            <CardTitle>Historique d&apos;activité</CardTitle>

            <div className="relative mt-6">
              {/* vertical line */}
              <div className="absolute left-[7px] top-1.5 h-[calc(100%-12px)] w-px bg-surface-200 dark:bg-surface-700" />

              <ul className="space-y-6">
                {timeline.map((item, idx) => (
                  <li key={idx} className="relative flex gap-4 pl-6">
                    {/* dot */}
                    <span
                      className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-surface-900 ${dotColors[item.dot]}`}
                    />
                    {/* content */}
                    <div className="min-w-0">
                      <p className="text-sm text-surface-800 dark:text-surface-200">
                        {item.label}
                      </p>
                      <time className="mt-0.5 block text-xs text-surface-400">
                        {item.date}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* ============ RIGHT SIDEBAR – 1 col ============ */}
        <div className="space-y-6">
          {/* ---- Deals card ---- */}
          <Card>
            <CardTitle>Deals</CardTitle>

            <ul className="mt-4 divide-y divide-surface-100 dark:divide-surface-800">
              {deals.map((deal, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-surface-800 dark:text-surface-200">
                      {deal.nom}
                    </p>
                    <p className="text-sm text-surface-500">{deal.montant}</p>
                  </div>
                  <Badge variant={deal.variant}>{deal.etape}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {/* ---- Devis card ---- */}
          <Card>
            <CardTitle>Devis</CardTitle>

            <ul className="mt-4 divide-y divide-surface-100 dark:divide-surface-800">
              {devis.map((d, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {d.ref}
                  </p>
                  <Badge variant={d.variant}>{d.statut}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {/* ---- Notes card ---- */}
          <Card>
            <CardTitle>Notes</CardTitle>

            <ul className="mt-4 space-y-4">
              {notes.map((note, idx) => (
                <li key={idx}>
                  <time className="text-xs font-medium text-surface-400">
                    {note.date}
                  </time>
                  <p className="mt-1 text-sm leading-relaxed text-surface-700 dark:text-surface-300">
                    {note.texte}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          {/* ---- Tags card ---- */}
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle>Tags</CardTitle>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-200 text-surface-500 transition hover:bg-surface-50 hover:text-brand-500 dark:border-surface-700 dark:hover:bg-surface-800"
                aria-label="Ajouter un tag"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-300"
                >
                  {tag}
                  <button
                    className="ml-0.5 text-surface-400 transition hover:text-accent-rose"
                    aria-label={`Supprimer le tag ${tag}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
