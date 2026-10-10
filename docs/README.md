# Documentation Sales Companion 2.0

Ce dossier centralise la documentation technique du projet. La lecture se fait dans l’ordre suivant :

1. [../README.md](../README.md) — vue globale du produit, architecture, stack et commandes.
2. [../AGENTS.md](../AGENTS.md) — règles métier et invariants d’intégrité architecturale.
3. [./architecture](./architecture) — notes détaillées par sujet technique.
4. [../firestore/rules/firestore.rules](../firestore/rules/firestore.rules) — sécurité applicative côté base de données.
5. Fichiers racine comme [../DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) et [../ERRORS_FOUND.md](../ERRORS_FOUND.md) — références de déploiement et de correctifs.

## Arborescence

- [architecture/README.md](./architecture/README.md) — index technique du dossier et règles de maintenance.
- [architecture/overview.md](./architecture/overview.md) — vue d’ensemble de l’architecture.
- [architecture/firebase-setup.md](./architecture/firebase-setup.md) — configuration Firebase.
- [architecture/firebase-claims-notes.md](./architecture/firebase-claims-notes.md) — notes sur les claims auth.
- [architecture/manager-member-flow.md](./architecture/manager-member-flow.md) — flux manager / membre / org.
- [architecture/support-flow.md](./architecture/support-flow.md) — flux support et opérationnel.
- [architecture/api-ownership.md](./architecture/api-ownership.md) — ownership des routes et responsabilités.
- [architecture/testing.md](./architecture/testing.md) — stratégie de tests.
- [architecture/tech-debt-corrections.md](./architecture/tech-debt-corrections.md) — dette technique et correctifs planifiés.

## Convention de maintenance

- La structure cible est simple : un index par dossier + un document thématique par sujet.
- Les documents actifs doivent rester concentrés sur un seul sujet et ne pas dupliquer les mêmes informations dans plusieurs fichiers racine.
- Les fichiers historiques du niveau racine ([../DESIGN.md](../DESIGN.md), [../DEVELOPMENT_SUMMARY.md](../DEVELOPMENT_SUMMARY.md), [../ERRORS_FOUND.md](../ERRORS_FOUND.md), [../DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)) sont maintenus comme références, mais ne doivent plus servir de source de vérité pour les spécifications courantes.

- Les documents de référence active sont README.md, AGENTS.md et le dossier architecture.
- Les fichiers de synthèse racine (DESIGN.md, DEVELOPMENT_SUMMARY.md, etc.) restent utiles comme historique, mais ne remplacent pas la documentation active.
- Lors d’un changement architectural ou de flux métier, mettre à jour la documentation correspondante dans docs/architecture et la relier depuis cette page.
