# Architecture Globale — Sales Companion 2.0

Ce document définit la structure fonctionnelle et technique du projet, les invariants du modèle de données et les règles de gouvernance applicative.

---

## 1. Principes Fondamentaux

1. **Intégrité Architecturale Globale** : Toute évolution, correction de bug ou renforcement de sécurité s'applique de manière générique à l'ensemble du système, et ne doit jamais cibler des comptes ou profils spécifiques.
2. **Hiérarchie Organisationnelle Stricte** : L'application structure les entreprises B2B selon une chaîne de commande claire (Organisation → Senior Manager → Team Managers → Commerciaux de terrain & Support).
3. **Sécurité par Défaut (Zero Trust Client)** : Le client web (SDK client Firebase) ne dispose d'aucun droit d'écriture sur les rôles, les quotas, les statuts d'activation ou les rattachements hiérarchiques. Toutes ces opérations transitent par des routes API Next.js validées par l'Admin SDK.

---

## 2. Rôles et Périmètres de Responsabilité

| Rôle (`role`)       | Sous-Rôle (`orgRole`) | Description & Périmètre                                                                                                                                              | Accès Principal                                             |
| :------------------ | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **`independent`**   | `null`                | Commercial autonome gérant son propre portefeuille de prospects.                                                                                                     | Recherche, Pipeline personnel, Export                       |
| **`manager`**       | `'senior_manager'`    | Dirigeant / Directeur commercial créateur de l'organisation. Supervise l'ensemble des Team Managers, consulte les KPI consolidés, délègue les prospects aux équipes. | Gestion Organisation, Pipeline Org consolidé, Dashboard Org |
| **`manager`**       | `'team_manager'`      | Manager opérationnel d'une unité / région rattaché à l'organisation via `orgCode`. Recrute et manage ses commerciaux de terrain directs.                             | Équipe directe, Pipeline équipe, Affectations               |
| **`member`**        | `null`                | Commercial de terrain travaillant sur les prospects délégués par son Team Manager.                                                                                   | Mes Clients, Mon Pipeline, Activité                         |
| **`support_agent`** | `null`                | Agent CRM / Support transversal traitant les tickets et le suivi des clients après conclusion de la vente.                                                           | Support, CRM Clients partagés                               |
| **`admin`**         | `null`                | Administrateur technique de la plateforme SaaS (supervision globale, gestion des abonnements, métriques globales).                                                   | Back-office Admin (`/admin`)                                |

---

## 3. Modèle de Données Firestore

### Collection `organisations/{orgCode}`

- `orgCode` (string) : Identifiant unique de l'entreprise (ex: `SC-CM-GE9GQ`).
- `seniorManagerUid` (string) : UID du Senior Manager créateur et superviseur.
- `companyName` (string) : Raison sociale.
- `country` (string) : Code pays ISO à 2 lettres (ex: `'CM'`).
- `niu` (string | null) : Numéro d'Identifiant Unique DGI validé.
- `isVerified` (boolean) : Indicateur de certification fiscale.
- `createdAt`, `updatedAt` (Timestamp).

### Collection `users/{uid}`

- `uid`, `email`, `name`, `displayName` (strings).
- `role` (enum) : `'independent'` | `'manager'` | `'member'` | `'support_agent'` | `'admin'`.
- `orgRole` (enum | null) : `'senior_manager'` | `'team_manager'` (pour les managers).
- `orgCode` (string | null) : Référence vers l'organisation.
- `managerUid` (string | null) : UID du manager hiérarchique direct (pour les `member`).
- `linkedManagerUids` (array | null) : Liste des managers liés (pour les `support_agent`).
- `plan` (enum) : `'free'` | `'pro'` | `'enterprise'`.
- `active`, `activated` (booleans).
- `emailVerified`, `emailVerificationPending` (booleans).
- `subscriptionExpiresAt` (string ISO).

### Collection `pipeline/{itemId}`

- `companyName`, `companySector`, `companyCity`, `companyPhone` (strings).
- `status` (enum normalisé) : `'prospection'` | `'negociation'` | `'conclue'`.
- `amount` (number) : Montant estimé de l'opportunité.
- `userId` (string) : Créateur de la fiche.
- `managerUid` (string) : UID du Team Manager responsable.
- `assignedTo` (string | null) : UID du commercial terrain exécutant.
- `sourceProspectId` (string | null) : Prospect source avant conversion.

---

## 4. Flux Métier Clés

### A. Création et Jonction d'Organisation

1. **Création (Senior Manager)** : À l'inscription ou lors du premier accès, le manager n'ayant pas renseigné de code de jonction se voit attribuer un `orgCode` unique généré côté serveur. Il devient `senior_manager` et le document `organisations/{orgCode}` est créé.
2. **Jonction (Team Manager)** : Un manager disposant du code d'invitation de son Senior Manager le renseigne lors de son inscription ou via l'onglet gouvernance (`PATCH /api/team/org`). L'API vérifie l'existence de l'organisation et lui attribue `orgRole: 'team_manager'`.

### B. Délégation & Transfert de Portefeuille

1. Le Senior Manager peut détenir des prospects importés ou issus de son compte initial.
2. Via `/api/team/migrate-senior-members`, il sélectionne un sous-ensemble de prospects et choisit un Team Manager récepteur.
3. L'API met à jour atomiquement `managerUid = targetTeamManagerUid`. Les prospects intègrent alors le portefeuille du Team Manager, qui peut ensuite les assigner individuellement à ses commerciaux terrain.

### C. Pipeline Consolidé

1. La route `/api/pipeline/org` est réservée aux utilisateurs dont `orgRole === 'senior_manager'`.
2. Elle interroge tous les managers de l'organisation (`where orgCode == callerOrgCode`) puis agrège leurs fiches de pipeline par paquets de 30 (`where managerUid in chunk`).
3. Elle fournit les KPI globaux de l'organisation (Prospection, Négociation, Conclus) et les statistiques découpées par Team Manager.
