import Link from "next/link";

const footerLinks = {
  produit: {
    title: "Produit",
    links: [
      { name: "Fonctionnalites", href: "/features" },
      { name: "Tarifs", href: "/pricing" },
      { name: "Integrations", href: "/features#integrations" },
      { name: "Roadmap", href: "/roadmap" },
      { name: "Changelog", href: "/changelog" },
    ],
  },
  metiers: {
    title: "Metiers",
    links: [
      { name: "Garage automobile", href: "/metiers/garage" },
      { name: "Hotel", href: "/metiers/hotel" },
      { name: "Restaurant", href: "/metiers/restaurant" },
      { name: "Salon de coiffure", href: "/metiers/salon-coiffure" },
      { name: "Dentiste", href: "/metiers/dentiste" },
      { name: "Avocat", href: "/metiers/avocat" },
      { name: "Paysagiste", href: "/metiers/paysagiste" },
      { name: "Consultant", href: "/metiers/consultant" },
      { name: "E-commerce", href: "/metiers/e-commerce" },
    ],
  },
  ressources: {
    title: "Ressources",
    links: [
      { name: "Documentation", href: "/docs" },
      { name: "Blog", href: "/blog" },
      { name: "API Reference", href: "/docs/api" },
      { name: "Status", href: "/status" },
      { name: "Guides", href: "/guides" },
    ],
  },
  entreprise: {
    title: "Entreprise",
    links: [
      { name: "A propos", href: "/about" },
      { name: "Contact", href: "/contact" },
      { name: "CGV", href: "/legal/cgv" },
      { name: "RGPD", href: "/legal/rgpd" },
      { name: "Mentions legales", href: "/legal/mentions" },
    ],
  },
};

export default function Footer() {
  return (
    <footer className="border-t border-surface-100 bg-surface-50">
      <div className="section-container section-padding py-16">
        {/* Top section */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-surface-900">
                Vision <span className="text-brand-600">CRM</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-surface-500">
              Le CRM tout-en-un pour les PME francaises. Concu pour s&apos;adapter
              a votre metier, pas l&apos;inverse.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-600">
              <svg className="h-4 w-4" viewBox="0 0 36 36" fill="none">
                <rect width="12" height="36" fill="#002395" />
                <rect x="12" width="12" height="36" fill="#FFFFFF" />
                <rect x="24" width="12" height="36" fill="#ED2939" />
              </svg>
              Made in France
            </div>
          </div>

          {/* Links columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-surface-900">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-surface-500 transition-colors hover:text-brand-600"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-surface-200 pt-8 sm:flex-row">
          <p className="text-sm text-surface-400">
            &copy; {new Date().getFullYear()} Vision CRM. Tous droits reserves.
          </p>

          <div className="flex items-center gap-4">
            {/* Twitter/X */}
            <a
              href="#"
              className="text-surface-400 transition-colors hover:text-surface-600"
              aria-label="Twitter"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a
              href="#"
              className="text-surface-400 transition-colors hover:text-surface-600"
              aria-label="LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            {/* GitHub */}
            <a
              href="#"
              className="text-surface-400 transition-colors hover:text-surface-600"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
