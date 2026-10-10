# Documentation technique — architecture

Ce dossier est la source de vérité technique du projet. Il remplace la dispersion des informations sur plusieurs fichiers de synthèse à la racine du dépôt.

## Règle d’or

- Un sujet = un fichier.
- Un dossier = un index.
- Les fichiers racine de type DESIGN, DEVELOPMENT_SUMMARY, ERRORS_FOUND et DEPLOYMENT_CHECKLIST restent utiles comme historique, mais ne doivent pas contenir de spécifications actives ni de doublons de domaine technique.

## Index des sujets actifs

- [overview.md](./overview.md) — vue d’ensemble du système, rôles et principes architecturaux.
- [manager-member-flow.md](./manager-member-flow.md) — organisation, managers, délégation de portefeuille et activation de membres.
- [support-flow.md](./support-flow.md) — support client et parcours de résolution.
- [firebase-setup.md](./firebase-setup.md) — configuration Firebase / services / variables d’environnement.
- [firebase-claims-notes.md](./firebase-claims-notes.md) — claims auth / synchronisation des rôles Firestore.
- [api-ownership.md](./api-ownership.md) — responsabilités des routes API et périmètres d’accès.
- [testing.md](./testing.md) — stratégie de validation et points de test critiques.
- [tech-debt-corrections.md](./tech-debt-corrections.md) — dette technique et correctifs prioritaires.

## Quand mettre à jour ce dossier

Mettre à jour la documentation de ce dossier lors de toute modification sur :

- les rôles et permissions,
- les flux d’organisation / équipe,
- les règles Firebase et Firestore,
- les routes API et leur ownership,
- la stratégie de tests,
- les correctifs de sécurité ou de compatibilité runtime.

## Fichiers historiques non prioritaires

Les fichiers suivants ne doivent pas remplacer la documentation technique active :

- [../../DESIGN.md](../../DESIGN.md)
- [../../DEVELOPMENT_SUMMARY.md](../../DEVELOPMENT_SUMMARY.md)
- [../../ERRORS_FOUND.md](../../ERRORS_FOUND.md)
- [../../DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)

Ils servent à documenter le contexte, les correctifs passés et les étapes de déploiement, mais ne doivent pas contenir de définitions de référence en cours.
