import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs — Vision CRM",
  description:
    "Decouvrez les tarifs de Vision CRM. Un plan gratuit pour demarrer, des offres Starter, Pro et Enterprise adaptees a la taille de votre entreprise.",
};

/* ------------------------------------------------------------------ */
/*  Plans data                                                         */
/* ------------------------------------------------------------------ */
const plans = [
  {
    name: "Free",
    price: "0",
    period: "",
    description: "Pour decouvrir Vision CRM et gerer vos premiers contacts.",
    cta: "Demarrer gratuitement",
    ctaStyle: "btn-outline",
    highlighted: false,
    features: [
      "1 utilisateur",
      "100 contacts",
      "10 devis par mois",
      "100 emails par mois",
      "50 SMS par mois",
      "1 connexion bancaire",
      "2 integrations",
      "Support communautaire",
    ],
  },
  {
    name: "Starter",
    price: "49",
    period: "/mois",
    description: "Pour les petites equipes qui veulent structurer leur activite.",
    cta: "Essai gratuit 14 jours",
    ctaStyle: "btn-outline",
    highlighted: false,
    features: [
      "3 utilisateurs",
      "1 000 contacts",
      "100 devis par mois",
      "1 000 emails par mois",
      "500 SMS par mois",
      "3 connexions bancaires",
      "5 integrations",
      "1 module metier inclus",
      "Support email prioritaire",
    ],
  },
  {
    name: "Pro",
    price: "149",
    period: "/mois",
    description:
      "La solution complete pour les PME qui veulent accelerer leur croissance.",
    cta: "Essai gratuit 14 jours",
    ctaStyle: "btn-primary",
    highlighted: true,
    badge: "Recommande",
    features: [
      "10 utilisateurs",
      "Contacts illimites",
      "Devis illimites",
      "10 000 emails par mois",
      "2 000 SMS par mois",
      "Connexions bancaires illimitees",
      "Integrations illimitees",
      "Scoring IA des leads",
      "Portail client inclus",
      "Tous les modules metiers",
      "Support prioritaire telephone",
      "Onboarding assiste",
    ],
  },
  {
    name: "Enterprise",
    price: "Sur devis",
    period: "",
    description:
      "Pour les grandes structures avec des besoins specifiques et un accompagnement dedie.",
    cta: "Contacter l'equipe commerciale",
    ctaStyle: "btn-outline",
    highlighted: false,
    features: [
      "Utilisateurs illimites",
      "Tout illimite",
      "SLA 99.9%",
      "Onboarding dedie personnalise",
      "Account manager dedie",
      "White-label disponible",
      "API avancee & webhooks",
      "SSO / SAML",
      "Audit de securite",
      "Formation sur mesure",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Add-ons data                                                       */
/* ------------------------------------------------------------------ */
const addons = [
  {
    name: "Module metier supplementaire",
    price: "+20 EUR/mois",
    description:
      "Ajoutez un module metier additionnel avec ses champs, workflows et modeles specifiques.",
  },
  {
    name: "WhatsApp Business",
    price: "+30 EUR/mois",
    description:
      "Envoyez des messages WhatsApp a vos clients directement depuis Vision CRM.",
  },
  {
    name: "Signatures electroniques",
    price: "+15 EUR/mois",
    description:
      "Faites signer vos devis et contrats en ligne avec une valeur juridique.",
  },
  {
    name: "Stockage supplementaire",
    price: "+10 EUR/100 Go",
    description:
      "Augmentez votre espace de stockage pour les documents, photos et fichiers.",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    question: "Puis-je changer de plan a tout moment ?",
    answer:
      "Oui, vous pouvez upgrader ou downgrader votre plan a tout moment. Le changement prend effet immediatement et la facturation est ajustee au prorata.",
  },
  {
    question: "Y a-t-il un engagement de duree ?",
    answer:
      "Non, tous nos plans sont sans engagement. Vous pouvez annuler a tout moment. Nous proposons egalement une reduction de 20% pour un paiement annuel.",
  },
  {
    question: "Qu'est-ce qu'un module metier ?",
    answer:
      "Un module metier est un ensemble de fonctionnalites specialisees pour un secteur d'activite specifique : champs personnalises, modeles de documents, workflows dedies et tableaux de bord adaptes. Par exemple, le module Garage inclut la gestion des ordres de reparation, le suivi vehicule et le carnet d'entretien.",
  },
  {
    question: "Mes donnees sont-elles securisees ?",
    answer:
      "Absolument. Vos donnees sont hebergees en France (OVH / Scaleway), chiffrees au repos et en transit, et nous sommes conformes au RGPD. Nous effectuons des sauvegardes quotidiennes et proposons l'export complet de vos donnees a tout moment.",
  },
  {
    question: "Proposez-vous un accompagnement a la migration ?",
    answer:
      "Oui, pour les plans Pro et Enterprise, nous proposons un accompagnement a la migration de vos donnees depuis votre outil actuel (Excel, HubSpot, Salesforce, etc.). L'import CSV est disponible pour tous les plans.",
  },
  {
    question: "Comment fonctionne l'essai gratuit ?",
    answer:
      "L'essai gratuit de 14 jours vous donne acces a toutes les fonctionnalites du plan Pro, sans aucune carte bancaire requise. A la fin de l'essai, vous pouvez choisir le plan qui vous convient ou continuer avec le plan Free.",
  },
];

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */
export default function PricingPage() {
  return (
    <>
      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-brand-50/60 to-white pb-4 pt-20 lg:pt-28">
        <div className="section-container section-padding text-center">
          <h1 className="font-serif text-4xl tracking-tight text-surface-900 sm:text-5xl lg:text-6xl">
            Des tarifs simples et transparents
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-surface-500">
            Commencez gratuitement, evoluez a votre rythme. Tous les plans
            incluent un essai gratuit de 14 jours sur les fonctionnalites
            premium.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PLANS GRID                                                   */}
      {/* ============================================================ */}
      <section className="pb-24 pt-12">
        <div className="section-container section-padding">
          <div className="grid gap-8 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-brand-500 bg-white shadow-xl shadow-brand-500/10 ring-1 ring-brand-500"
                    : "border-surface-200 bg-white"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white">
                      {(plan as any).badge}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-surface-900">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline">
                    {plan.price === "Sur devis" ? (
                      <span className="text-3xl font-bold text-surface-900">
                        Sur devis
                      </span>
                    ) : (
                      <>
                        <span className="text-5xl font-bold tracking-tight text-surface-900">
                          {plan.price}
                        </span>
                        <span className="ml-1 text-lg text-surface-500">
                          EUR{plan.period}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-surface-500">
                    {plan.description}
                  </p>
                </div>

                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/signup"}
                  className={`mt-8 w-full text-center ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-8 flex-1 space-y-3 border-t border-surface-100 pt-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                          plan.highlighted
                            ? "text-brand-600"
                            : "text-emerald-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span className="text-sm text-surface-600">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-surface-400">
            Tous les prix sont HT. Reduction de 20% pour un paiement annuel.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* ADD-ONS                                                      */}
      {/* ============================================================ */}
      <section className="border-t border-surface-100 bg-surface-50 py-24">
        <div className="section-container section-padding">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl tracking-tight text-surface-900 sm:text-4xl">
              Modules complementaires
            </h2>
            <p className="mt-4 text-lg text-surface-500">
              Ajoutez des fonctionnalites supplementaires a votre plan selon vos
              besoins.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {addons.map((addon) => (
              <div
                key={addon.name}
                className="rounded-xl border border-surface-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-surface-900">
                    {addon.name}
                  </h3>
                  <span className="flex-shrink-0 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                    {addon.price}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-surface-500">
                  {addon.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FAQ                                                          */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="section-container section-padding">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl tracking-tight text-surface-900 sm:text-4xl">
              Questions frequentes
            </h2>
          </div>

          <div className="mx-auto mt-12 max-w-3xl divide-y divide-surface-100">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-6">
                <summary className="flex cursor-pointer items-center justify-between text-left">
                  <h3 className="pr-4 font-semibold text-surface-900">
                    {faq.question}
                  </h3>
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-surface-400 transition-transform group-open:rotate-45"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </summary>
                <p className="mt-4 leading-relaxed text-surface-500">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* BOTTOM CTA                                                   */}
      {/* ============================================================ */}
      <section className="border-t border-surface-100 bg-surface-50 py-20">
        <div className="section-container section-padding text-center">
          <h2 className="font-serif text-3xl tracking-tight text-surface-900 sm:text-4xl">
            Pret a vous lancer ?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-surface-500">
            Commencez avec le plan Free et evoluez quand vous etes pret. Aucune
            carte bancaire requise.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-primary !px-8 !py-4">
              Demarrer gratuitement
            </Link>
            <Link href="/contact" className="btn-secondary !px-8 !py-4">
              Parler a un conseiller
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
