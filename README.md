# Sales Companion 2.0

**Réécriture complète de Sales Companion sur une base cohérente, robuste et maintenable.**

La plateforme B2B dédiée aux commerciaux et managers camerounais. Recherchez des entreprises, gérez votre pipeline et boostez vos performances.

---

## 🎯 Vision produit

**Stack technique identifiée :**

- **Frontend & Backend API** : Next.js 16 (App Router) + React 19 + TypeScript + TanStack Query + Firebase Admin SDK
- **Database & Auth** : Firebase Firestore + Firebase Authentication
- **Deployment** : Vercel / Node.js
- **Type** : Progressive Web App (PWA avec App Shell & cache local)

**Architecture :**

```
sales-companion/
├── apps/
│   └── web/              # Application Next.js PWA fullstack (App Router, API Routes, SSR/SSG)
├── packages/
│   └── shared/           # Code partagé (types, constantes, schémas Zod)
├── firestore/
│   ├── rules/            # Règles de sécurité Firestore
│   ├── indexes/          # Index Firestore
│   └── docs/             # Documentation du modèle de données
└── docs/
    └── architecture/     # Documentation technique
```

---

## 🔥 Firebase Configuration

### Credentials Firebase

**Project ID :** `sales-companion-237`  
**Auth Domain :** `sales-companion-237.firebaseapp.com`

### Services requis

- ✅ Firebase Authentication (Email/Password)
- ✅ Cloud Firestore
- ✅ Firestore Rules & Security
- ✅ Firestore Indexes

## 🏢 Annuaire des entreprises (Supabase)

Supabase héberge uniquement l'annuaire des entreprises. Firebase Authentication et les
autres données applicatives (CRM, pipeline, rôles, équipes et support) restent sur Firebase.

1. Exécuter [`scripts/supabase-schema-companies.sql`](./scripts/supabase-schema-companies.sql)
   dans le SQL Editor du projet Supabase.
2. Définir `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement
   serveur Next.js. La clé `service_role` ne doit jamais être exposée au navigateur.
3. La recherche d'entreprises et les imports administrateur utilisent Supabase dès que ces
   variables sont configurées. L'historique des imports reste dans Firestore.
4. Pour migrer les entreprises camerounaises déjà stockées dans Firestore, lancer
   `npm run migrate:companies` depuis la racine. Cette commande effectue une simulation
   paginée, sans écrire dans Supabase. Après vérification du nombre de fiches et des NIU en
   doublon, lancer `npm run migrate:companies -- --execute` pour faire les upserts par lots.
   Les IDs Firestore sont conservés, les fiches sans raison sociale et les NIU en doublon
   bloquent l'exécution, et Firestore n'est jamais modifié par le script.

---

## 🌐 Frontend (Web)

### Pages principales

```
/                          Redirection vers /landing
/landing                   Landing page PWA
/login                     Connexion
/register                  Inscription
/activate                  Activation compte

/search                    Recherche d'entreprises
/pipeline                  Pipeline CRM
/saved                     Recherches sauvegardées
/team                      Gestion d'équipe
/profile                   Mon profil
/support                   Support

/admin/*                   Panel administrateur
```

### Features

1. **Recherche Entreprises** - Base RCCM/NIU camerounaise
2. **Pipeline CRM** - Suivi des prospects (Prospection → Conclue)
3. **Gestion Équipe** - Assignations et tableau de bord manager
4. **Assistant IA** - Conseils commerciaux (Groq)
5. **Recherches Sauvegardées** - Accès rapide aux critères
6. **PWA Offline** - Mode hors-ligne complet
7. **Support Intégré** - Tickets et chat
8. **Admin Dashboard** - Gestion utilisateurs et imports

### Technologies

```json
{
  "next": "16.2.4",
  "react": "19.0.0",
  "firebase": "11.10.0",
  "@tanstack/react-query": "5.0.0",
  "zod": "3.23.0",
  "typescript": "5.6.0"
}
```

### Scripts

```bash
npm run dev:web         # Développement (port 3000)
npm run build:web       # Build production
npm run typecheck:web   # Vérifier types
npm run lint:web        # Linter
npm run test:web        # Tests
```

---

## 🖥️ Backend (API Routes Next.js App Router)

Les endpoints serveur sont implémentés sous forme de Route Handlers Next.js (`apps/web/src/app/api/...`), exécutés en environnement Serverless avec isolation dynamique via `firebase-admin@13.10.0`.

### Routes principales

```
GET  /api/health                       Health check avec sonde Firestore temps réel
POST /api/auth/*                       Authentification & claims
GET  /api/admin/*                      Gestion administrative
POST /api/imports                      Import de fichiers (Excel/CSV via buffer mémoire)
GET/POST /api/team/*                   Gestion d'équipe & activations
GET/POST /api/pipeline/*               Pipeline CRM & agrégations multi-tenants
POST /api/ai/*                         Assistant IA (Groq)
GET/POST /api/support/*                Tickets & messagerie support
POST /api/payment/webhook              Webhook de paiement Mobile Money (CamPay HMAC)
GET  /api/cron/check-subscriptions     Vérification quotidienne des abonnements
```

### Technologies & Verrous de Sécurité

```json
{
  "next": "16.2.4",
  "firebase-admin": "^13.10.0",
  "exceljs": "4.4.0",
  "zod": "3.23.0"
}
```

> [!CAUTION]
> **Verrou architectural Firebase Admin :** `firebase-admin` DOIT rester sur la branche v13.x pour compatibilité avec le runtime Serverless CommonJS de Vercel. Tout accès passe par les proxies dynamiques de `apps/web/src/lib/firebase-admin.ts`.

### Scripts d'exécution

```bash
npm run dev:web         # Démarrer le serveur de développement (port 3000)
npm run build           # Compiler packages partagés + application web
npm run build:web       # Build de production Next.js
npm run typecheck       # Vérifier les types TypeScript du monorepo
npm run check:integrity # Contrôle des invariants architecturaux & règles AGENTS.md
npm run test:web        # Exécuter les tests unitaires
```

### Sécurité & Middleware

- **proxy.ts** - Détection et filtrage des bots malveillants, limitation de débit périmétrique
- **rate-limit.ts** - Rate limiting distribué Upstash Redis (avec repli glissant sécurisé en mémoire)
- **HMAC SHA-256** - Validation cryptographique stricte du webhook de paiement CamPay
- **Atomic Transactions** - Consommation à usage unique des invitations d'activation d'équipe

---

## 🔐 Sécurité Firestore

### Collections protégées

```javascript
// users: Admin, owner, ou manager peuvent lire
// companies: Lecture auth, Écriture admin only
// pipeline: User-scoped + manager peut voir son équipe
// saved_searches: User-scoped strict
// support_threads: User ou admin
// team_accesses: Manager-scoped
// assignments: Manager créé, assignee peut update
// app_config: Admin only
// usage_logs: Create user, Read admin
// import_logs: Admin only
```

### Règles Firestore

**Fichier :** `firestore/rules/firestore.rules`

```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function authUid() { return request.auth.uid; }
    function isAdmin() { return get(/databases/{database}/documents/users/{authUid()}).data.role == 'admin'; }
    function isManager() { return get(/databases/{database}/documents/users/{authUid()}).data.role == 'manager'; }

    // Collections avec règles appropriées...
  }
}
```

### Déploiement

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 🎨 Design System

### Tokens CSS

```css
--g: #1b7a3e /* Vert principal Cameroun */ --gm: #2ea05a /* Vert moyen */ --gd: #145f2f
  /* Vert foncé */ --accent: #00897b /* Accent teal */ --gold: #f5a623 /* Or */ --dark: #0d1117
  /* Fond dark */ --tx: #f0f6fc /* Texte clair */ --tx2: #8b949e /* Texte secondaire */;
```

### Typographie

```css
'Syne'       - Titres (font-weight: 700-800)
'Inter'      - Body & UI
'DM Sans'    - Subtext
```

---

## 📱 PWA Configuration

### Service Worker

**Fichier :** `public/sw.js`

Features :

- Cache strategies (Cache-First, Network-First)
- Offline fallback
- Background sync
- Push notifications

### Manifest

**Fichier :** `public/manifest.json`

- Icônes multiples tailles (192, 512, maskable)
- Standalone mode
- Thème Cameroun
- Shortcuts (Recherche, Pipeline)

### Installation

L'app peut être installée comme native sur :

- Android (Chrome, Edge, Samsung)
- iOS (PWA web-based)

---

## 🚀 Déploiement

### Application Web & API (Vercel)

L'application Next.js (Web + API Routes) est déployée entièrement sur **Vercel**.

```bash
npm run build:web
# Build génère: .next/
```

### Variables d'environnement (Vercel)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sales-companion-237
FIREBASE_PROJECT_ID=sales-companion-237
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
GEMINI_API_KEY=...
CAMPAY_USERNAME=...
CAMPAY_PASSWORD=...
```

---

## 📦 Package Structure

### `@sales-companion/shared`

Types, constantes et utilitaires partagés :

```
packages/shared/src/
├── types/           # Types TypeScript
├── schemas/         # Zod schemas
├── constants/       # Constantes métier
└── utils/           # Utilitaires
```

---

## 🧪 Tests

### Frontend (Vitest)

```bash
npm run test:web
```

### Backend (Vitest)

```bash
npm run test:server
```

### Couverture

- Utils (CSV parsing, imports guards)
- Services (company-import, pitch, stats)
- API endpoints

---

## 📚 Collectes Firestore

### Modèle de données

**Fichier :** `firestore/docs/data-model.md`

Collections :

- `users` - Profils utilisateurs
- `companies` - Entreprises camerounaises
- `pipeline` - Prospects CRM
- `saved_searches` - Recherches sauvegardées
- `support_threads` - Support client
- `team_accesses` - Accès équipe
- `assignments` - Affectations
- `app_config` - Configuration
- `usage_logs` - Logs d'utilisation
- `import_logs` - Logs d'import

---

## 🛠️ Commandes principales

```bash
# Développement
npm run dev:web              # Frontend dev
npm run dev:server           # Backend dev

# Build
npm run build                # Build tout
npm run build:web            # Frontend build
npm run build:server         # Backend build

# Vérification
npm run typecheck            # TypeScript check
npm run lint                 # Linter
npm run format               # Formatter

# Tests
npm run test:web             # Frontend tests
npm run test:server          # Backend tests

# Monorepo workspace
npm --workspace apps/web run dev
npm --workspace apps/server run dev
npm --workspace packages/shared run build
```

---

## 📋 Checklist Déploiement

- [ ] Convertir favicons ICO → SVG/PNG
- [ ] Tester Service Worker en offline
- [ ] Vérifier Firestore rules et indexes
- [ ] Tests d'authentification
- [ ] Tests CRUD Firestore
- [ ] Lighthouse PWA audit
- [ ] Security headers validés
- [ ] Build test production (web et server)
- [ ] Variables d'environnement production configurées
- [ ] Health check endpoint testée
- [ ] Backup Firestore prêt

---

## 🤝 Contribution

### Structure code

```typescript
// Components
src/components/
├── auth/           # Authentification
├── forms/          # Formulaires
├── layout/         # Layout principal
├── feedback/       # Notifications
└── ui/             # Composants UI

// Features (métier)
src/features/
├── companies/
├── pipeline/
├── search/
├── team/
└── ...

// Services & Repos
src/services/       # Logique métier
src/repositories/   # Accès données

// Hooks & Utils
src/hooks/
src/utils/
src/lib/
src/types/
```

### Conventions

- **TypeScript strict** - Pas d'any
- **Nommage clair** - Éviter les abbréviations
- **Modularité** - Une responsabilité par fichier
- **Documentation** - JSDoc pour les functions
- **Tests** - Couverture > 70%

---

## 📞 Support

Pour les problèmes :

1. Vérifier la documentation
2. Créer un ticket support dans l'app
3. Contacter l'équipe admin

---

## 📝 License

© 2025 Sales Companion. Tous droits réservés.

Made in Cameroon 🇨🇲

# Sales-Companion-2.0
