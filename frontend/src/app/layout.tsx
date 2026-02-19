import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Vision CRM — Le CRM multi-metiers pour PME francaises",
  description:
    "Vision CRM est le CRM tout-en-un concu pour les PME francaises. Gestion des contacts, devis, facturation, pipeline commercial, email marketing et modules metiers pour 9 secteurs d'activite.",
  keywords: [
    "CRM",
    "PME",
    "France",
    "devis",
    "facturation",
    "gestion commerciale",
    "multi-metiers",
  ],
  openGraph: {
    title: "Vision CRM — Le CRM multi-metiers pour PME francaises",
    description:
      "Le CRM tout-en-un qui s'adapte a votre metier. 9 secteurs, devis en moins de 10 minutes, open banking integre.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
