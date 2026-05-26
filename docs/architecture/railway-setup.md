# Railway Setup

## Service

Déployer `apps/server` sur Railway.

## Variables d'environnement

- PORT
- WEB_ORIGIN
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- OPENAI_API_KEY
- OPENAI_MODEL

## Important

- Ne jamais commiter de service account JSON dans le repo
- Utiliser les variables Railway
- Vérifier que la clé privée Firebase conserve les retours à la ligne via remplacement `\\n -> \n`

## Healthcheck

Endpoint :

- `/health`
