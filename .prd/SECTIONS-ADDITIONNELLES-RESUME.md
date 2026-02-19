# Sections Additionnelles — Vision CRM PRD v3.0

## 06sexies. PORTAIL CLIENT SELF-SERVICE

**Objectif** : Espace client sécurisé pour consulter historique, accepter devis, prendre RDV  
**Accès** : Magic link (pas de mot de passe)  
**URL** : `https://[tenant-slug].visioncrm.app`

**Features** :
1. Dashboard client (véhicules/chambres/patients, historique, factures)
2. Validation devis en ligne (accepter/refuser)
3. Booking RDV (calendrier sync ResourceSchedule)
4. Demande devis (formulaire + upload photos)
5. Messagerie tenant ↔ client

**DB** : `client_portal_sessions`, `portal_messages`, `portal_quote_requests`

**User Stories** :
- USB-29 : Accéder portail (magic link, dashboard, historique)
- USB-30 : Prendre RDV en ligne (calendrier, confirmation auto, rappels)

**Effort** : 60h (1.5 sprint)

---

## 06septies. ANALYTICS & REPORTING DASHBOARD

**Objectif** : KPIs business temps réel + rapports prédéfinis par métier

**Features** :
1. Dashboard KPIs (CA, clients, conversions, tickets moyens)
2. Rapports métier prédéfinis :
   - Garage : Top pièces vendues, CA par intervention
   - Hôtel : Taux occupation, RevPAR
   - Restaurant : Plats populaires, tickets moyens
3. Exports (PDF, Excel, CSV)
4. Rapports programmés (email quotidien/hebdo/mensuel)
5. Prévisions AI (CA mois suivant, détection anomalies)

**DB** : `saved_reports`, `scheduled_reports`

**API** :
```
GET /api/v1/analytics/summary
GET /api/v1/analytics/reports/:id
POST /api/v1/analytics/export
```

**User Story** :
- USB-31 : Dashboard analytics (KPIs temps réel, graphs, exports)

**Effort** : 40h (1 sprint)

---

## 06octies. FORMULAIRES WEB & LEAD CAPTURE

**Objectif** : Créer formulaires embarquables site web pour capturer leads

**Features** :
1. Éditeur formulaire drag & drop (champs custom)
2. Embed options (iframe, popup, page standalone)
3. Lead routing (création Contact + Deal auto)
4. Auto-réponse email client
5. Analytics formulaire (vues, soumissions, taux conversion)

**DB** : `web_forms`, `web_form_submissions`

**Integration** :
```html
<!-- Embed iframe -->
<iframe src="https://forms.visioncrm.app/{tenant}/{form-slug}"></iframe>

<!-- Popup JS -->
<script src="https://cdn.visioncrm.app/popup.js"></script>
<script>VisionCRM.popup('{form-id}', {trigger: 'exit-intent'});</script>
```

**User Story** :
- USB-32 : Créer formulaire web (éditeur, embed, analytics, lead routing)

**Effort** : 50h (1.25 sprint)

---

## 06nonies. SMS & WHATSAPP BUSINESS

**Objectif** : Communication multi-canal (SMS + WhatsApp)

**Provider** : **Twilio** (SMS + WhatsApp Business API)

**Features** :
1. Envoi SMS one-shot ou campagne
2. Templates SMS (160 chars, variables)
3. SMS automatiques (rappel RDV J-1, confirmation devis)
4. WhatsApp Business (conversations, templates approuvés Meta)
5. Inbox unifiée (WhatsApp/SMS/Email sur même thread)

**DB** : `sms_templates`, `sms_campaigns`, `sms_events`

**API** :
```
POST /api/v1/sms/campaigns
POST /api/v1/sms/send-one-shot
GET  /api/v1/whatsapp/conversations/:contact_id
```

**User Story** :
- USB-33 : Envoyer SMS rappel RDV (automation, tracking, dashboard)

**Pricing** :
- Free : 50 SMS/mois
- Starter : 500 SMS/mois
- Pro : 2000 SMS/mois
- Overages : 0,05€/SMS

**Effort** : 35h (1 sprint avec WhatsApp basique)

---

## 07. FEATURES PHASE 2 (Post-MVP)

### 07-A. Signatures Électroniques

**Provider** : DocuSign ou HelloSign  
**Use case** : Signer devis électroniquement  
**Flow** : Devis accepté → PDF généré → DocuSign embed → Webhook signature → Facture créée  
**Effort** : 30h

### 07-B. Gestion Documents (Drive)

**Storage** : Supabase Storage  
**Features** : Upload, preview, partage temporaire, arborescence contact  
**Effort** : 20h

### 07-C. Chat Live Support

**Tech** : WebSockets (Supabase Realtime)  
**Features** : Widget chat site, inbox pro, chatbot AI FAQ  
**Effort** : 60h

### 07-D. Territoires Géographiques

**Use case** : Enterprise (équipes commerciales par région)  
**DB** : `territories`, `deals.territory_id`  
**Effort** : 30h

---

## SCHEMAS DB COMPLETS (Résumé)

**Total tables** : ~50 tables PostgreSQL

**Groupes fonctionnels** :

**Core (12 tables)** :
- tenants, users, contacts, entities, tags, notes, files, audit_logs

**CRM & Sales (10 tables)** :
- orders, order_items, service_orders, pipelines, pipeline_stages, deals, deal_activities, revenue_forecasts

**Communications (8 tables)** :
- email_templates, email_campaigns, email_sequences, email_sequence_steps, email_sequence_enrollments, email_events, sms_templates, sms_campaigns

**Banking & Payments (5 tables)** :
- bank_connections, bank_transactions, reconciliation_rules, payment_transactions, invoices

**Integrations (7 tables)** :
- api_keys, oauth_apps, oauth_installations, webhooks, webhook_deliveries, integration_templates, tenant_integrations

**Marketing (4 tables)** :
- web_forms, web_form_submissions, reviews, automated_reminders

**Resources (3 tables)** :
- resource_schedule, inventory_items, inventory_movements

**Multi-tenant infra (3 tables)** :
- tenant_modules, usage_logs, feature_flags

---

## API ENDPOINTS COMPLETS (Résumé)

**Total** : ~100 endpoints REST

**Groupes** :

**Auth & Users** (5) :
- POST /auth/login, /auth/signup, /auth/refresh, GET /me, PATCH /users/:id

**Contacts (CRUD)** (6) :
- GET /contacts, POST /contacts, GET /contacts/:id, PATCH /contacts/:id, DELETE /contacts/:id, GET /contacts/:id/timeline

**Orders (CRUD + actions)** (8) :
- CRUD standard + POST /orders/:id/send, /orders/:id/accept, /orders/:id/pay

**Email Marketing** (6) :
- POST /email/campaigns, GET /email/campaigns/:id/stats, POST /email/sequences, etc.

**Pipeline & Deals** (7) :
- GET /pipelines, GET /pipelines/:id/deals, POST /deals, PATCH /deals/:id/stage, etc.

**Banking** (6) :
- POST /banking/connect/init, GET /banking/connections, GET /banking/transactions, etc.

**Webhooks** (4) :
- GET /webhooks, POST /webhooks, DELETE /webhooks/:id, GET /webhooks/:id/deliveries

**Marketplace** (5) :
- GET /marketplace/integrations, GET /marketplace/integrations/:slug, POST /integrations/install, etc.

**Analytics** (4) :
- GET /analytics/summary, GET /analytics/reports/:id, POST /analytics/export

**Forms** (3) :
- POST /forms, GET /forms/:id/submissions

**SMS** (3) :
- POST /sms/campaigns, POST /sms/send-one-shot

---

## NFR (Non-Functional Requirements)

### Performance
- API response time : < 200ms (p95)
- Dashboard load : < 1s
- Email send : < 5s
- DB queries : < 50ms (p95)

### Scalability
- 1000 tenants concurrent
- 100k contacts par tenant
- 10k req/min API (burst)

### Security
- HTTPS only (TLS 1.3)
- JWT tokens (expiration 1h)
- RLS PostgreSQL (isolation tenant)
- Secrets chiffrés AES-256
- Rate limiting (1000 req/h Free, 10k Pro)
- OWASP Top 10 compliance

### Availability
- Uptime : 99.9% SLA
- Backup quotidien DB
- Recovery Point Objective (RPO) : 24h
- Recovery Time Objective (RTO) : 2h

### RGPD
- Data residency : EU (Supabase Frankfurt)
- Droit accès/rectification/suppression
- Consentement email marketing
- Audit trail (90j retention)
- DPO contact : dpo@visioncrm.fr

---

## ROADMAP FINALE 2026

### Phase 1 : Foundation (M1-M2)
**Sprints 1-4** (8 semaines)
- Auth multi-tenant + RBAC
- CRM Core (contacts, timeline, tags)
- Devis/Facturation
- Stripe payments
- Mobile Flutter base

### Phase 2 : Integrations (M3-M4)
**Sprints 5-8** (8 semaines)
- Open Banking (Bridge API)
- API publique REST v1
- Webhooks sortants
- Marketplace (interface + Zapier app)

### Phase 3 : Marketing & Sales (M5-M6)
**Sprints 9-12** (8 semaines)
- Email marketing (Brevo)
- Pipeline Kanban + Lead scoring
- Portail client self-service
- Analytics dashboard

### Phase 4 : Comms & Forms (M7)
**Sprints 13-14** (4 semaines)
- Formulaires web
- SMS/WhatsApp (Twilio)

### Phase 5 : Modules Métiers (M8-M9)
**Sprints 15-18** (8 semaines)
- Module Garage (complet)
- Module Hôtel (complet)
- Module Restaurant (complet)

### Phase 6 : Polish & Beta (M10)
**Sprints 19-20** (4 semaines)
- Mobile polish (iOS + Android)
- Tests E2E complets
- Documentation utilisateur
- Beta testing (20 clients pilotes)

### Phase 7 : Launch (M11)
**Sprint 21-22** (4 semaines)
- Fixes beta feedback
- Marketing site (Next.js)
- Onboarding flows
- 🚀 **GO LIVE**

**Total MVP** : **11 mois** (44 semaines)  
**OU 6 mois** si équipe full-time (2 devs + 1 designer)

---

## PRICING & MONÉTISATION

### Plans Proposés

**FREE** (Gratuit) :
- 1 utilisateur
- 100 contacts
- 10 devis/mois
- 100 emails/mois
- 50 SMS/mois
- 1 connexion bancaire
- 2 intégrations
- Support email

**STARTER** (49€/mois) :
- 3 utilisateurs
- 1000 contacts
- 100 devis/mois
- 1000 emails/mois
- 500 SMS/mois
- 3 connexions bancaires
- 5 intégrations
- Support email + chat

**PRO** (149€/mois) ⭐ **RECOMMANDÉ PME** :
- 10 utilisateurs
- Contacts illimités
- Devis illimités
- 10k emails/mois
- 2000 SMS/mois
- Connexions bancaires illimitées
- Intégrations illimitées
- Lead scoring AI
- Portail client
- Support prioritaire
- Account manager

**ENTERPRISE** (Sur devis, ~500€+/mois) :
- Utilisateurs illimités
- Tout Pro +
- SLA 99.9%
- Onboarding dédié
- Formations équipe
- API rate limit 100k/h
- Territoires géographiques
- White-label (opt.)
- Support 24/7

### Modules Add-ons (Optionnel)

- **Module métier supplémentaire** : +20€/mois
- **WhatsApp Business API** : +30€/mois (templates illimités)
- **Signatures électroniques** : +15€/mois (50 signatures/mois)
- **Storage additionnel** : +10€/100GB

### Coûts Variables

- **Emails overages** : 0,02€/email au-delà quota
- **SMS overages** : 0,05€/SMS au-delà quota
- **Stripe fees** : 1,5% + 0,25€ par transaction

### Projections Revenus

**Hypothèses** :
- 50 clients M+6
- 200 clients M+12
- 500 clients M+24

**Mix** :
- 20% FREE (acquisition)
- 30% STARTER (49€)
- 45% PRO (149€) ← Majorité PME
- 5% ENTERPRISE (500€)

**MRR M+12** :
```
40 FREE × 0€ = 0€
60 STARTER × 49€ = 2 940€
90 PRO × 149€ = 13 410€
10 ENTERPRISE × 500€ = 5 000€
─────────────────────────
MRR Total = 21 350€
ARR = 256k€
```

**MRR M+24** :
```
100 FREE × 0€ = 0€
150 STARTER × 49€ = 7 350€
225 PRO × 149€ = 33 525€
25 ENTERPRISE × 500€ = 12 500€
────────────────────────────
MRR Total = 53 375€
ARR = 640k€
```

### Coûts Récurrents

**Infrastructure** (~275€/mois) :
- Supabase Pro : 25€
- Railway : 20€
- Vercel : 20€
- Bridge API : 99€
- Brevo : 19€
- Twilio : 50€
- CDN : 15€
- Monitoring : 26€

**Break-even** : ~12-15 clients Starter/Pro

**LTV/CAC Target** :
- CAC : 150€ (ads + sales)
- LTV : 1800€ (12 mois × 150€ ARPU)
- Ratio : **12:1** ✅

---

## KPIs & MÉTRIQUES SUCCÈS

### Acquisition (Mois +3 à +6)
- **Visites site** : 5k → 10k/mois
- **Signups trials** : 100 → 200/mois
- **Taux conversion trial → payant** : 15%
- **CAC** : < 150€

### Activation (Onboarding)
- **Time to first value** : < 10 min
- **% users ayant créé 1er devis** : 80%
- **% tenants ayant connecté 1 intégration** : 40%
- **% tenants ayant envoyé 1ère campagne email** : 30%

### Engagement (Utilisation)
- **DAU/MAU** : > 40%
- **Sessions/user/semaine** : > 5
- **Features adoptées** : > 4 (sur 10 core features)

### Rétention
- **Churn mensuel** : < 5%
- **Churn annuel** : < 30%
- **NPS** : > 50
- **Renouvellement annuel** : > 85%

### Revenus
- **MRR M+6** : 10k€
- **MRR M+12** : 50k€
- **ARPU** : 150€/mois
- **LTV** : 1800€ (12 mois)
- **LTV/CAC** : > 3

### Satisfaction
- **Support response time** : < 2h
- **Issue resolution** : < 24h
- **App store rating** : > 4.5/5
- **G2/Capterra reviews** : > 4.5/5

---

## ✅ CHECKLIST FINALE PRÉ-LANCEMENT

### Produit
- [ ] MVP features complètes (email, pipeline, portail, API, analytics)
- [ ] Tests E2E (100% coverage features critiques)
- [ ] Performance optimisée (< 200ms p95)
- [ ] Mobile iOS + Android publiés
- [ ] Documentation utilisateur (help center)

### Infrastructure
- [ ] Environnements : Dev, Staging, Prod
- [ ] Monitoring : Sentry + uptime alerts
- [ ] Backup quotidien DB (testés)
- [ ] CDN configuré (assets statiques)
- [ ] SSL certificates (wildcard *.visioncrm.fr)

### Sécurité
- [ ] Penetration testing (audit externe)
- [ ] OWASP Top 10 mitigé
- [ ] RGPD compliance (DPO nommé, CGU/Privacy)
- [ ] Rate limiting activé
- [ ] Secrets rotation policy

### Business
- [ ] Pricing finalisé (plans + add-ons)
- [ ] Stripe Connect configuré
- [ ] CGV + CGU validées (avocat)
- [ ] Support email + chat (Intercom ou Crisp)
- [ ] Account managers recrutés (si Enterprise)

### Marketing
- [ ] Site vitrine (Next.js) déployé
- [ ] SEO optimisé (mots-clés PME + métiers)
- [ ] Blog technique lancé (3 articles/mois)
- [ ] Ads Google/Facebook (budgets M+1 à M+3)
- [ ] Partenariats (comptables, experts-comptables)

### Légal
- [ ] RGPD : DPO, registre traitements, privacy policy
- [ ] Contrats clients (B2B, résiliation, SLA)
- [ ] Assurance cyber-risques
- [ ] Conditions générales marketplace (dev tiers)

---

*Document finalisé le 16/02/2026 — Vision CRM Product Team*
*Prêt pour développement — GO FOR LAUNCH 🚀*
