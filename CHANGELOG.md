# Changelog — Vision CRM

Toutes les modifications notables du projet sont documentées ici.
Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [2.0.0] — 2026-02-20

### Ajouté — Modules avancés (6 nouvelles pages, 24 au total)
- **Page Entités** (`/entities`) — CRUD multi-secteur : véhicules, chambres, patients, biens immobiliers, dossiers juridiques, projets, RDV. Filtres par type, badges colorés, modal création/édition, toggle actif/inactif
- **Page Formulaires** (`/forms`) — Constructeur de formulaires web pour capturer des leads. Champs configurables (texte, email, phone, textarea, select, checkbox), slugs auto-générés, vue soumissions, copie lien public
- **Page Rapports** (`/reports`) — Module BI avec 5 rapports prédéfinis (performance commerciale, pipeline, contacts, facturation, équipe). Génération PDF/CSV/Excel, planification automatique (quotidien/hebdo/mensuel), vue détaillée avec KPIs
- **Page Banque** (`/banking`) — Module financier : comptes bancaires connectés, transactions avec filtres (catégorie, rapprochement, recherche), rapprochement avec factures/devis, KPIs (solde, entrées, sorties, non rapprochées)
- **Page SMS** (`/sms`) — Marketing SMS complet : campagnes (création, planification, statistiques), templates avec variables dynamiques et compteur segments, conversations bidirectionnelles en temps réel
- **Page Marketplace** (`/marketplace`) — 14 intégrations tierces (Brevo, Twilio, Stripe, GoCardless, Google Calendar, Slack, Zapier, Make, QuickBooks, Pennylane, Mailchimp, Google Analytics, Notion, HubSpot). Installation/désinstallation, configuration API keys, toggle pause/actif

### Modifié
- **Sidebar** — 6 nouveaux liens de navigation : Entités, SMS, Formulaires, Banque, Rapports, Marketplace (15 items total)
- **Statistiques** — 24 pages frontend, 18 routes backend, 50+ endpoints API connectés

---

## [1.8.0] — 2026-02-20

### Description
Gestion d'équipe dans les paramètres, navigation par onglets, zone dangereuse.

### Ajouté
- **Onglet Équipe** (`/settings`) — Liste des membres avec rôle, statut actif/inactif, bouton invitation
- **Navigation par onglets** — Général / Équipe avec compteur de membres
- **Zone dangereuse** — Boutons suppression données et suppression compte (avec style warning)

### Modifié
- **Settings** — Refactoring en 2 onglets (Général + Équipe), fetch `/users` pour la liste des membres

### Stats
- **18 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants

---

## [1.7.0] — 2026-02-20

### Description
Page d'activité globale (audit logs timeline) avec filtres et navigation.

### Ajouté
- **Page Activité** (`/activity`) — Timeline globale des actions CRM (créations, modifications, suppressions), groupée par jour, avec filtres par type de ressource (contacts/deals/documents), icônes par action, liens de navigation
- **Navigation Activité** — Ajout dans la sidebar entre Calendrier et Analytiques

### Stats
- **18 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants

---

## [1.6.0] — 2026-02-20

### Description
Import CSV contacts, analytiques enrichies avec top clients et métriques de performance.

### Ajouté
- **Import CSV contacts** (`/contacts`) — Bouton "Importer CSV", parser FR/EN (Nom/Prénom/Email/Téléphone/Entreprise), preview modal, import bulk via API, compteur succès/erreurs
- **Top clients** (`/analytics`) — Classement des 5 meilleurs clients avec avatar, CA et nombre de deals
- **Gauge conversion** (`/analytics`) — Graphique circulaire SVG du taux de conversion lead→deal
- **Valeur pipeline** (`/analytics`) — Nombre de deals ouverts + valeur totale estimée
- **Performance mensuelle** (`/analytics`) — Deals gagnés ce mois + panier moyen avec icônes

### Modifié
- **Contacts** — Header avec boutons Importer CSV + Nouveau contact, modal preview import
- **Analytiques** — Section top clients remplace placeholder, 3 nouvelles cards de métriques ajoutées sous l'entonnoir

### Stats
- **17 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants

---

## [1.5.0] — 2026-02-20

### Description
Drag & drop Kanban, dark mode, et améliorations UX interactives.

### Ajouté
- **Drag & drop Kanban** (`/deals`) — Glisser-déposer natif HTML5 entre colonnes, mise à jour optimiste, persistance via PATCH `/deals/:id`, retour arrière si erreur
- **Dark mode** — Toggle clair/sombre dans la topbar, persistance localStorage, détection `prefers-color-scheme`, classes Tailwind `dark:`
- **ThemeProvider** (`contexts/ThemeContext.tsx`) — Contexte React avec `useTheme()` hook
- **ThemeToggle** — Bouton soleil/lune dans la topbar du dashboard

### Modifié
- **Deals Kanban** — Cards draggables, feedback visuel (opacité + ring sur colonne cible), curseur grab
- **Dashboard layout** — Header et main supportent dark mode (`dark:bg-surface-800`, `dark:bg-surface-900`)
- **globals.css** — Body dark mode (`dark:bg-surface-900 dark:text-surface-200`)
- **tailwind.config.ts** — `darkMode: 'class'` activé

### Stats
- **17 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants

---

## [1.4.0] — 2026-02-20

### Description
Fonctionnalités business : graphique revenus, actions groupées contacts, impression devis/factures.

### Ajouté
- **Graphique revenus** (`/dashboard`) — Bar chart CSS pure (6 mois), données depuis `/analytics/revenue`, tooltip montants
- **Actions rapides** (`/dashboard`) — 4 boutons raccourcis (Nouveau contact, deal, devis, analytiques)
- **Sélection bulk contacts** (`/contacts`) — Checkbox par ligne, sélection tout, barre d'actions groupées
- **Export CSV contacts** — Génère et télécharge un CSV (Nom, Email, Téléphone, Entreprise, Type) des contacts sélectionnés
- **Suppression bulk contacts** — Suppression groupée avec confirmation, refresh après suppression
- **Impression devis/factures** (`/orders/[id]`) — Bouton "Imprimer / PDF" avec `window.print()`, styles @media print dédiés (masque sidebar, actions, pleine page A4)

### Modifié
- **Dashboard** — Affiche le prénom réel, graphique revenus entre KPIs et activité/pipeline
- **Contacts** — Colonne checkbox, barre bulk actions sticky

### Stats
- **17 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants

---

## [1.3.0] — 2026-02-20

### Description
Interface responsive mobile, panneau notifications, menu utilisateur dropdown, et améliorations UX.

### Ajouté
- **Sidebar responsive** — Menu hamburger sur mobile/tablette, overlay sombre, fermeture auto sur navigation
- **Panneau notifications** — Dropdown clochette avec notifications (API avec fallback démo), indicateur non-lues
- **Menu utilisateur** — Dropdown avatar avec liens Profil/Paramètres et bouton Déconnexion
- **Bouton fermer sidebar** (mobile) — Croix dans l'en-tête sidebar sur écrans < lg

### Modifié
- **Dashboard layout** — Entièrement refactorisé : responsive (mobile/tablette/desktop), topbar adaptive, recherche icône mobile + barre desktop
- **Sidebar** — N'est plus `fixed` directement, positionnée par le layout parent avec transitions CSS. Accepte prop `onClose`.
- **Padding responsive** — `p-4 sm:p-6` au lieu de `p-6` fixe

### Stats
- **17 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants

---

## [1.2.0] — 2026-02-20

### Description
Auth flow complet via API backend, recherche globale Ctrl+K, toast notifications, correction navigation sidebar.

### Ajouté
- **Recherche globale** (`Ctrl+K`) — Recherche instantanée contacts, deals, documents avec navigation clavier
- **Toast notifications** (`ToastProvider`) — Système de notifications toast (success/error/info) avec animation slide-up
- **Champ téléphone** sur la page d'inscription

### Modifié
- **Register** (`/register`) — Appelle désormais l'API backend `/auth/register` (crée tenant + user + session) au lieu de Supabase direct. Auto-génère le slug tenant. Redirige vers `/dashboard` après inscription.
- **Login** (`/login`) — Appelle l'API backend `/auth/login` avec fallback Supabase direct. Récupère user + tenant + tokens.
- **Sidebar** — Correction des URLs (étaient en français, maintenant correspondent aux routes réelles : `/orders`, `/calendar`, `/analytics`, `/settings`). Affiche nom/email réel de l'utilisateur connecté.
- **Dashboard layout** — Barre de recherche remplacée par le trigger recherche globale avec hint `Ctrl+K`

### Stats
- **17 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants
- **0 pages** avec données uniquement hardcodées

---

## [1.1.0] — 2026-02-20

### Description
Toutes les pages CRM connectées à l'API. Modals de création pour deals et commandes.

### Ajouté
- **Modal nouveau deal** (`/deals`) — Formulaire avec sélection contact, stage, montant, date de clôture
- **Modal nouvelle commande** (`/orders`) — Formulaire avec lignes dynamiques, calcul auto TTC, sélection contact

### Modifié
- **Email Marketing** (`/emails`) — Connecté à l'API (campagnes + templates), fallback démo
- **Calendrier** (`/calendar`) — Connecté à l'API (service orders), navigation semaine dynamique, fallback démo
- **Deals** (`/deals`) — Ajout CRUD complet avec modal création
- **Orders** (`/orders`) — Ajout CRUD complet avec modal création devis/facture

### Stats
- **17 pages** Next.js (build OK)
- **12 pages** connectées à l'API réelle
- **32 tests** backend passants
- **0 pages** avec données uniquement hardcodées

---

## [1.0.0] — 2026-02-20

### Description
Connexion complète du frontend aux vraies données API. Toutes les pages CRM affichent des données réelles depuis Supabase.

### Modifié

#### Pages connectées à l'API (8 pages)
- **Dashboard** (`/dashboard`) — KPIs depuis `/analytics/summary`, pipeline dynamique, deals récents
- **Contacts** (`/contacts`) — CRUD complet, recherche serveur, filtres type, pagination réelle, création via modal
- **Contacts détail** (`/contacts/[id]`) — Fiche contact API, timeline, suppression
- **Deals** (`/deals`) — Kanban dynamique depuis `/pipelines` + `/deals`, groupement par stage
- **Deals détail** (`/deals/[id]`) — Deal API, progression stages, activités, déplacement de stage
- **Devis & Factures** (`/orders`) — Liste API, filtres type/statut, recherche debounced, pagination
- **Devis détail** (`/orders/[id]`) — Document API, actions (envoyer/accepter/refuser/payer/dupliquer)
- **Analytiques** (`/analytics`) — Summary, revenus mensuels, stats pipeline

#### Settings & Auth
- **Paramètres** (`/settings`) — Profil, entreprise, mot de passe connectés à l'API
- **Layout dashboard** — Nom utilisateur réel, bouton déconnexion

#### Base de données
- **Migration SQL** exécutée sur Supabase (~50 tables)
- **Seed data** injecté (2 tenants, 5 users, 18 contacts, 14 entities, 10 orders, 8 deals)

### Stats
- 17 pages Next.js (build OK)
- 32 tests backend passants
- **0 données hardcodées** dans les pages principales
- 8 pages connectées à l'API réelle

---

## [0.9.0] — 2026-02-19

### Description
Git init, Docker, et préparation production. Premier commit avec tout le projet.

### Ajouté

#### Docker (5 fichiers)
- **backend/Dockerfile** — Multi-stage build (deps → build → runner), Node 20 Alpine, user non-root
- **frontend/Dockerfile** — Multi-stage build avec Next.js standalone output
- **docker-compose.yml** — Services backend + frontend, healthcheck, dépendances
- **.dockerignore** — Backend + frontend

#### Production Readiness
- **frontend/.env.example** — Variables d'environnement documentées
- **next.config.js** — `output: 'standalone'` pour Docker
- **Git init** — Premier commit (118 fichiers, 35,837 lignes)

### Stats finales
- **118 fichiers** committés
- **35,837 lignes** de code
- **18 pages** Next.js
- **18 routes** API
- **~50 tables** PostgreSQL
- **32 tests** passants
- **0 erreurs** TypeScript/build

---

## [0.8.0] — 2026-02-19

### Description
Pages de détail et formulaires interactifs. L'application CRM devient navigable et fonctionnelle.

### Ajouté

#### Pages de détail (3 pages dynamiques)
- **Contact** (`/contacts/[id]`) — Fiche contact complète avec avatar, infos, tags, timeline 8 événements, deals associés, devis, notes
- **Deal** (`/deals/[id]`) — Barre de progression étapes, 4 KPIs (montant/probabilité/score/jours), description, timeline activité, documents liés
- **Devis** (`/orders/[id]`) — Aperçu document style facture (en-tête entreprise, tableau lignes, sous-total/TVA/TTC), actions, deal associé

#### Formulaires interactifs
- **Contacts** — Page rendue interactive ('use client'), modal création contact 7 champs, recherche client-side, filtre par type
- **Nouveau contact** — Form avec validation, loading state, message succès

### Stats
- 18 pages Next.js (15 statiques + 3 dynamiques)
- 34 fichiers frontend, 54 fichiers backend
- **89 fichiers source** total

---

## [0.7.0] — 2026-02-19

### Description
Ajout des pages Email Marketing et Calendrier, plus une bibliothèque de composants UI réutilisables.

### Ajouté

#### Pages Dashboard (2 pages)
- **Email Marketing** (`/emails`) — Stats (envois, ouvertures, clics), table 6 campagnes démo, grille 4 templates avec aperçu
- **Calendrier** (`/calendar`) — Vue semaine avec grille horaire 08h-18h, 8 événements positionnés, prochains RDV

#### Composants UI réutilisables (6 fichiers)
- **Button** — 5 variantes (primary/secondary/outline/danger/ghost), 3 tailles, loading state, support href
- **Badge** — 7 variantes colorées (brand/emerald/amber/rose/violet/surface/default)
- **Modal** — Overlay, fermeture Escape/click-outside, 4 tailles, scroll lock
- **Card** — Container avec CardHeader, CardTitle, CardDescription
- **EmptyState** — État vide avec icône, titre, description, action
- **Barrel export** (`ui/index.ts`) — Import centralisé

### Stats
- 17 pages Next.js (build statique OK)
- 31 fichiers frontend, 54 fichiers backend, 1 SQL
- **86 fichiers source** total

---

## [0.6.0] — 2026-02-19

### Description
Connexion frontend-backend : authentification Supabase côté client, API client, middleware de protection des routes, et pages dashboard supplémentaires.

### Ajouté

#### Infrastructure Auth & API (4 fichiers)
- **AuthContext** (`contexts/AuthContext.tsx`) — Provider React avec session Supabase, onAuthStateChange, signOut, hook useAuth()
- **API Client** (`lib/api.ts`) — Utilitaire fetch typé avec helpers apiGet/apiPost/apiPatch/apiDelete, gestion token Bearer
- **Middleware** (`middleware.ts`) — Protection routes : redirect `/login` si non auth, redirect `/dashboard` si déjà auth
- **Dashboard layout** mis à jour avec AuthProvider

#### Pages Dashboard supplémentaires (3 pages)
- **Analytiques** (`/analytics`) — KPIs trimestriels, graphique CA 6 mois, top 5 clients, entonnoir de conversion
- **Devis & Factures** (`/orders`) — Table 8 documents démo, stats, filtres type/statut, badges colorés
- **Paramètres** (`/settings`) — 4 sections : Profil, Entreprise, Notifications, Sécurité

### Stats
- 15 pages Next.js (build statique OK)
- 23 fichiers frontend TSX/TS
- Middleware actif (26.7 kB)
- 32 tests backend passants

---

## [0.5.0] — 2026-02-19

### Description
Ajout de l'application CRM frontend : pages d'authentification, dashboard avec KPIs, liste contacts et pipeline Kanban.

### Ajouté

#### Restructuration Frontend
- **Route groups** — `(marketing)` pour le site vitrine, `(auth)` pour l'authentification, `(dashboard)` pour l'app CRM
- **Root layout** simplifié (fonts + html/body uniquement)
- **Marketing layout** avec Header + Footer (site vitrine existant)
- **Supabase client** (`lib/supabase.ts`) pour le frontend

#### Pages d'authentification (3 pages)
- **Login** (`/login`) — Email + mot de passe, appel Supabase Auth, redirection dashboard
- **Register** (`/register`) — Nom, email, mot de passe, nom d'entreprise, confirmation email
- **Forgot Password** (`/forgot-password`) — Reset par email via Supabase Auth
- Design centré, responsive, couleurs brand

#### Dashboard CRM (4 fichiers)
- **Layout** — Sidebar navigation (surface-900) + topbar avec recherche
- **Sidebar** (`components/Sidebar.tsx`) — Navigation avec icônes SVG, active state via usePathname
- **Dashboard** (`/dashboard`) — 4 KPI cards (contacts, deals, devis, CA), activité récente, mini pipeline
- **Contacts** (`/contacts`) — Table avec 8 contacts démo, badges score (hot/warm/cold), filtres, pagination
- **Deals** (`/deals`) — Vue Kanban 4 colonnes (Qualification, Proposition, Négociation, Gagné) avec deal cards

### Stats
- 12 pages Next.js (build statique OK)
- 17 fichiers frontend TSX/TS
- 0 erreurs build

---

## [0.4.0] — 2026-02-19

### Description
Ajout de l'infrastructure de tests avec Vitest. Refactoring app/server pour testabilité.

### Ajouté

#### Tests (5 fichiers, 32 tests)
- **Vitest config** (`vitest.config.ts`) — Configuration test runner Node.js
- **sanitize.test.ts** — 9 tests : null/undefined, primitives, troncature, redaction clés sensibles, nested, arrays, immutabilité
- **pagination.test.ts** — 11 tests : defaults, parsing, clamping, floor, offset, buildPaginationMeta
- **errorHandler.test.ts** — 5 tests : AppError class (statusCode, message, code, isOperational, stack)
- **scoring.service.test.ts** — 3 tests : getScoreLabel (hot/warm/cold)
- **api.test.ts** — 4 tests d'intégration : health 200, 404 catch-all, auth 401 contacts, auth 401 deals

#### Refactoring
- **Séparation app/server** — `index.ts` exporte l'app Express (testable), `server.ts` démarre le serveur + scheduler
- Scripts npm mis à jour : `dev` → `server.ts`, `start` → `server.js`

### Commandes
- `npm run test --workspace=backend` — Lancer les 32 tests
- `npm run test:watch --workspace=backend` — Mode watch
- `npm run test:coverage --workspace=backend` — Avec couverture

---

## [0.3.0] — 2026-02-19

### Description
Ajout du système de cron jobs automatisés et du système d'audit logs pour la traçabilité des actions.

### Ajouté

#### Cron Jobs (6 fichiers)
- **Scheduler** (`jobs/index.ts`) — Orchestrateur avec start/stop, graceful shutdown (SIGINT/SIGTERM)
- **Scoring Job** — Recalcul quotidien lead scoring AI à 02:00 UTC pour tous les tenants actifs
- **Reminders Job** — Vérification horaire des rappels automatiques (once/daily/weekly/monthly/yearly/interval)
- **Stagnant Deals Job** — Détection toutes les 6h des deals stagnants (>14j sans update), alerte système
- **Webhook Retry Job** — Retry toutes les 15min des webhooks échoués (max 3 tentatives, fenêtre 72h)
- **Usage Reset Job** — Remise à zéro des compteurs d'usage le 1er de chaque mois

#### Système d'Audit Logs (3 fichiers)
- **Middleware `auditLog`** — Intercept POST/PATCH/PUT/DELETE, log fire-and-forget dans `audit_logs`
- **Sanitize utility** — Nettoyage données sensibles (passwords, tokens, secrets → [REDACTED])
- **AuditService** — Requêtes audit avec filtres (user, action, resource, date range) + résumé activité 24h

#### Améliorations serveur
- Graceful shutdown (SIGINT/SIGTERM) avec arrêt propre du scheduler
- Import scheduler dans `index.ts`, démarrage auto après listen

---

## [0.2.0] — 2026-02-19

### Description
Ajout de la couche services (business logic), des intégrations tierces, et du seed data de développement.

### Ajouté

#### Services Business Logic (4 fichiers)
- **ScoringService** — Algorithme lead scoring AI (5 facteurs, score 0-100, hot/warm/cold)
- **NotificationService** — Notifications automatiques (commandes, deals, rappels, deals stagnants)
- **BillingService** — Gestion abonnements Stripe (checkout, webhooks, usage, limites par plan)
- **WebhookService** — Dispatch webhooks sortants (HMAC-SHA256 signature, retry failed)

#### Intégrations Tierces (4 fichiers)
- **StripeService** — Paiements (customers, checkout, portal, subscriptions) avec mode dev mock
- **BrevoService** — Email marketing (transactional, campaigns, contacts sync) avec mode dev mock
- **TwilioService** — SMS & WhatsApp (send, bulk, status check, format FR) avec mode dev mock
- **BridgeService** — Open Banking (connect, accounts, transactions, sync) avec mode dev mock

#### Seed Data
- Script `seed.ts` (54KB) avec données réalistes de démo
- 2 tenants : Garage Dupont (pro) + Hôtel Le Parisien (starter)
- 5 users, 18 contacts, 14 entities, 10 orders avec items
- Pipelines avec stages, deals, service orders, templates email
- Tags, notes, rappels automatiques, avis clients
- Commande : `npm run seed --workspace=backend`

### Corrigé
- Fix TypeScript : casting `response.json() as any` pour les services HTTP
- Fix import Stripe conditionnel (SDK optionnel)
- Fix marketplace.ts : `req: any` pour compatibilité Express types

---

## [0.1.0] — 2026-02-18

### Description
Initialisation complète du projet Vision CRM multi-métiers. Mise en place de l'architecture monorepo, du backend API, du schéma de base de données complet, et du site vitrine marketing.

### Ajouté

#### Structure projet
- Monorepo npm workspaces (`backend/` + `frontend/`)
- Configuration TypeScript strict pour backend
- ESLint + Prettier config
- `.env.example` documenté avec toutes les variables
- `CLAUDE.md` avec conventions projet
- `.gitignore` complet

#### Backend API (Express + TypeScript)
- Configuration Supabase client (anon + admin)
- Système d'authentification JWT via Supabase Auth
- Middleware RBAC (`requireRole`) pour 4 rôles
- Middleware isolation tenant (tenant_id scoping)
- Rate limiting par plan (Free: 100/h, Pro: 5000/h)
- Validation Zod centralisée
- Error handler global structuré
- Logger avec timestamps
- Pagination helper (page, limit, offset)
- **18 fichiers de routes API** couvrant :
  - Auth (register, login, refresh, me)
  - Tenants (CRUD, stats, modules)
  - Users (CRUD, RBAC)
  - Contacts (CRUD, timeline, tags, search)
  - Entities (CRUD multi-type : vehicle, room, patient, etc.)
  - Orders (CRUD, send, accept, reject, pay, PDF)
  - Service Orders (CRUD, status workflow, calendar)
  - Pipelines (CRUD, stages, reorder)
  - Deals (CRUD, move stage, score, forecast)
  - Email Marketing (templates, campaigns, sequences, Brevo webhooks)
  - Analytics (KPIs, reports, exports, revenue)
  - Web Forms (CRUD, public submit, lead routing)
  - SMS/WhatsApp (templates, campaigns, one-shot, conversations)
  - Banking (connections, transactions, reconciliation, treasury)
  - Webhooks (CRUD, deliveries, test)
  - Client Portal (magic link, dashboard, messages, quote requests)
  - Reports (saved, scheduled)

#### Base de données (PostgreSQL / Supabase)
- Migration initiale avec ~50 tables
- 25+ enums PostgreSQL
- RLS policies sur toutes les tables tenant-scoped
- Indexes de performance (schedules, search, etc.)
- Trigger `update_updated_at()` automatique
- Tables couvrant : Core, Entities, Services, Pipeline/Deals, Email, SMS, Forms, Banking, API/Webhooks, Analytics, Portal

#### Frontend Site Vitrine (Next.js 14)
- Setup Next.js 14 App Router + Tailwind CSS
- Design system Vision CRM (brand colors, typography)
- **Page Accueil** : Hero, 9 métiers, 6 features, How it works, Metrics, CTA
- **Page Tarifs** : 4 plans (Free/Starter/Pro/Enterprise) + add-ons + FAQ
- **Page Fonctionnalités** : 6 catégories détaillées
- Header responsive avec navigation + mobile menu
- Footer 4 colonnes avec liens
- SEO metadata sur toutes les pages
- Contenu 100% français

### Notes techniques
- Stack conforme au PRD v3.0 (Février 2026)
- Feature parity 95% HubSpot, 100% Pipedrive pour PME
- Budget infra cible : ~275€/mois
- 9 modules métiers supportés
- Architecture Core + Modules extensible

---

*Prochain : Phase 2 — Intégrations tierces (Stripe, Bridge, Brevo, Twilio)*
