# Directives d'Intégrité Architecturale — Sales Companion 2.0

> **RÈGLE FONDAMENTALE DU PROJET :**  
> L'intégrité de l'architecture de l'application est **TOUJOURS la priorité absolue**.  
> Il est formellement interdit de casser ou d'altérer la logique structurelle globale lors d'une mise à jour, d'un refactoring ou de la correction d'un bug.  
> Toute mesure prise doit concerner la **fonctionnalité globale** de l'application. Les comptes, e-mails et profils utilisés lors des tests ne sont que des **outils de test** (personas) et ne doivent JAMAIS faire l'objet de règles ad-hoc ou de contournements spécifiques dans le code source ou la base de données.

---

## 1. Modèle Hiérarchique & Invariants Métier

Le système repose sur une hiérarchie stricte à 4 niveaux :

```
[Organisation / Entreprise] (orgCode unique, NIU fiscal optionnel)
       │
       ▼
[Senior Manager] (Exactement 1 par organisation)
       │ - Supervise l'organisation globale et tous les Team Managers
       │ - Initialise l'organisation (détient le code maître orgCode)
       │ - Ne gère pas de portefeuille opérationnel de routine
       │ - Délègue / transfère ses prospects initiaux aux Team Managers
       │ - Accède au pipeline consolidé et au dashboard organisation
       │
       ▼
[Team Managers] (0 à N par organisation)
       │ - Managers d'équipe rattachés à l'orgCode existant
       │ - Pilotent directement leur équipe de commerciaux et leur pipeline
       │ - Créent les accès membres et assignent les prospects
       │
       ▼
[Commerciaux de terrain / Membres] (rôle 'member')
         - Traitent les prospects assignés dans leur portefeuille
         - Remontent le statut dans le pipeline opérationnel

[Agents Support Transversaux] (rôle 'support_agent')
         - Liés à un ou plusieurs managers au sein de l'organisation
         - Gèrent le support et les clients convertis (statut conclu)
```

---

## 2. Invariants de Données & Modèle Firestore

### A. Document Utilisateur (`users/{uid}`)
- **`role`** : `'independent'` | `'manager'` | `'member'` | `'support_agent'` | `'admin'`.
- **`orgRole`** (managers uniquement) :
  - `'senior_manager'` : premier manager de l'organisation (`orgCode` maître).
  - `'team_manager'` : manager ayant rejoint une organisation existante via `joinOrgCode`.
- **`orgCode`** : code unique de l'organisation (format `SC-[PAYS]-[5CARACTÈRES]`, ex: `SC-CM-GE9GQ`).
- **Synchronisation Auth Claims** :
  - Le claim Firebase Auth `auth.token.role` doit **TOUJOURS correspondre strictement** au champ Firestore `users/{uid}.role`.
  - Ne JAMAIS attribuer un claim `admin` à un manager de test ou modifier un claim sans mettre à jour le document Firestore correspondant via les flux serveurs légitimes.

### B. Document Organisation (`organisations/{orgCode}`)
- Clé primaire du document = `orgCode`.
- Contient : `seniorManagerUid`, `companyName`, `sector`, `country`, `niu`, `isVerified`.
- Le `seniorManagerUid` est le propriétaire et administrateur de l'organisation.

### C. Fiches Pipeline (`pipeline/{itemId}`)
- **`managerUid`** : UID du Team Manager (ou Senior Manager avant délégation) responsable du dossier.
- **`userId`** : UID du créateur de la fiche.
- **`assignedTo`** : UID du commercial terrain chargé du prospect.
- **`status`** : normalisé (`'prospection'`, `'negociation'`, `'conclue'`).

---

## 3. Règles d'Or pour le Développement & les Corrections

1. **Aucun correctif ad-hoc ciblant un ID / e-mail spécifique** :
   - Tout comportement doit être testé et validé par rapport au rôle et aux attributs (`role`, `orgRole`, `orgCode`), jamais sur un UID (`uid == "s1Jp..."`) ou une adresse e-mail en dur dans le code.

2. **Préservation des flux d'onboarding** :
   - Toute modification de `firestore.rules` doit être testée pour vérifier qu'elle ne bloque pas :
     - L'inscription d'un indépendant.
     - L'onboarding d'un premier manager (création d'organisation).
     - La jonction d'un Team Manager avec un code organisation.
     - L'activation d'un compte membre ou support agent via `/api/team/activate`.

3. **Protection des champs gérés par le serveur** :
   - Les champs sensibles (`role`, `orgRole`, `orgCode`, `plan`, `dailyLimit`, `active`, `activated`) sont exclusivement attribués ou modifiés côté serveur par l'Admin SDK (via les routes `/api/team/org`, `/api/team/activate`, `/api/payment/webhook`).
   - Le client Firestore SDK ne doit jamais pouvoir écrire directement ces champs.

4. **Agrégation consolidée du Senior Manager** :
   - Le Senior Manager consulte la vue consolidée via `/api/pipeline/org` et `/api/reporting/org`.
   - Ces routes interrogent Firestore avec `where('orgCode', '==', orgCode)` et `where('managerUid', 'in', chunk)`.
   - Tout refactoring de pipeline doit préserver cette capacité d'agrégation multi-managers.

5. **Isolation Multi-Tenant** :
   - Un utilisateur ne doit jamais avoir accès, en lecture ou écriture, à des fiches ou des données appartenant à un autre `orgCode` ou un autre `managerUid` non rattaché.
