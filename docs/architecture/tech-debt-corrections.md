# Corrections techniques — plan par étapes

Objectif : améliorer la cohérence sans changer le comportement métier visible.

## Phase 1 — Corrections sûres (fait)

| #   | Problème                                             | Action                                                                         |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Route Express `/pipeline/stats/summary` après `/:id` | Réordonnancement dans `pipeline.routes.ts`                                     |
| 2   | Dépendance `next` inutile dans `apps/server`         | Suppression du package                                                         |
| 3   | Double init Firebase client                          | `lib/firebase.ts` réexporte `services/firebase/client` ; singleton `getApps()` |
| 4   | Port proxy 8000 vs serveur 3001                      | `getBackendUrl()` — défaut `http://localhost:3001`                             |
| 5   | Scripts `test` manquants                             | Ajout dans `apps/web` et `apps/server`                                         |
| 6   | IA Express stub vs Groq Next                         | Headers `Deprecation` sur `/ai/*` Express                                      |

## Phase 2 — fait (docs + tests + auth layout)

| #   | Problème               | Action                                                                                       |
| --- | ---------------------- | -------------------------------------------------------------------------------------------- |
| 7   | Docs API obsolètes     | `API_DOCUMENTATION.md` réécrit ; `swagger.json` serveurs + `/admin/login` + statuts pipeline |
| 8   | `BACKEND_URL` en prod  | `.env.example` web → URL backend production ; `getBackendUrl()` documenté                    |
| 9   | Auth uniquement client | `(protected)/layout.tsx` avec `AuthGuard` (couvre `/ai` sans AppShell)                       |
| 10  | Rôles admin vs manager | `docs/architecture/firebase-claims-notes.md` enrichi                                         |
| 12  | Tests web              | Fichiers hooks `.ts` → `.tsx` ; Vitest alias `@/` ; `jsdom` + `@vitejs/plugin-react`         |

## Phase 3 — fait

| #   | Problème                       | Action                                                                                        |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| 11  | Double backend                 | `docs/architecture/api-ownership.md` ; support → Next/Firestore ; équipe → `proxy-backend.ts` |
| 11b | Support proxy cassé            | `/api/support/threads/*` + `[id]/messages` sur Next (Firestore)                               |
| 12  | Tests web                      | **26/26** passent                                                                             |
| 12b | Tests intégration              | `createServer.integration.test.ts` (supertest)                                                |
| 13  | Fichiers de config déploiement | Supprimés (obsolètes)                                                                         |

## Phase 4 — Consolidation & Retrait définitif d'Express (fait)

| #   | Sujet                                  | Statut / Action                                                                                       |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 14  | Retirer pipeline Express si 100 % Next | **Terminé** : Le backend Express (`apps/server`) et ses proxies (`proxy-backend.ts`, `backend-url.ts`) ont été supprimés. L'ensemble des API tourne désormais nativement sur les API Routes Next.js (runtime Serverless). |
| 15  | Tests e2e Playwright                   | **Actif** : Configuration Playwright intégrée (`npm run test:e2e`).                                  |
| 16  | Sync custom claims manager             | **Terminé** : Les claims auth sont synchronisés côté serveur par l'Admin SDK (`role`, `orgRole`, `orgCode`). |

### Environnement d'exécution unifié

Le projet fonctionne désormais avec une commande unique de développement :

```bash
npm run dev:web
```

Toutes les routes d'API (`/api/*`), l'authentification Admin SDK et le rendu client/SSR sont orchestrés par l'application Next.js. La variable `BACKEND_URL` n'est plus nécessaire.
