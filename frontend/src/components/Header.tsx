"use client";

import { useState } from "react";
import Link from "next/link";

const metiers = [
  { name: "Garage automobile", href: "/metiers/garage" },
  { name: "Hotel", href: "/metiers/hotel" },
  { name: "Restaurant", href: "/metiers/restaurant" },
  { name: "Salon de coiffure", href: "/metiers/salon-coiffure" },
  { name: "Dentiste", href: "/metiers/dentiste" },
  { name: "Avocat", href: "/metiers/avocat" },
  { name: "Paysagiste", href: "/metiers/paysagiste" },
  { name: "Consultant", href: "/metiers/consultant" },
  { name: "E-commerce", href: "/metiers/e-commerce" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metiersOpen, setMetiersOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-100 bg-white/80 backdrop-blur-lg">
      <div className="section-container section-padding">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <svg
                className="h-5 w-5 text-white"
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
            <span className="text-xl font-bold text-surface-900">
              Vision <span className="text-brand-600">CRM</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 lg:flex">
            <Link
              href="/features"
              className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900"
            >
              Fonctionnalites
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900"
            >
              Tarifs
            </Link>

            {/* Metiers dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setMetiersOpen(true)}
              onMouseLeave={() => setMetiersOpen(false)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-surface-600 transition-colors hover:text-surface-900">
                Metiers
                <svg
                  className={`h-4 w-4 transition-transform ${metiersOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {metiersOpen && (
                <div className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-surface-100 bg-white p-2 shadow-xl">
                  {metiers.map((metier) => (
                    <Link
                      key={metier.href}
                      href={metier.href}
                      className="block rounded-lg px-4 py-2.5 text-sm text-surface-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      {metier.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="btn-outline !py-2 !px-4 !text-sm">
              Connexion
            </Link>
            <Link href="/signup" className="btn-primary !py-2 !px-4 !text-sm">
              Essai gratuit
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6 text-surface-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-surface-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-surface-100 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              <Link
                href="/features"
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Fonctionnalites
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tarifs
              </Link>

              <div className="px-4 py-2.5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Metiers
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {metiers.map((metier) => (
                    <Link
                      key={metier.href}
                      href={metier.href}
                      className="rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {metier.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 px-4">
                <Link href="/login" className="btn-outline w-full text-center">
                  Connexion
                </Link>
                <Link href="/signup" className="btn-primary w-full text-center">
                  Essai gratuit
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
