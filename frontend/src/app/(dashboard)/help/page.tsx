'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { category: 'Général', question: 'Comment créer un nouveau contact ?', answer: 'Rendez-vous dans la page Contacts et cliquez sur "Nouveau contact". Remplissez le formulaire avec les informations du contact (nom, email, téléphone, entreprise) puis cliquez sur "Créer".' },
  { category: 'Général', question: 'Comment importer des contacts depuis un fichier CSV ?', answer: 'Dans la page Contacts, cliquez sur "Importer CSV". Sélectionnez votre fichier CSV (format FR ou EN supporté), vérifiez la prévisualisation des données, puis confirmez l\'import.' },
  { category: 'Deals', question: 'Comment déplacer un deal dans le pipeline ?', answer: 'Dans la vue Kanban de la page Deals, glissez-déposez la carte du deal vers la colonne souhaitée. Le changement d\'étape est sauvegardé automatiquement.' },
  { category: 'Deals', question: 'Comment personnaliser les étapes du pipeline ?', answer: 'Allez dans la page Pipelines, sélectionnez votre pipeline et cliquez sur "Ajouter une étape". Vous pouvez aussi modifier le nom et la couleur des étapes existantes.' },
  { category: 'Facturation', question: 'Comment créer et envoyer un devis ?', answer: 'Dans la page Devis & Factures, cliquez sur "Nouveau". Remplissez les informations (client, lignes de produits/services, montants) et cliquez sur "Envoyer" pour l\'envoyer par email au client.' },
  { category: 'Facturation', question: 'Comment imprimer une facture en PDF ?', answer: 'Ouvrez la facture en cliquant dessus, puis utilisez le bouton "Imprimer / PDF". Votre navigateur ouvrira le dialogue d\'impression avec une mise en page optimisée A4.' },
  { category: 'Marketing', question: 'Comment créer une campagne email ?', answer: 'Dans la page Emails, onglet Campagnes, cliquez sur "Nouvelle campagne". Choisissez un template, sélectionnez vos destinataires, personnalisez le contenu et planifiez l\'envoi.' },
  { category: 'Marketing', question: 'Comment créer un formulaire web ?', answer: 'Dans la page Formulaires, cliquez sur "Nouveau formulaire". Ajoutez vos champs (texte, email, téléphone, etc.), configurez les options, puis copiez le lien public pour l\'intégrer sur votre site.' },
  { category: 'Intégrations', question: 'Comment connecter ma banque ?', answer: 'Allez dans la page Banque et cliquez sur "Connecter une banque". Sélectionnez votre établissement bancaire et suivez les instructions pour autoriser la synchronisation de vos transactions.' },
  { category: 'Intégrations', question: 'Comment configurer un webhook ?', answer: 'Dans la page Webhooks, cliquez sur "Nouveau webhook". Entrez l\'URL de destination, sélectionnez les événements à écouter (création contact, deal gagné, etc.) et optionnellement un secret HMAC.' },
  { category: 'Équipe', question: 'Comment inviter un membre de l\'équipe ?', answer: 'Allez dans Paramètres > onglet Équipe et cliquez sur "Inviter un membre". Entrez son email et sélectionnez son rôle (Admin, Commercial, Support).' },
  { category: 'Sécurité', question: 'Comment changer mon mot de passe ?', answer: 'Rendez-vous dans Mon Profil et utilisez la section "Changer le mot de passe". Entrez votre mot de passe actuel puis le nouveau (minimum 8 caractères).' },
];

const CATEGORIES = ['Tous', 'Général', 'Deals', 'Facturation', 'Marketing', 'Intégrations', 'Équipe', 'Sécurité'];

const QUICK_LINKS = [
  { label: 'Tableau de bord', href: '/dashboard', icon: '📊' },
  { label: 'Contacts', href: '/contacts', icon: '👥' },
  { label: 'Deals', href: '/deals', icon: '💼' },
  { label: 'Paramètres', href: '/settings', icon: '⚙️' },
  { label: 'Organisation', href: '/organization', icon: '🏢' },
  { label: 'Mon profil', href: '/profile', icon: '👤' },
];

export default function HelpPage() {
  const [category, setCategory] = useState('Tous');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = FAQ_ITEMS.filter((item) => {
    if (category !== 'Tous' && item.category !== category) return false;
    if (search && !item.question.toLowerCase().includes(search.toLowerCase()) && !item.answer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Centre d&apos;aide</h1>
      <p className="mt-1 text-surface-500 dark:text-surface-400">Trouvez des réponses à vos questions sur Vision CRM.</p>

      {/* Search */}
      <div className="mt-6 relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
        <input
          type="text"
          placeholder="Rechercher dans l'aide..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:border-surface-700 dark:text-white"
        />
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="flex flex-col items-center gap-2 rounded-xl border border-surface-200 bg-white p-4 hover:shadow-md hover:border-brand-300 transition-all dark:bg-surface-800 dark:border-surface-700 dark:hover:border-brand-500">
            <span className="text-2xl">{link.icon}</span>
            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Questions fréquentes</h2>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${category === c ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'}`}>{c}</button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((item, i) => (
            <div key={i} className="rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 overflow-hidden">
              <button
                onClick={() => setOpenId(openId === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded dark:bg-brand-900/30 dark:text-brand-400">{item.category}</span>
                  <span className="text-sm font-medium text-surface-900 dark:text-white">{item.question}</span>
                </div>
                <svg className={`w-4 h-4 text-surface-400 transition-transform flex-shrink-0 ${openId === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {openId === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-surface-400 py-8">Aucun résultat pour votre recherche.</p>
          )}
        </div>
      </div>

      {/* Contact support */}
      <div className="mt-8 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Besoin d&apos;aide supplémentaire ?</h2>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Notre équipe support est disponible du lundi au vendredi, 9h-18h.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <a href="mailto:support@vision-crm.fr" className="btn-primary text-center">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
            Envoyer un email
          </a>
          <button className="btn-secondary text-center">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
            Chat en direct
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="mt-6 rounded-xl border border-surface-200 bg-white p-6 dark:bg-surface-800 dark:border-surface-700">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Raccourcis clavier</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { keys: 'Ctrl + K', action: 'Recherche globale' },
            { keys: 'Ctrl + N', action: 'Nouveau contact' },
            { keys: 'Esc', action: 'Fermer le modal' },
            { keys: 'G puis D', action: 'Aller au tableau de bord' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-600 dark:text-surface-300">{shortcut.action}</span>
              <kbd className="px-2 py-1 rounded bg-surface-100 text-xs font-mono text-surface-600 dark:bg-surface-700 dark:text-surface-300">{shortcut.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
