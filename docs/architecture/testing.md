# Testing

## Objectif

Assurer la robustesse, la conformité architecturale et la non-régression de l'application Sales Companion 2.0 :

- **Règles métier & métriques CRM canoniques** (`pipeline-metrics`, calculs de KPI, quotas, normalisation de statuts).
- **Intégrité de la gouvernance et des flux de données** (multi-tenant, non-hardcoding, contrôle des rôles).
- **Composants d'interface utilisateur et hooks** (navigation, défilement, réactivité).
- **Cycle mensuel et archivage automatique J+3**.
- **Sécurité et règles Firestore**.

## Commandes d'exécution des tests

### 1. Tests unitaires et d'intégration (Vitest)

Depuis la racine du projet :

```bash
# Exécution de l'ensemble de la suite de tests unitaires
npm run test:web

# Mode watch / interactif
npm run test:web -- --watch
```

### 2. Contrôle d'intégrité architecturale (Garde-fous AGENTS.md)

Valide les 12 étapes de contrôle strict (dépendances serveur, absence de hardcoding, règles de calcul, opacité UI, vectorisation des icônes) :

```bash
npm run check:integrity
```

### 3. Contrôle des types TypeScript

```bash
npm run typecheck:web
```

### 4. Tests End-to-End (Playwright)

```bash
npm run test:e2e
```
