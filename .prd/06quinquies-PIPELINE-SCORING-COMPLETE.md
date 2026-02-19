# 06quinquies. PIPELINE KANBAN & LEAD SCORING AI

## 🎯 Résumé Exécutif

**Objectif** : Vue Kanban des deals + scoring AI pour priorisation  
**Problème** : Suivi deals dans Excel, pas de visibilité, priorisation manuelle inefficace  
**Solution** : Pipeline drag & drop + score ML 0-100 + prévisions CA  
**MVP** : Pipeline 5 colonnes + scoring quotidien + dashboard prévisions  
**Timeline** : Sprint 7-8 (2 semaines)  
**Dépendances** : Contacts, Orders, Email events

---

## 📊 Features Détaillées

### 1. Pipeline Kanban Personnalisable
- Colonnes : Prospect (10%) → Devis (30%) → Négo (60%) → Signé (100%)
- Cards deal : Score 🟢🟠🔵, Montant, Date clôture, Owner, Tags
- Drag & drop avec confirmation si > 5k€
- Filtres : Owner, Montant, Score, Tags, Date
- Tri par : Date, Montant, Score

### 2. Lead Scoring Automatique (AI)
**Algorithme** (cron quotidien 02:00) :
```
Score = (
  Engagement email × 30% +    // Email ouvert/cliqué
  Historique client × 25% +   // CA lifetime, récurrence
  Montant deal × 20% +        // Taille opportunité
  Vélocité deal × 15% +       // Vitesse progression
  Profil client × 10%         // Tags VIP/B2B
) / 100

Score normalisé : 0-100
```

**Affichage** :
- 80-100 : 🟢 Hot lead
- 50-79 : 🟠 Warm lead
- 0-49 : 🔵 Cold lead

### 3. Notifications Intelligentes
- Score passe > 85 → Push "Deal devient hot lead"
- Score chute < 30 → Alerte "Deal refroidit"
- Deal stagne > 14j → Email récap quotidien
- Prochaines actions suggérées (AI)

### 4. Prévisions CA (Weighted Pipeline)
```
Weighted = Σ (montant × probabilité_colonne)

Exemple :
Pipeline total : 58 600€
Weighted : 21 320€ (36% taux réalisation)
Objectif mois : 25 000€
Atteint : 85%
```

**Dashboard** :
- KPIs (pipeline, weighted, objectif, réalisé)
- Graph évolution 30j
- Vélocité deals (temps moyen Prospect → Signé)
- Meilleur closer (CA par commercial)

---

## 🗄️ Schémas DB (Résumé)

```sql
-- Pipelines configurables
pipelines (id, tenant_id, name, is_default)

-- Colonnes Kanban
pipeline_stages (id, pipeline_id, name, display_order, probability, color, is_closed_won/lost)

-- Deals
deals (id, tenant_id, pipeline_id, stage_id, name, contact_id, order_id, amount, 
       lead_score, score_breakdown, owner_user_id, status, expected_close_date)

-- Timeline activités
deal_activities (id, deal_id, activity_type, description, metadata, user_id, occurred_at)

-- Snapshots prévisions
revenue_forecasts (id, tenant_id, pipeline_id, period_start/end, total_pipeline, 
                   weighted_pipeline, actual_revenue)
```

**Total** : 5 tables + indexes

---

## 👤 User Stories (Résumé)

### USB-27 : Vue pipeline Kanban
**Actor** : Commercial/Admin  
**Story** : Voir tous deals en cours pour prioriser actions  
**Flow** : Vue Kanban → Filtres → Drag & drop → Fiche deal  
**AC** : 20+ critères (cards, filtres, drag & drop, stats...)

### USB-28 : Lead scoring automatique
**Actor** : Système  
**Story** : Calculer score 0-100 pour prioriser opportunités  
**Flow** : Cron quotidien → Calcul 5 facteurs → MAJ DB → Notifications  
**AC** : 10+ critères (algorithme, affichage, alertes...)

---

## 📡 API Endpoints (Résumé)

```
GET    /api/v1/pipelines
GET    /api/v1/pipelines/:id/deals
POST   /api/v1/deals
PATCH  /api/v1/deals/:id
PATCH  /api/v1/deals/:id/stage (move column)
POST   /api/v1/deals/:id/activities
GET    /api/v1/deals/:id/score (detail scoring)
GET    /api/v1/revenue/forecast?period=month
```

---

## 💰 Pricing Impact

**Tous plans** : Pipeline standard inclus  
**Pro** : Pipelines multiples + AI scoring avancé  
**Enterprise** : Territoires géographiques + équipes

---

## ✅ Checklist Implémentation

- [ ] Créer tables DB + migrations
- [ ] UI Kanban (React DnD ou react-beautiful-dnd)
- [ ] Algorithme scoring (Python script)
- [ ] Cron job quotidien scoring
- [ ] Dashboard prévisions (Recharts)
- [ ] Fiche deal complète (modal)
- [ ] Notifications (push + email)
- [ ] Filtres & tri avancés
- [ ] Tests scoring (edge cases)
- [ ] Documentation scoring algorithm

**Effort estimé** : 70h (2 sprints × 35h)

---

*Document complet disponible : vision-crm-prd-universal.html (section 06quinquies)*
