# Firebase Setup

## Services requis
- Firebase Authentication
- Cloud Firestore

## Authentication
Activer au minimum :
- Email / Password

## Firestore
Déployer :
- `firestore/rules/firestore.rules`
- `firestore/indexes/firestore.indexes.json`

## Custom claims admin
Le rôle admin côté sécurité repose sur Firebase custom claims.

Exemple :
- `role: "admin"`

Le document `users/{uid}` peut refléter ce rôle pour l'UI, mais la sécurité serveur repose sur le token Firebase vérifié.

## Collections principales
- users
- companies
- pipeline
- saved_searches
- support_threads
- team_accesses
- assignments
- app_config
- usage_logs
- import_logs