import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fonctionnalites — Vision CRM",
  description:
    "Decouvrez toutes les fonctionnalites de Vision CRM : CRM, devis, facturation, pipeline Kanban, email marketing, open banking et modules metiers pour 9 secteurs.",
};

/* ------------------------------------------------------------------ */
/*  Feature categories                                                 */
/* ------------------------------------------------------------------ */

const crmCore = [
  {
    name: "Gestion des contacts",
    description:
      "Base de donnees centralisee avec fiches contact enrichies, historique complet des interactions et segmentation avancee par tags.",
  },
  {
    name: "Timeline d'activite",
    description:
      "Visualisez chronologiquement chaque email, appel, reunion, devis et paiement pour chaque contact ou entreprise.",
  },
  {
    name: "Tags et segments",
    description:
      "Organisez vos contacts avec un systeme de tags flexible et creez des segments dynamiques bases sur des criteres multiples.",
  },
  {
    name: "RBAC et permissions",
    description:
      "Controlez finement les acces avec un systeme de roles granulaire : administrateur, commercial, support, comptable, lecture seule.",
  },
];

const ventes = [
  {
    name: "Devis professionnels",
    description:
      "Creez des devis conformes en moins de 10 minutes avec vos modeles personnalises, conditions generales et calcul automatique de la TVA.",
  },
  {
    name: "Facturation automatisee",
    description:
      "Convertissez vos devis en factures en un clic. Numerotation sequentielle, relances automatiques et export comptable.",
  },
  {
    name: "Pipeline Kanban",
    description:
      "Visualisez votre pipeline commercial en glissant-deposant vos opportunites entre les etapes. Personnalisez les colonnes selon votre processus.",
  },
  {
    name: "Lead scoring IA",
    description:
      "L'intelligence artificielle analyse le comportement de vos prospects et attribue un score de maturite pour prioriser vos actions commerciales.",
  },
];

const marketing = [
  {
    name: "Campagnes email",
    description:
      "Creez des campagnes email avec un editeur drag-and-drop, des modeles pre-congus et des statistiques detaillees (ouvertures, clics, conversions).",
  },
  {
    name: "Sequences automatisees",
    description:
      "Definissez des workflows d'emails automatiques declenches par des actions specifiques : inscription, abandon de devis, anniversaire client.",
  },
  {
    name: "Formulaires web",
    description:
      "Integrez des formulaires de capture sur votre site web. Les contacts sont automatiquement crees et assignes dans votre CRM.",
  },
  {
    name: "SMS et WhatsApp",
    description:
      "Envoyez des SMS et des messages WhatsApp Business a vos contacts directement depuis la plateforme, avec suivi des delivrances.",
  },
];

const finance = [
  {
    name: "Open Banking",
    description:
      "Connectez vos comptes bancaires professionnels via Bridge API et visualisez vos transactions en temps reel dans un tableau de bord unifie.",
  },
  {
    name: "Rapprochement bancaire",
    description:
      "Associez automatiquement vos transactions bancaires a vos factures et devis. L'IA suggere les rapprochements les plus probables.",
  },
  {
    name: "Suivi de tresorerie",
    description:
      "Tableaux de bord de tresorerie en temps reel avec previsions, alertes de seuil et historique des flux entrants et sortants.",
  },
  {
    name: "Export comptable",
    description:
      "Exportez vos ecritures au format FEC ou connectez directement votre logiciel comptable (QuickBooks, Pennylane, Sage).",
  },
];

/* ------------------------------------------------------------------ */
/*  Modules metiers                                                    */
/* ------------------------------------------------------------------ */
const modulesMetiers = [
  {
    name: "Garage automobile",
    description:
      "Ordres de reparation, suivi vehicule par immatriculation, carnet d'entretien, gestion du stock de pieces detachees et devis atelier.",
    color: "bg-rose-50 text-rose-600 border-rose-100",
  },
  {
    name: "Hotel",
    description:
      "Gestion des reservations, planning des chambres, check-in/check-out, tarification dynamique et integration avec les OTA.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    name: "Restaurant",
    description:
      "Reservations de table, gestion des menus et allergenes, commandes fournisseurs, suivi des stocks alimentaires et analyse de marges.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    name: "Salon de coiffure",
    description:
      "Agenda de rendez-vous, fiches client avec historique des prestations, gestion des produits et programmes de fidelite.",
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    name: "Dentiste",
    description:
      "Dossier patient, planning des soins, ordonnances, gestion des mutuelles et rappels de rendez-vous automatiques.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    name: "Avocat",
    description:
      "Gestion des dossiers, suivi du temps passe, conventions d'honoraires, echeancier judiciaire et portail client securise.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    name: "Paysagiste",
    description:
      "Planification des chantiers, devis multi-lots, suivi des interventions, gestion du materiel et photos avant/apres.",
    color: "bg-green-50 text-green-600 border-green-100",
  },
  {
    name: "Consultant",
    description:
      "Suivi des missions, time tracking, rapports d'activite, facturation au temps passe et gestion des propositions commerciales.",
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    name: "E-commerce",
    description:
      "Synchronisation des commandes, gestion des retours, suivi des expeditions, analyse RFM et integration multi-canaux.",
    color: "bg-pink-50 text-pink-600 border-pink-100",
  },
];

/* ------------------------------------------------------------------ */
/*  Integrations                                                       */
/* ------------------------------------------------------------------ */
const integrations = [
  { name: "Stripe", category: "Paiement" },
  { name: "Bridge API", category: "Open Banking" },
  { name: "Brevo", category: "Email" },
  { name: "Twilio", category: "SMS" },
  { name: "Zapier", category: "Automatisation" },
  { name: "Make", category: "Automatisation" },
  { name: "Google Calendar", category: "Agenda" },
  { name: "Google Drive", category: "Stockage" },
  { name: "Slack", category: "Communication" },
  { name: "WhatsApp Business", category: "Messagerie" },
  { name: "Pennylane", category: "Comptabilite" },
  { name: "QuickBooks", category: "Comptabilite" },
  { name: "Sage", category: "Comptabilite" },
  { name: "Shopify", category: "E-commerce" },
  { name: "WooCommerce", category: "E-commerce" },
  { name: "PrestaShop", category: "E-commerce" },
  { name: "Mailchimp", category: "Email" },
  { name: "HubSpot", category: "Import" },
  { name: "Salesforce", category: "Import" },
  { name: "DocuSign", category: "Signature" },
  { name: "Yousign", category: "Signature" },
  { name: "Notion", category: "Productivite" },
  { name: "Airtable", category: "Productivite" },
  { name: "Calendly", category: "Agenda" },
];

/* ------------------------------------------------------------------ */
/*  Helper: Feature section                                            */
/* ------------------------------------------------------------------ */
function FeatureSection({
  title,
  subtitle,
  items,
  id,
  accent,
}: {
  title: string;
  subtitle: string;
  items: { name: string; description: string }[];
  id: string;
  accent: string;
}) {
  return (
    <section id={id} className="py-20">
      <div className="section-container section-padding">
        <div className="mb-12">
          <span
            className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${accent}`}
          >
            {title}
          </span>
          <h2 className="font-serif text-3xl tracking-tight text-surface-900 sm:text-4xl">
            {subtitle}
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-surface-100 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-surface-900">
                {item.name}
              </h3>
              <p className="mt-2 leading-relaxed text-surface-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */
export default function FeaturesPage() {
  return (
    <>
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-brand-50/60 to-white pb-4 pt-20 lg:pt-28">
        <div className="section-container section-padding text-center">
          <h1 className="font-serif text-4xl tracking-tight text-surface-900 sm:text-5xl lg:text-6xl">
            Une plateforme complete pour votre entreprise
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-surface-500">
            Decouvrez toutes les fonctionnalites de Vision CRM, organisees par
            domaine. Chaque outil a ete concu pour simplifier le quotidien des
            PME francaises.
          </p>

          {/* Quick nav */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { label: "CRM", href: "#crm" },
              { label: "Ventes", href: "#ventes" },
              { label: "Marketing", href: "#marketing" },
              { label: "Finance", href: "#finance" },
              { label: "Metiers", href: "#metiers" },
              { label: "Integrations", href: "#integrations" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-surface-200 bg-white px-5 py-2 text-sm font-medium text-surface-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURE SECTIONS                                             */}
      {/* ============================================================ */}
      <FeatureSection
        id="crm"
        title="CRM Core"
        subtitle="Votre base de donnees clients, centralisee et intelligente"
        items={crmCore}
        accent="bg-brand-50 text-brand-700"
      />

      <div className="border-t border-surface-100" />

      <FeatureSection
        id="ventes"
        title="Ventes"
        subtitle="Du premier contact a la facture, sans friction"
        items={ventes}
        accent="bg-emerald-50 text-emerald-700"
      />

      <div className="border-t border-surface-100" />

      <FeatureSection
        id="marketing"
        title="Marketing"
        subtitle="Attirez, engagez et convertissez vos prospects"
        items={marketing}
        accent="bg-amber-50 text-amber-700"
      />

      <div className="border-t border-surface-100" />

      <FeatureSection
        id="finance"
        title="Finance"
        subtitle="Gardez le controle de vos finances en temps reel"
        items={finance}
        accent="bg-rose-50 text-rose-700"
      />

      {/* ============================================================ */}
      {/* MODULES METIERS                                              */}
      {/* ============================================================ */}
      <section id="metiers" className="border-t border-surface-100 bg-surface-50 py-20">
        <div className="section-container section-padding">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
              Modules Metiers
            </span>
            <h2 className="font-serif text-3xl tracking-tight text-surface-900 sm:text-4xl">
              Un CRM specialise pour chaque secteur
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-surface-500">
              Chaque module ajoute des champs, des workflows et des modeles de
              documents specifiques a votre metier.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modulesMetiers.map((module) => (
              <div
                key={module.name}
                className={`rounded-xl border bg-white p-6 transition-shadow hover:shadow-md ${module.color.split(" ")[2]}`}
              >
                <div
                  className={`mb-4 inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${module.color.split(" ").slice(0, 2).join(" ")}`}
                >
                  {module.name}
                </div>
                <p className="leading-relaxed text-surface-500">
                  {module.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* INTEGRATIONS                                                 */}
      {/* ============================================================ */}
      <section id="integrations" className="py-20">
        <div className="section-container section-padding">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700">
              Integrations
            </span>
            <h2 className="font-serif text-3xl tracking-tight text-surface-900 sm:text-4xl">
              Connectez vos outils preferes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-surface-500">
              Plus de 40 integrations natives et des connecteurs Zapier / Make
              pour automatiser vos processus.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex flex-col items-center rounded-xl border border-surface-100 bg-white px-4 py-5 text-center transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-100 text-xs font-bold text-surface-500">
                  {integration.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-3 text-sm font-medium text-surface-800">
                  {integration.name}
                </p>
                <p className="mt-1 text-xs text-surface-400">
                  {integration.category}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-surface-400">
            Et bien d&apos;autres a venir. Consultez notre{" "}
            <Link
              href="/roadmap"
              className="text-brand-600 underline hover:text-brand-700"
            >
              roadmap
            </Link>{" "}
            pour les prochaines integrations.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA                                                          */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-700 py-20">
        <div className="section-container section-padding text-center">
          <h2 className="font-serif text-3xl tracking-tight text-white sm:text-4xl">
            Convaincu ? Testez gratuitement
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-brand-100">
            14 jours d&apos;essai gratuit avec toutes les fonctionnalites Pro.
            Aucune carte bancaire requise.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              Demarrer gratuitement
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white transition-all hover:border-white/60 hover:bg-white/10"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
