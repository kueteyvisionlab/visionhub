"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiDelete } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Contact Detail Page – Client Component with API integration      */
/* ------------------------------------------------------------------ */

/* ---------- types ---------- */
interface Contact {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  score?: number;
  address?: string;
  preferred_channel?: string;
  gdpr_consent?: boolean;
  tags?: string[];
  created_at: string;
  last_contact_at?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

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

/* ---------- helper functions ---------- */
function getScoreLabel(score?: number): { label: string; variant: "emerald" | "amber" | "default" } {
  if (!score) return { label: "Froid", variant: "default" };
  if (score >= 70) return { label: "Chaud", variant: "emerald" };
  if (score >= 40) return { label: "Tiède", variant: "amber" };
  return { label: "Froid", variant: "default" };
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatTimelineDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function getTimelineDotColor(type: string): "brand" | "emerald" | "amber" | "violet" | "surface" {
  const typeMap: Record<string, "brand" | "emerald" | "amber" | "violet" | "surface"> = {
    quote: "brand",
    call: "emerald",
    email: "amber",
    deal: "violet",
    note: "surface",
    contact_created: "surface",
  };
  return typeMap[type] || "surface";
}

/* ---------- page ---------- */
export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!session?.access_token) {
      router.push("/login");
      return;
    }

    fetchContactData();
  }, [session, authLoading, params.id]);

  async function fetchContactData() {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch contact details
      const contactResponse = await apiGet<Contact>(
        `/contacts/${params.id}`,
        session.access_token
      );

      if (contactResponse.error) {
        setError(contactResponse.error);
        setLoading(false);
        return;
      }

      if (!contactResponse.data) {
        setError("Contact non trouvé");
        setLoading(false);
        return;
      }

      setContact(contactResponse.data);

      // Fetch timeline
      const timelineResponse = await apiGet<TimelineEvent[]>(
        `/contacts/${params.id}/timeline`,
        session.access_token
      );

      if (!timelineResponse.error && timelineResponse.data) {
        setTimeline(timelineResponse.data);
      }
    } catch (err) {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!session?.access_token || !contact) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${contact.first_name} ${contact.last_name} ?`)) {
      return;
    }

    setDeleting(true);

    const response = await apiDelete(`/contacts/${params.id}`, session.access_token);

    if (response.error) {
      alert(`Erreur: ${response.error}`);
      setDeleting(false);
    } else {
      router.push("/contacts");
    }
  }

  /* ---- dot colour map ---- */
  const dotColors: Record<string, string> = {
    brand: "bg-brand-500",
    emerald: "bg-accent-emerald",
    amber: "bg-accent-amber",
    violet: "bg-accent-violet",
    surface: "bg-surface-400",
  };

  /* ---- loading skeleton ---- */
  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-12 w-96 animate-pulse rounded-lg bg-surface-200 dark:bg-surface-800" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-96 animate-pulse rounded-2xl bg-surface-200 dark:bg-surface-800" />
            <div className="h-96 animate-pulse rounded-2xl bg-surface-200 dark:bg-surface-800" />
          </div>
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl bg-surface-200 dark:bg-surface-800" />
            <div className="h-48 animate-pulse rounded-2xl bg-surface-200 dark:bg-surface-800" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- error state ---- */
  if (error || !contact) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-2xl border border-accent-rose bg-accent-rose/5 p-8 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-accent-rose"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-surface-900 dark:text-surface-50">
              {error || "Contact non trouvé"}
            </h2>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
              Le contact demandé n&apos;existe pas ou a été supprimé.
            </p>
            <Link
              href="/contacts"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
            >
              Retour aux contacts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scoreInfo = getScoreLabel(contact.score);
  const initials = getInitials(contact.first_name, contact.last_name);

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
            {contact.first_name} {contact.last_name}
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

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-accent-rose px-4 py-2 text-sm font-medium text-accent-rose shadow-sm transition hover:bg-accent-rose/5 focus:outline-none focus:ring-2 focus:ring-accent-rose/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3"
              />
            </svg>
            {deleting ? "Suppression..." : "Supprimer"}
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
                {initials}
              </div>

              {/* Info grid */}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                  {contact.first_name} {contact.last_name}
                </h2>

                {contact.company_name && (
                  <p className="mt-1 text-sm text-surface-500">
                    {contact.company_name}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {/* Email */}
                  {contact.email && (
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
                  )}

                  {/* Telephone */}
                  {contact.phone && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                        Téléphone
                      </dt>
                      <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                        {contact.phone}
                      </dd>
                    </div>
                  )}

                  {/* Entreprise */}
                  {contact.company_name && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                        Entreprise
                      </dt>
                      <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                        {contact.company_name}
                      </dd>
                    </div>
                  )}

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
                  {contact.score !== undefined && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                        Score
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                          {contact.score}
                        </span>
                        <Badge variant={scoreInfo.variant}>{scoreInfo.label}</Badge>
                      </dd>
                    </div>
                  )}

                  {/* Date creation */}
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-surface-400">
                      Date de création
                    </dt>
                    <dd className="mt-1 text-sm text-surface-800 dark:text-surface-200">
                      {formatDate(contact.created_at)}
                    </dd>
                  </div>

                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
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
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* ---- Timeline card ---- */}
          <Card>
            <CardTitle>Historique d&apos;activité</CardTitle>

            {timeline.length > 0 ? (
              <div className="relative mt-6">
                {/* vertical line */}
                <div className="absolute left-[7px] top-1.5 h-[calc(100%-12px)] w-px bg-surface-200 dark:bg-surface-700" />

                <ul className="space-y-6">
                  {timeline.map((item) => {
                    const dotColor = getTimelineDotColor(item.type);
                    return (
                      <li key={item.id} className="relative flex gap-4 pl-6">
                        {/* dot */}
                        <span
                          className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-surface-900 ${dotColors[dotColor]}`}
                        />
                        {/* content */}
                        <div className="min-w-0">
                          <p className="text-sm text-surface-800 dark:text-surface-200">
                            {item.description}
                          </p>
                          <time className="mt-0.5 block text-xs text-surface-400">
                            {formatTimelineDate(item.created_at)}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-surface-500">
                Aucune activité enregistrée
              </p>
            )}
          </Card>
        </div>

        {/* ============ RIGHT SIDEBAR – 1 col ============ */}
        <div className="space-y-6">
          {/* ---- Deals card ---- */}
          <Card>
            <CardTitle>Deals</CardTitle>
            <p className="mt-4 text-sm text-surface-500">
              Aucun deal associé
            </p>
          </Card>

          {/* ---- Devis card ---- */}
          <Card>
            <CardTitle>Devis</CardTitle>
            <p className="mt-4 text-sm text-surface-500">
              Aucun devis associé
            </p>
          </Card>

          {/* ---- Notes card ---- */}
          <Card>
            <CardTitle>Notes</CardTitle>
            <p className="mt-4 text-sm text-surface-500">
              Aucune note associée
            </p>
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

            {contact.tags && contact.tags.length > 0 ? (
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
            ) : (
              <p className="mt-4 text-sm text-surface-500">
                Aucun tag
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
