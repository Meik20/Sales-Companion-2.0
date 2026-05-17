# Sales Companion 2.0

**Réécriture complète de Sales Companion sur une base cohérente, robuste et maintenable.**

La plateforme B2B dédiée aux commerciaux et managers camerounais. Recherchez des entreprises, gérez votre pipeline et boostez vos performances.

---

## 🎯 Vision produit

**Stack technique identifiée :**

- **Frontend** : Next.js 16 + React 19 + TypeScript + TanStack Query
- **Backend** : Express.js + TypeScript + Node.js
- **Database** : Firebase/Firestore
- **Authentication** : Firebase Authentication
- **Deployment** : Railway
- **Type** : Progressive Web App (PWA)

**Architecture :**

```
sales-companion/
├── apps/
│   ├── web/              # Application Next.js PWA
│   └── server/           # API Express
├── packages/
│   └── shared/           # Code partagé (types, constantes, schémas)
├── firestore/
│   ├── rules/            # Règles de sécurité Firestore
│   ├── indexes/          # Index Firestore
│   └── docs/             # Documentation
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

## 🖥️ Backend (API)

### Routes principales

```
GET  /health                   Health check
POST /auth/*                   Authentification & tokens
GET  /admin/*                  Routes admin
GET  /companies/*              Entreprises
POST /imports/*                Import Excel/CSV
GET  /team/*                   Gestion équipe
POST /assignments/*            Affectations
POST /ai/*                     Assistant IA
GET  /support/*                Support
```

### Modules

1. **Auth** - Vérification tokens Firebase
2. **Companies** - API entreprises
3. **Imports** - Import de fichiers (Excel/CSV)
4. **Team** - Gestion équipes
5. **Assignments** - Affectations prospects
6. **Admin** - Management plateforme
7. **Support** - Tickets support
8. **AI** - Assistant IA (Groq)

### Technologies

```json
{
  "express": "4.21.0",
  "firebase-admin": "13.8.0",
  "cors": "2.8.5",
  "helmet": "8.0.0",
  "multer": "2.0.0",
  "exceljs": "4.4.0",
  "zod": "3.23.0"
}
```

### Scripts

```bash
npm run dev:server      # Développement (watch mode)
npm run build:server    # Build TypeScript
npm run start           # Production
npm run typecheck       # Vérifier types
```

### Middlewares

- **auth.middleware** - Vérification Firebase tokens
- **admin.middleware** - Guard admin
- **manager.middleware** - Guard manager
- **error.middleware** - Gestion erreurs globale

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

### Frontend (Vercel/Railway)

```bash
npm run build:web
# Build génère: .next/

npm run start  # Next.js production
```

### Backend (Railway)

```bash
npm run build:server
# Build génère: dist/

npm start      # Node production
```

### Variables d'environnement

**Frontend (.env.local)**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sales-companion-237
NEXT_PUBLIC_API_URL=https://api.salescompanion.cm
```

**Backend (.env)**

```env
PORT=8080
NODE_ENV=production
FIREBASE_PROJECT_ID=sales-companion-237
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
WEB_ORIGIN=https://salescompanion.cm
CORS_ORIGIN=https://salescompanion.cm
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
- [ ] Variables env Railway configurées
- [ ] railway.json configuré
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
