# Répartition des API — Next.js vs Express

Objectif : une **source de vérité par domaine**, sans duplication métier.

## Next.js Route Handlers (`apps/web/src/app/api/`)

| Domaine | Routes | Stockage |
|---------|--------|----------|
| Recherche | `/api/search/companies` | Firestore |
| Pipeline | `/api/pipeline/*` | Firestore |
| Sauvegardes | `/api/saved-searches`, `/api/saved-companies` | Firestore |
| Auth | `/api/auth/*` | Firebase Auth + Firestore |
| Paiement | `/api/payment/*` | Firestore + Campay |
| IA | `/api/ai/chat` | Groq + `app_config` |
| Admin web | `/api/admin/*` | Firestore |
| Imports manager | `/api/imports` | Firestore |
| **Support utilisateur** | `/api/support/threads/*` | Firestore (phase 3) |

## Express (`apps/server`)

| Domaine | Routes | Notes |
|---------|--------|-------|
| Santé | `GET /health` | Railway healthcheck |
| Équipe | `/team/*` | Accès, membres, activation |
| Assignations | `/assignments` | Manager → membre |
| Pipeline (legacy) | `/pipeline/*` | Doublon partiel avec Next — clients web utilisent Next |
| Admin imports lourds | `/admin/import*` | CSV/Excel |
| Admin support | `/admin/support` | Réponses admin |
| Admin users/companies | `/admin/*` | Partiellement doublonné par Next admin |

## Proxys Next → Express

Fichier : `apps/web/src/lib/proxy-backend.ts`

| Route Next | Backend Express |
|------------|-----------------|
| `POST /api/team/accesses` | `POST /api/team/accesses` |
| `GET /api/team/members` | `GET /api/team/members` |

Variable : `BACKEND_URL` (prod : `https://sales-companion-20-production.up.railway.app`)

## UI temps réel (sans API)

| Page | Accès données |
|------|----------------|
| `/support` | Firestore client direct (`onSnapshot`) |
| Équipe (partiel) | Firestore + API |

Les hooks `useSupportThreads` / `useReplySupportThread` utilisent les routes Next ci-dessus si activés hors page support.

## Évolution

1. **Fait phase 3** : Support API sur Next (plus de proxy cassé vers Express).
2. **À terme** : Migrer pipeline Express → Next uniquement, ou inverse pour équipe uniquement sur Express.
3. **Éviter** : même CRUD sur les deux stacks sans contrat partagé (`@sales-companion/shared`).
