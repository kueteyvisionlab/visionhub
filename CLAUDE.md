# Vision CRM — Conventions Projet

## Architecture
- **Monorepo** avec workspaces npm : `backend/` + `frontend/`
- **Backend** : Node.js + Express + TypeScript + Supabase
- **Frontend vitrine** : Next.js 14 (App Router) + Tailwind CSS
- **App CRM** : Flutter (futur - dossier `app/`)
- **DB** : PostgreSQL via Supabase avec RLS multi-tenant

## Stack technique
| Couche | Technologie |
|--------|------------|
| API | Express 4 + TypeScript strict |
| DB | Supabase PostgreSQL (EU-West) |
| Auth | Supabase Auth (JWT) |
| Validation | Zod |
| Paiements | Stripe Connect |
| Email | Brevo API |
| SMS/WhatsApp | Twilio |
| Banking | Bridge API |
| Monitoring | Sentry |
| Frontend | Next.js 14 + Tailwind CSS |

## Conventions code

### Backend
- Routes dans `backend/src/routes/` — un fichier par domaine
- Types dans `backend/src/types/index.ts`
- Middleware dans `backend/src/middleware/`
- Validation Zod inline dans les routes
- Toutes les queries DB scoped par `tenant_id`
- Nommage tables : snake_case pluriel (`contacts`, `order_items`)
- Nommage colonnes : snake_case (`created_at`, `tenant_id`)
- API prefix : `/api/v1`

### Frontend
- App Router (dossier `src/app/`)
- Composants dans `src/components/`
- Design system : brand colors (#3269ff primary), DM Sans body, Instrument Serif headings
- Tout le contenu UI en français

### Git
- Commits en anglais, descriptifs
- Branches : `main`, `develop`, `feature/*`, `fix/*`

## Multi-tenant
- Chaque table porte `tenant_id` (sauf `tenants`, `modules`, `feature_flags`)
- RLS PostgreSQL pour isolation
- 4 rôles RBAC : `super_admin`, `admin`, `pro`, `client`

## Modules métiers supportés
garage, hotel, restaurant, salon, dentist, lawyer, landscaper, consultant, ecommerce

## Commandes
```bash
npm run dev:backend    # Lance le backend en dev
npm run dev:frontend   # Lance le frontend en dev
npm run build:backend  # Build TypeScript
npm run build:frontend # Build Next.js
npm run db:migrate     # Run migrations
```
