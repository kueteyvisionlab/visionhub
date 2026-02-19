# 06quater. EMAIL MARKETING & CAMPAGNES

## 🎯 Résumé Exécutif

**Objectif** : Email marketing natif intégré (campagnes + séquences auto)  
**Problème** : PME utilisent Mailchimp séparément → silos data  
**Solution** : Éditeur drag & drop + automation + Brevo integration  
**MVP** : Campagnes one-shot + 3 séquences prédéfinies par métier  
**Timeline** : Sprint 5-6 (2 semaines)  
**Dépendances** : Contacts, Tags, Orders (déjà MVP)

---

## 📊 Features Détaillées

### 1. Éditeur Email Drag & Drop
- Blocs : Texte, Image, Bouton, Séparateur, Social, Footer
- Variables : `{{contact.first_name}}`, `{{vehicle.brand}}`, etc.
- Preview Desktop/Mobile
- Templates métier (30+ prédéfinis)

### 2. Campagnes One-Shot
- Sélection audience (tags, segments, CSV import)
- Test A/B subject lines
- Programmation envoi
- Stats temps réel (ouvertures, clics, ROI)

### 3. Séquences Automatisées (Drip)
- Triggers : contact.created, order.sent, service.completed
- Timeline visuelle (délais entre étapes)
- Conditions arrêt (devis accepté, unsubscribe)
- Dashboard performance par étape

### 4. Gestion Désabonnements (RGPD)
- Lien unsubscribe obligatoire
- Préférences communication
- Suppression auto séquences

### 5. Intégration Brevo
- API envoi emails
- Webhooks events (delivered, opened, clicked, bounced)
- Sync contacts
- Rate limiting

---

## 🗄️ Schémas DB (Résumé)

```sql
-- Templates email (réutilisables)
email_templates (id, tenant_id, name, subject, html_body, json_structure, category)

-- Campagnes one-shot
email_campaigns (id, tenant_id, template_id, subject, subject_b, audience_filters, status, stats...)

-- Séquences automatiques
email_sequences (id, tenant_id, name, trigger_type, trigger_config, stop_conditions)
email_sequence_steps (id, sequence_id, step_order, delay_value, delay_unit, template_id, conditions)
email_sequence_enrollments (id, sequence_id, contact_id, current_step, status, next_email_due_at)

-- Tracking événements
email_events (id, campaign_id, contact_id, event_type, event_data, occurred_at)
```

**Total** : 7 tables + indexes

---

## 👤 User Stories (Résumé)

### USB-25 : Créer campagne email
**Actor** : Admin/Marketing  
**Story** : Créer campagne promo pneus hiver pour clients VIP  
**Flow** : Template → Audience → Params → Review → Send  
**AC** : 15+ critères (éditeur, A/B test, stats temps réel...)

### USB-26 : Créer séquence automatisée
**Actor** : Admin  
**Story** : Séquence rappel vidange 6 mois post-intervention  
**Flow** : Trigger config → Timeline builder → Activation  
**AC** : 12+ critères (conditions, enrollment auto, dashboard...)

---

## 📡 API Endpoints (Résumé)

```
POST /api/v1/email/campaigns
GET  /api/v1/email/campaigns/:id/stats
POST /api/v1/email/sequences
GET  /api/v1/email/sequences/:id/enrollments
POST /api/webhooks/brevo (webhook events)
```

---

## 💰 Pricing Impact

**Free** : 100 emails/mois  
**Starter** : 1000 emails/mois  
**Pro** : 10k emails/mois  
**Overages** : 0,02€/email

**Coût Brevo** : 19€/mois pour 10k emails (tenant Pro)

---

## ✅ Checklist Implémentation

- [ ] Setup Brevo account + API keys
- [ ] Créer tables DB + migrations
- [ ] Éditeur drag & drop (React + DraftJS ou TipTap)
- [ ] Engine variables (template parser)
- [ ] Cron job séquences (check enrollments daily)
- [ ] Webhooks Brevo handler (events)
- [ ] Dashboard stats temps réel
- [ ] Templates métier (garage, hôtel, restaurant)
- [ ] Tests E2E campagnes + séquences
- [ ] Documentation utilisateur

**Effort estimé** : 80h (2 sprints × 40h)

---

*Document complet disponible : vision-crm-prd-universal.html (section 06quater)*
