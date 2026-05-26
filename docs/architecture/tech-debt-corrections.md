# Corrections techniques — plan par étapes

Objectif : améliorer la cohérence sans changer le comportement métier visible.

## Phase 1 — Corrections sûres (fait)

| # | Problème | Action |
|---|----------|--------|
| 1 | Route Express `/pipeline/stats/summary` après `/:id` | Réordonnancement dans `pipeline.routes.ts` |
| 2 | Dépendance `next` inutile dans `apps/server` | Suppression du package |
| 3 | Double init Firebase client | `lib/firebase.ts` réexporte `services/firebase/client` ; singleton `getApps()` |
| 4 | Port proxy 8000 vs serveur 3001 | `getBackendUrl()` — défaut `http://localhost:3001` |
| 5 | Scripts `test` manquants | Ajout dans `apps/web` et `apps/server` |
| 6 | IA Express stub vs Groq Next | Headers `Deprecation` sur `/ai/*` Express |

## Phase 2 — fait (Railway prod + docs + tests + auth layout)

| # | Problème | Action |
|---|----------|--------|
| 7 | Docs API obsolètes | `API_DOCUMENTATION.md` réécrit ; `swagger.json` serveurs + `/admin/login` + statuts pipeline |
| 8 | `BACKEND_URL` en prod | `.env.example` web → `https://sales-companion-20-production.up.railway.app` ; `getBackendUrl()` documenté |
| 9 | Auth uniquement client | `(protected)/layout.tsx` avec `AuthGuard` (couvre `/ai` sans AppShell) |
| 10 | Rôles admin vs manager | `docs/architecture/firebase-claims-notes.md` enrichi |
| 12 | Tests web | Fichiers hooks `.ts` → `.tsx` ; Vitest alias `@/` ; `jsdom` + `@vitejs/plugin-react` |

## Phase 3 — fait

| # | Problème | Action |
|---|----------|--------|
| 11 | Double backend | `docs/architecture/api-ownership.md` ; support → Next/Firestore ; équipe → `proxy-backend.ts` |
| 11b | Support proxy cassé | `/api/support/threads/*` + `[id]/messages` sur Next (Firestore) |
| 12 | Tests web | **26/26** passent |
| 12b | Tests intégration | `createServer.integration.test.ts` (supertest) |
| 13 | `railway.json` | `apps/server/railway.json`, `apps/web/railway.json` |

## Phase 4 — optionnel

| # | Sujet |
|---|--------|
| 14 | Retirer pipeline Express si 100 % Next |
| 15 | Tests e2e Playwright |
| 16 | Sync custom claims manager |

## Développement local

```bash
# Terminal 1
npm run dev:server   # écoute http://localhost:3001 par défaut

# Terminal 2
npm run dev:web      # proxifie vers BACKEND_URL ou 3001

# Production Railway (Express, PORT=8080 interne) :
# BACKEND_URL=https://sales-companion-20-production.up.railway.app
```

Variables **obligatoires** sur le service **web** (Vercel / Railway Next) :

```env
BACKEND_URL=https://sales-companion-20-production.up.railway.app
```
