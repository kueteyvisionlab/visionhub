# Vision CRM — Multi-Métiers

> SaaS CRM multi-tenant pour PME françaises. 9 modules métiers, Open Banking, Pipeline AI, Email Marketing.

## Architecture

```
vision-crm/
├── .prd/                    # Product Requirements Documents
├── backend/                 # API Express + TypeScript
│   ├── src/
│   │   ├── config/          # Env, Supabase clients
│   │   ├── middleware/      # Auth, tenant, rate limit, validation
│   │   ├── routes/          # 18 route files (REST API)
│   │   ├── services/        # Business logic (future)
│   │   ├── types/           # TypeScript interfaces
│   │   └── utils/           # Logger, pagination
│   └── supabase/
│       └── migrations/      # SQL migrations
├── frontend/                # Site vitrine Next.js 14
│   └── src/
│       ├── app/             # Pages (App Router)
│       └── components/      # Header, Footer, UI
├── docs/                    # Documentation technique
├── CLAUDE.md                # Conventions projet
├── CHANGELOG.md             # Journal des modifications
└── package.json             # Monorepo workspaces
```

## Stack technique

| Couche | Technologie | Usage |
|--------|------------|-------|
| Backend API | Express + TypeScript | API REST modulaire |
| Base de données | PostgreSQL (Supabase) | Multi-tenant RLS |
| Auth | Supabase Auth | JWT, OAuth, Magic Links |
| Frontend vitrine | Next.js 14 | SEO, landing pages |
| App CRM | Flutter | Mobile iOS/Android + Web |
| Paiements | Stripe Connect | CB, prélèvements |
| Email | Brevo | Campagnes, séquences |
| SMS/WhatsApp | Twilio | Rappels, conversations |
| Banking | Bridge API | Open Banking FR |

## Démarrage rapide

### Prérequis
- Node.js >= 20
- npm >= 10
- Compte Supabase (projet EU-West)

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd vision-crm

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# Lancer en développement
npm run dev:backend    # API sur http://localhost:3001
npm run dev:frontend   # Site sur http://localhost:3000
```

### Base de données

```bash
# Appliquer les migrations sur Supabase
npm run db:migrate
```

## API

Base URL : `http://localhost:3001/api/v1`

### Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /auth/register | Créer un compte + tenant |
| POST | /auth/login | Connexion |
| GET | /contacts | Lister les contacts |
| POST | /orders | Créer un devis/facture |
| GET | /pipelines/:id/deals | Voir le pipeline |
| POST | /email/campaigns | Créer une campagne |
| GET | /analytics/summary | KPIs dashboard |
| GET | /banking/transactions | Transactions bancaires |

Voir la [documentation API complète](docs/api.md) pour les 100+ endpoints.

## Modules métiers

| Module | Entité | Exemples |
|--------|--------|----------|
| Garage | vehicle | Réparations, CT, pièces |
| Hôtel | room | Réservations, housekeeping |
| Restaurant | table_seat | Commandes, stocks |
| Salon coiffure | appointment | RDV, prestations |
| Dentiste | patient | Traitements, dossiers |
| Avocat | legal_case | Dossiers, deadlines |
| Paysagiste | project | Chantiers, devis |
| Consultant | project | Missions, facturation |
| E-commerce | product | Commandes, stock |

## Plans tarifaires

| | Free | Starter | Pro | Enterprise |
|--|------|---------|-----|-----------|
| Prix | 0€ | 49€/mois | 149€/mois | Sur devis |
| Utilisateurs | 1 | 3 | 10 | Illimité |
| Contacts | 100 | 1 000 | Illimité | Illimité |

## Licence

Propriétaire — VisionProd-Labz 2026
