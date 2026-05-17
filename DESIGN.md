# 🎨 Sales Companion 2.0 - Design & Architecture

## 📋 Vue d'ensemble

Sales Companion 2.0 est une plateforme B2B complète dédiée aux commerciaux et managers camerounais. C'est une **Progressive Web App (PWA)** conçue pour la recherche d'entreprises, la gestion de pipeline CRM, et la collaboration d'équipe.

---

## 🏗️ Architecture globale

### Monorepo Structure

```
sales-companion/
├── apps/
│   ├── web/                 # Application Next.js (Frontend PWA)
│   └── server/              # API Express.js (Backend)
├── packages/
│   └── shared/              # Code partagé (types, constantes, schémas)
├── firestore/
│   ├── rules/               # Règles de sécurité Firestore
│   ├── indexes/             # Index Firestore
│   └── docs/                # Documentation BD
├── docs/
│   └── architecture/        # Documentation technique
└── scripts/                 # Scripts d'automatisation
```

### Stack Technique

**Frontend:**

- Next.js 16 (Turbopack) + React 19
- TypeScript 5.6
- TanStack Query 5
- Firebase SDK 11
- Zod (validation schemas)
- PWA avec Service Worker

**Backend:**

- Express.js + TypeScript
- Node.js runtime
- Firebase Admin SDK
- Groq API (IA)
- Swagger/OpenAPI

**Infrastructure:**

- Firebase/Firestore (Database + Auth)
- Firebase Admin (Backend access)
- Railway (Deployment)
- Docker (Containerization)

---

## 🌐 Frontend (Web App)

### Structure des dossiers

```
apps/web/src/
├── app/                     # Next.js 16 App Router
│   ├── (public)/            # Routes publiques
│   │   ├── layout.tsx
│   │   ├── page.tsx         # Redirection vers /landing
│   │   └── landing/
│   ├── (protected)/         # Routes authentifiées
│   │   ├── layout.tsx
│   │   ├── search/          # Recherche d'entreprises
│   │   ├── pipeline/        # Gestion du pipeline
│   │   ├── saved/           # Recherches sauvegardées
│   │   ├── team/            # Gestion d'équipe
│   │   ├── profile/         # Profil utilisateur
│   │   ├── support/         # Support tickets
│   │   └── settings/        # Paramètres
│   ├── admin/               # Routes admin
│   ├── api/                 # API Routes (handlers)
│   │   ├── search/
│   │   ├── pipeline/
│   │   ├── saved-companies/
│   │   ├── saved-searches/
│   │   ├── team/
│   │   ├── support/
│   │   ├── imports/
│   │   ├── ai/
│   │   └── auth/
│   ├── globals.css          # Design tokens & base styles
│   └── layout.tsx           # Root layout + PWA metadata
├── components/              # Composants réutilisables
│   ├── auth/                # Composants auth (login, register)
│   ├── feedback/            # Feedback UX (modals, toast)
│   ├── ui/                  # UI primitives (Button, Input, etc.)
│   └── PWAInitializer.tsx   # Service Worker registration
├── features/                # Feature modules (logique métier)
│   ├── auth/
│   ├── search/
│   ├── pipeline/
│   ├── team/
│   ├── support/
│   └── admin/
├── hooks/                   # React hooks personnalisés
├── lib/                     # Utilities et helpers
│   └── firebase-admin.ts    # Firebase admin initialization
├── providers/               # Context providers
├── repositories/            # Data access layer
├── services/                # Business logic
├── constants/               # Constantes globales
├── styles/                  # Design tokens
└── types/                   # Types TypeScript globaux
```

### Pages principales

| Route           | Description                           | Protection |
| --------------- | ------------------------------------- | ---------- |
| `/`             | Redirection vers `/landing`           | Public     |
| `/landing`      | Landing page PWA                      | Public     |
| `/login`        | Connexion                             | Public     |
| `/register`     | Inscription                           | Public     |
| `/activate`     | Activation compte (Via Access ID)     | Public     |
| `/verify-email` | Rappel de vérification email          | Public     |
| `/search`       | Recherche d'entreprises               | Privée     |
| `/pipeline`     | Gestion du pipeline                   | Privée     |
| `/saved`        | Recherches & entreprises sauvegardées | Privée     |
| `/team`         | Gestion d'équipe (manager)            | Privée     |
| `/profile`      | Mon profil                            | Privée     |
| `/support`      | Support tickets & messages            | Privée     |
| `/ai`           | Assistant IA - Conseils commerciaux   | Privée     |
| `/settings`     | Paramètres compte                     | Privée     |
| `/admin/*`      | Dashboard administrateur              | Admin only |

### Features principales

1. **🔍 Recherche d'Entreprises**
   - Base RCCM/NIU camerounaise
   - Filtres avancés (secteur, localisation, chiffre d'affaires)
   - Pagination et infinite scroll
   - Sauvegarde de critères

2. **📊 Pipeline CRM**
   - Stages: Prospection → Intéressée → Négociation → Conclue
   - Drag & drop entre colonnes
   - Détails complets des prospects
   - Notes et historique d'interactions

3. **👥 Gestion Équipe**
   - Assignation de prospects
   - Tableau de bord manager
   - Performance analytics
   - Notifications d'assignation

4. **🤖 Assistant IA**
   - Conseils commerciaux basés sur Groq
   - Chat interface accessible depuis la navigation mobile
   - Contexte sur les prospects et stratégies de vente
   - Onglet dédié pour consultations approfondies

5. **💾 Recherches Sauvegardées**
   - Sauvegarde critères de recherche
   - Sauvegarde entreprises favorites
   - Accès rapide aux favoris

6. **📱 Mode Offline PWA**
   - Service Worker caching
   - Synchronisation en arrière-plan
   - Offline.html fallback
   - Push notifications

7. **💬 Support Intégré**
   - Création tickets
   - Chat support temps réel
   - Historique conversations

8. **🔑 Admin Dashboard**
   - Gestion utilisateurs (Activation, suspension)
   - Import données en masse (CSV avec mapping intelligent)
   - Configuration système (Quotas, rôles)
   - Logs et audit analytics

9. **🛡️ Sécurité & Hardening**
   - **Rate Limiting** : Protection contre les attaques DoS (100 requêtes / 15 min par IP)
   - **Email Verification** : Accès bloqué tant que l'adresse email n'est pas confirmée via Firebase Auth
   - **Error Masking** : Masquage des détails techniques (stack traces) en production
   - **Firestore Rules** : Protection stricte des champs critiques (`plan`, `role`, `dailyLimit`) via `allow update: if false` pour les clients
   - **Deduplication ID** : Garantie d'unicité des `accessId` lors de l'activation des membres

### Design System

**Tokens CSS** (`src/styles/tokens.ts`):

```typescript
colors: {
  bg1, bg2, bg3                // Backgrounds
  border, borderMid            // Borders
  text, textMid, textLight     // Text colors
  greenMid, greenLight         // Primary colors (Cameroon theme)
  redMid, yellowMid            // Accent colors
}

spacing: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64

typography:
  - Syne: Headings (bold, -0.03em letter-spacing)
  - System: Body text
```

**Animations** (`src/app/globals.css`):

- `fadeUp`: Apparition avec remontée
- `pulse`: Pulsation infinie
- `glow`: Effet lumineux
- `slideIn`: Entrée par glissement
- Durée: 300ms-600ms, easing: cubic-bezier

---

## 🖧 Backend (API)

### Structure des dossiers

```
apps/server/src/
├── app/
│   ├── createServer.ts      # Configuration Express
│   └── index.ts             # Entry point
├── config/
│   └── env.ts               # Variables d'environnement
├── firebase/
│   └── admin.ts             # Firebase Admin initialization
├── middlewares/
│   ├── admin.middleware.ts   # Vérification admin
│   ├── auth.middleware.ts    # Vérification JWT token
│   ├── error.middleware.ts   # Gestion erreurs
│   └── manager.middleware.ts # Vérification manager
├── modules/                 # Domaines métier
│   ├── admin/               # Gestion administrateur
│   ├── ai/                  # Intégration Groq
│   ├── assignments/         # Assignations équipe
│   ├── auth/                # Authentification
│   ├── companies/           # Recherche entreprises
│   ├── imports/             # Import données masse
│   ├── pipeline/            # Pipeline CRM
│   ├── support/             # Support tickets
│   └── team/                # Gestion équipe
├── services/
│   ├── company-import.service.ts
│   ├── company-import.helpers.ts
│   ├── pitch.service.ts
│   └── stats.service.ts
├── types/
│   └── express.d.ts         # Types Express personnalisés
├── utils/
│   ├── async-handler.ts     # Wrapper async/await
│   ├── csv.ts               # Parsing CSV
│   ├── import-guards.ts     # Validation imports
│   ├── import-normalize.ts  # Normalisation données
│   └── logger.ts            # Logging système
└── swagger.json             # Documentation API OpenAPI
```

### API Endpoints principaux

**Authentication:**

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/activate` - Activation compte

**Recherche Entreprises:**

- `GET /api/companies/search` - Recherche avec filtres
- `POST /api/companies/saved` - Sauvegarder favoris
- `GET /api/companies/saved` - Récupérer favoris

**Pipeline:**

- `GET /api/pipeline` - Liste prospects
- `POST /api/pipeline` - Créer prospect
- `PUT /api/pipeline/[id]` - Modifier prospect
- `DELETE /api/pipeline/[id]` - Supprimer prospect

**Équipe (Manager):**

- `POST /api/team/members` - Ajouter membre
- `GET /api/team/members` - Liste équipe
- `POST /api/team/assignments` - Assigner prospect

**Support:**

- `POST /api/support/threads` - Créer ticket
- `GET /api/support/threads/[id]` - Détail ticket
- `POST /api/support/threads/[id]/messages` - Ajouter message

**Admin:**

- `GET /api/admin/users` - Gestion utilisateurs
- `POST /api/admin/imports` - Importer données
- `GET /api/admin/stats` - Statistiques système

---

## 🎯 Shared Package

### Exports

```typescript
// Constants
export * from './constants/plans'
export * from './constants/pipeline-status'
export * from './constants/roles'
export * from './constants/sectors'
export * from './constants/support-status'

// Types
export * from './types/user'
export * from './types/company'
export * from './types/pipeline'
export * from './types/saved-search'
export * from './types/support'
export * from './types/team'
export * from './types/assignment'
export * from './types/payment'

// Schemas Zod
export * from './schemas/user.schema'
export * from './schemas/company.schema'
export * from './schemas/pipeline.schema'

// Utils
export * from './utils/ids'
export * from './utils/normalize'
```

### Types partagés

```typescript
// User
User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  role: 'independent' | 'manager' | 'admin'
  companyName?: string
  businessSector?: string
  createdAt: Timestamp
}

// Pipeline item
Pipeline {
  id: string
  userId: string
  companyId: string
  stage: 'prospection' | 'intéressée' | 'négociation' | 'conclue'
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Company
Company {
  id: string
  rccm: string
  niu: string
  name: string
  sector: string
  city: string
  address: string
  phone?: string
  email?: string
}
```

// Plan types & Quotas
PLANS {
free: { dailyLimit: 10 }
starter: { dailyLimit: 50 }
pro: { dailyLimit: 200 }
enterprise: { dailyLimit: 1000 }
}

## 🔐 Firebase & Firestore

### Collections Firestore

```
users/
  {uid}/
    - email, displayName, role, companyName, etc.
    - createdAt, updatedAt

pipeline/
  {docId}/
    - userId, companyId, stage, notes
    - createdAt, updatedAt

companies/
  {companyId}/
    - rccm, niu, name, sector, city, etc.

saved_companies/
  {docId}/
    - userId, companyId, savedAt

saved_searches/
  {docId}/
    - userId, criteria (filtres), createdAt

support_threads/
  {threadId}/
    - userId, subject, status
    - messages/
      {messageId}/
        - content, author, timestamp

team_accesses/
  {accessId}/
    - email, status, accessLabel, firstname, etc.

imports/
  {importId}/
    - userId, status, recordsCount, createdAt
```

### Règles de sécurité

- Authentification requise pour accès données
- Isolation utilisateur (chacun voit ses propres données)
- Permissions admin pour gestion système
- Isolation manager (accès équipe assignée)
- **Validation Email** : Champ `emailVerified` (Auth) synchronisé avec l'accès aux routes protégées
- **Champs Protégés** : `dailyLimit`, `role`, `plan` ne peuvent être modifiés que par l'Admin SDK (Server) ou la Console Admin.

---

## 📦 PWA - Progressive Web App

### Service Worker (`public/sw.js`)

**Stratégies de caching:**

- **Cache-First**: Images, fonts (rarement modifiés)
- **Network-First**: API calls (always fresh)
- **Stale-While-Revalidate**: HTML, CSS, JS

**Fonctionnalités:**

- ✅ Installation avec pré-cache assets
- ✅ Activation et nettoyage caches obsolètes
- ✅ Offline fallback page
- ✅ Background sync
- ✅ Push notifications
- ✅ Auto-reload connexion

### Offline.html

- Page fallback minimaliste
- Design dark mode
- Boutons "Réessayer" et "Retourner"
- Auto-reload quand connexion revient

### Manifest.json

- PWA identité (nom, icônes, thème Cameroun)
- Shortcuts pour accès rapide
- Share target configuration
- Maskable icons pour homescreens

---

## 🚀 Déploiement

### Railway Configuration

**Services:**

1. **Web (Next.js)**
   - Port: 3000
   - Build: `npm run build:web`
   - Start: `npm run start:web`

2. **Server (Express.js)**
   - Port: 8000
   - Build: `npm run build:server`
   - Start: `npm run start:server`

3. **Firebase Emulator** (dev only)
   - Localhost auth testing

### Variables d'environnement

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sales-companion-237
FIREBASE_ADMIN_KEY_PATH=...

# API
NEXT_PUBLIC_API_URL=https://api.railway.app
BACKEND_URL=http://localhost:8000

# Groq AI
GROQ_API_KEY=...

# Environment
NODE_ENV=production
```

---

## 📚 Documentation additionnelle

- `docs/architecture/firebase-setup.md` - Configuration Firebase
- `docs/architecture/manager-member-flow.md` - Flux manager/membre
- `docs/architecture/support-flow.md` - Flux support
- `docs/architecture/testing.md` - Stratégie tests
- `firestore/docs/data-model.md` - Modèle données détaillé

---

## 🎓 Conventions de code

### Nommage

- **Composants React**: PascalCase (`RegisterForm.tsx`)
- **Fonctions/variables**: camelCase (`handleSubmit`, `userId`)
- **Constants**: UPPER_SNAKE_CASE (`BUSINESS_SECTORS`, `API_TIMEOUT`)
- **Files**: kebab-case (`auth-middleware.ts`, `register-form.tsx`)

### Structure composants

```typescript
// Client component
'use client'

import { useState } from 'react'

export function MyComponent() {
  const [state, setState] = useState('')

  return <div>{state}</div>
}
```

### Async handlers (Backend)

```typescript
import { asyncHandler } from '@/utils/async-handler'

router.get(
  '/route',
  asyncHandler(async (req, res) => {
    // Pas besoin de try/catch
    const data = await db.collection('users').get()
    res.json(data)
  })
)
```

### Validation (Zod)

```typescript
import { z } from 'zod'
import { BUSINESS_SECTORS } from '@sales-companion/shared'

const schema = z.object({
  email: z.string().email(),
  sector: z.enum(BUSINESS_SECTORS)
})

const data = schema.parse(input)
```

---

## 🔄 Flux de développement

1. **Feature branch**: `feature/description`
2. **Development**: Localement avec `npm run dev:web` + `npm run dev:server`
3. **Testing**: Unit tests + E2E avec Playwright
4. **Code review**: Pull request vers main
5. **Build**: `npm run build:web` + `npm run build:server`
6. **Deployment**: Push vers Railway

---

## 🐛 Troubleshooting - Erreurs API et Dépannage

### Erreurs API courantes

#### 1. **401 Unauthorized - `/api/pipeline/manager`**

**Cause:** L'utilisateur n'est pas authentifié ou le token JWT est expiré.

**Solutions:**

- Vérifier que le token d'authentification est transmis dans le header `Authorization: Bearer <token>`
- Vérifier que le middleware d'authentification est correctement configuré
- Vérifier que le rôle de l'utilisateur est `manager` ou `admin`
- Rafraîchir la page pour obtenir un nouveau token

**Vérification dans le code Backend (`apps/server/src/middlewares/auth.middleware.ts`):**

```typescript
// Le middleware doit vérifier le token avant d'accéder aux routes protégées
const token = request.headers.get('authorization')?.split(' ')[1]
if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
```

#### 2. **500 Server Error - `/api/saved-searches`**

**Causes possibles:**

- Erreur dans la récupération des données Firestore
- Permissions Firestore insuffisantes
- Structure de données invalide en base de données

**Solutions:**

- Vérifier les règles de sécurité Firestore dans `firestore/rules/firestore.rules`
- Vérifier que les collections `saved_searches` existent dans Firestore
- Consulter les logs serveur dans la console Backend
- Vérifier que l'utilisateur authentifié a les permissions de lecture/écriture

**Règles Firestore à valider (`firestore/rules/firestore.rules`):**

```firestore
match /saved_searches/{document=**} {
  allow read, write: if request.auth.uid == resource.data.userId
}
```

#### 3. **Issues PWA & Service Worker**

Si le Service Worker ne fonctionne pas:

- Vérifier que `public/sw.js` existe et est valide
- Consulter la console JavaScript pour les erreurs d'enregistrement
- Effacer le cache du navigateur: DevTools → Application → Clear storage
- Relancer l'application après le nettoyage du cache

### Assistant IA - Navigation Mobile

L'onglet **Assistant IA** a été ajouté à la barre de navigation mobile inférieure:

**Localisation:** `apps/web/src/components/layout/MobileNav.tsx`
**Route:** `/ai`
**Page:** `apps/web/src/app/(protected)/ai/page.tsx`

**Fonctionnalités:**

- ✅ Chat interface pour conseils commerciaux
- ✅ Connexion à l'API Groq pour générer des réponses IA
- ✅ Authentification Firebase avec `getIdToken()`
- ✅ Historique des messages pendant la session
- ✅ Gestion des erreurs avec messages informatifs
- ✅ Design responsive mobile-first

**Authentification:**

```typescript
// Récupération correcte du token Firebase
const token = await user.getIdToken()
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({ message: input })
})
```

### Erreurs courantes et solutions

#### ❌ **401 Unauthorized - `/api/ai/chat`**

**CAUSE CORRIGÉE:** ✅ Token d'authentification Firebase manquant ou incorrectement transmis.

**Solution appliquée:**

- Utiliser `await user.getIdToken()` pour obtenir le token Firebase valide
- NE PAS utiliser `localStorage.getItem('authToken')` - Firebase gère les tokens autrement
- Vérifier que l'utilisateur est authentifié avant d'envoyer des requêtes

**Code correct:**

```typescript
const { user } = useCurrentUser()
// ...
const token = await user?.getIdToken()
const response = await fetch('/api/ai/chat', {
  headers: {
    Authorization: `Bearer ${token}`
    // ...
  }
})
```

---

**Dernière mise à jour :** 14 Mai 2026
**Version :** 2.0.1 (Security Hardened)
**Statut :** Production Ready ✅
