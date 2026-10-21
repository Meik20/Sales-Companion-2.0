# Cartographie des API — Next.js Serverless Fullstack

L'architecture backend de Sales Companion 2.0 est **100% unifiée sous Next.js (App Router)** via les Serverless Route Handlers (`apps/web/src/app/api/`).  
L'ancien serveur Express distinct (`apps/server`) a été **intégralement retiré** au profit d'un runtime serverless unifié, performant et déployé sur Vercel.

---

## Source de Vérité Unique (`apps/web/src/app/api/`)

| Domaine | Routes principales | Runtime & Stockage |
|---|---|---|
| **Recherche Entreprises** | `/api/search/companies` | Supabase (PostgREST natif) + PostgreSQL |
| **Pipeline & Fiches CRM** | `/api/pipeline/*`, `/api/crm/*` | Firebase Firestore (`adminDb`) + Admin SDK |
| **Équipe & Organisation** | `/api/team/*` (org, accès, membres, révocation, transfert) | Firebase Firestore + Firebase Auth Admin |
| **Authentification** | `/api/auth/*` (activate, verify, google, exemption) | Firebase Auth + Admin SDK |
| **Paiements & Webhooks** | `/api/payment/*` (initiate, webhook, status) | Campay API + Firestore (`adminDb`) |
| **Intelligence Artificielle** | `/api/ai/chat` | Groq SDK + configuration dynamique |
| **Support & Tickets** | `/api/support/*` (threads, messages, sm-revocation) | Firebase Firestore (`adminDb`) |
| **Administration** | `/api/admin/*` (companies, users, stats, logs, payments) | Firestore + Supabase (`adminDb`) |
| **Santé & Monitoring** | `/api/health` | Diagnostic connectivité Firestore & Supabase |

---

## Principes d'Exécution & Sécurité

1. **Isolation & Défense en profondeur :**  
   Les routes sensibles (`/api/team/*`, `/api/crm/*`, `/api/payment/*`, `/api/admin/*`) sont exécutées avec les privilèges `adminDb` et `adminAuth`, validant systématiquement les jetons Firebase Auth (`verifyIdToken`), les Custom Claims (`role`, `orgRole`, `orgCode`), et les abonnements payants actifs.
2. **Aucun proxy externe :**  
   Toutes les requêtes de l'application cliente sont adressées en chemins relatifs de même origine (`/api/...`), sans latence inter-serveur ni dépendance `BACKEND_URL`.
3. **Contrats partagés :**  
   Les types, constantes et schémas Zod sont centralisés dans le package `@sales-companion/shared` consommé par l'application web.
