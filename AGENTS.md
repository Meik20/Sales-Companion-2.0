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
[Senior Managers] (1 à N par organisation)
       │ - Chaque Senior Manager est responsable d'un segment distinct et indépendant
       │ - Tous les Senior Managers ont le même niveau de compétences opérationnelles que le SM1
       │ - Le SM1 est l'initiateur technique de l'organisation (détient le code maître orgCode et les accès d'invitation)
       │ - Le SM1 n'est pas "le propriétaire" de l'organisation (qui appartient à la personne morale cliente)
       │ - Ne gèrent pas de portefeuille opérationnel de routine dans leur segment
       │ - Délèguent / transfèrent leurs prospects aux Team Managers de leur segment
       │ - Accèdent au pipeline consolidé et au dashboard de leur segment d'organisation
       │
       ▼
[Team Managers] (0 à N par organisation et par segment)
       │ - Managers d'équipe rattachés à l'orgCode et à un segment spécifique
       │ - Pilotent directement leur équipe de commerciaux et leur pipeline
       │ - Créent les accès membres et assignent les prospects de leur segment
       │
       ▼
[Commerciaux de terrain / Membres] (rôle 'member')
         - Traitent les prospects assignés dans leur portefeuille
         - Remontent le statut dans le pipeline opérationnel

[Agents Support Transversaux] (rôle 'support_agent')
         - Liés à un ou plusieurs managers au sein de l'organisation
         - Rôle strictement limité : gèrent l'assistance, le SAV et les clients convertis (statut conclu)
         - Ne sont PAS des Team Managers : ne pilotent pas de commerciaux et ne reçoivent pas de prospects délégués
         - Ne figurent JAMAIS dans les formulaires, sélecteurs ou colonnes de Team Managers
```

---

## 2. Invariants de Données & Modèle Firestore

### A. Document Utilisateur (`users/{uid}`)

- **`role`** : `'independent'` | `'manager'` | `'member'` | `'support_agent'` | `'admin'`.
- **`orgRole`** (managers uniquement) :
  - `'senior_manager'` : Senior Manager (initiateur SM1 ou nommé sur un segment distinct).
  - `'team_manager'` : manager ayant rejoint une organisation existante via `joinOrgCode`.
- **`segment`** : segment d'activité rattaché (ex. 'Pôle Nord', 'Grands Comptes', 'Banque').
- **`orgCode`** : code unique de l'organisation (format `SC-[PAYS]-[5CARACTÈRES]`, ex: `SC-CM-GE9GQ`).
- **Synchronisation Auth Claims** :
  - Le claim Firebase Auth `auth.token.role` doit **TOUJOURS correspondre strictement** au champ Firestore `users/{uid}.role`.
  - Ne JAMAIS attribuer un claim `admin` à un manager de test ou modifier un claim sans mettre à jour le document Firestore correspondant via les flux serveurs légitimes.

### B. Document Organisation (`organisations/{orgCode}`)

- Clé primaire du document = `orgCode`.
- Contient : `seniorManagerUid` (UID du SM1 initiateur technique), `companyName`, `sector`, `country`, `niu`, `isVerified`.
- Le `seniorManagerUid` est l'administrateur technique initial de l'organisation (créateur des invitations), sans être le propriétaire de la personne morale.

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

---

## 4. Intégrité des Dépendances & Runtime Serverless (Vercel)

> [!CAUTION]
> **VERROU CRITIQUE SUR LES DÉPENDANCES SERVEUR :**
>
> - **`firebase-admin` DOIT RESTER PINNÉ SUR LA BRANCHE v13.x (ex: `^13.10.0`)**.
> - **NE JAMAIS migrer vers `firebase-admin@14.x`** sans refonte préalable du packaging ESM : la v14 embarque `jwks-rsa@4.x` qui dépend de `jose@6.x` (purement ESM). Dans le runtime Serverless Node.js de Vercel (CommonJS), cela provoque l'erreur fatale `ERR_REQUIRE_ESM`, cassant **immédiatement l'ensemble des routes API du backend**.
> - **Les Proxies dynamiques dans `apps/web/src/lib/firebase-admin.ts` sont OBLIGATOIRES** : ils garantissent l'isolation et le chargement à la demande (`getFirestore` et `getAuth`). Ne jamais réintroduire d'imports statiques de modules serveur Firebase au sommet des fichiers transversaux.
> - **Interdiction des `npm update` aveugles** : Toute mise à jour de paquet racine ou workspace doit faire l'objet d'un audit de compatibilité CJS/ESM et d'une validation locale complète (`npm run build:web`).

---

## 5. Procédure de Contrôle Pré-Déploiement

Avant TOUT push vers `main` :

1. **Contrôle TypeScript & Build** : Exécuter `npm run build:web` pour vérifier l'absence d'erreurs de compilation et de bundling.
2. **Vérification d'intégrité des flux métier** : S'assurer que les flux transversaux (auth, organisation, pipeline, support) ne sont pas altérés.
3. **Respect strict de l'architecture** : Vérifier qu'aucune règle ad-hoc ou bricolage spécifique à un compte de test n'a été inséré.

---

## 6. Politique Obligatoire — Icônes Vectorielles

> [!IMPORTANT]
> **RÈGLE ABSOLUE : Toutes les icônes UI de l'application DOIVENT être vectorielles.**
> L'utilisation d'emojis Unicode ou de symboles typographiques bruts en tant qu'icônes visuelles est **strictement interdite** dans les composants React/TSX.

### Sources autorisées

| Source | Usage |
|---|---|
| **Lucide React** (`lucide-react`) | Icônes UI génériques — navigation, actions, statuts |
| **`ScIcon`** (composant interne) | Logo et icône de marque Sales Companion |
| **`CountryFlag`** (composant interne) | Drapeaux pays en SVG inline |
| **SVG inline** | Icônes custom absentes de Lucide |

### Patterns interdits dans les composants JSX/TSX

```tsx
// ❌ INTERDIT
<span>🔥</span>          // emoji rendu comme icône
<div>🥇</div>            // médaille emoji
<button>⬇ Download</button>  // flèche Unicode
<span>✓</span>           // checkmark symbole
<span>⚠️</span>          // warning emoji
```

```tsx
// ✅ CORRECT
import { Download, Check, AlertTriangle, Medal, Flame } from 'lucide-react'

<button><Download size={14} className="mr-1.5" /> Download</button>
<span><Check size={14} className="text-emerald-500" /></span>
<span><AlertTriangle size={14} className="text-amber-500" /></span>
<Medal size={18} style={{ color: '#fbbf24' }} />   // rang 1 (or)
<Flame size={14} className="text-orange-500" />    // thème Firebase
```

### Cas acceptés hors JSX

Les emojis restent autorisés dans : commentaires de code (`// ✅`), `console.log` serveur, sujets d'emails transactionnels, et contenu éditorial des pages publiques (blog, annuaire).

### Indicateurs de couleur de statut

Ne **jamais** utiliser un emoji cercle coloré (`🟢🔴🟡`) pour indiquer un statut. Utiliser un `<span>` CSS avec `backgroundColor: config.color` (le champ `color` hex est disponible dans `CRM_STATUS_CONFIG` et `getPipelineAging`).

---

## 7. Règles Canoniques de Calcul des Métriques & Balisage Automatique

> [!IMPORTANT]
> **SOURCE DE VÉRITÉ UNIQUE : `apps/web/src/lib/pipeline-metrics.ts`**  
> Tous les calculs de KPIs, de taux d'atteinte et d'agrégation d'objectifs de segment DOIVENT consommer ce module canonique et ne jamais être redéfinis de manière ad-hoc dans les pages ou composants.

### A. Règle du Portefeuille Actif
- **Définition :** Le « Portefeuille Actif » regroupe strictement les opportunités en cours de traitement : **prospection** et **négociation**.
- **Exclusion des conclues :** Une opportunité au statut **conclue** (ou équivalent : won, closed, signé) est clôturée avec succès ; elle est comptabilisée dans les réalisations/chiffre d'affaires, mais ne fait JAMAIS partie du nombre d'affaires actives (`activeCount = prospectionCount + negociationCount`).
- **Valeur du Pipeline Actif :** Somme des montants (`amount`) des opportunités en prospection et négociation uniquement.

### B. Règle de Consolidation des Objectifs du Segment / Organisation
- **Règle hiérarchique inviolable :** Seuls les **Team Managers opérationnels** (`!isSenior` et `orgRole !== 'senior_manager'`) portent des objectifs consolidés du segment.
- **Exclusion du Senior Manager :** Le Senior Manager supervise l'organisation globale et ne détient pas de portefeuille opérationnel de routine. Ses cibles résiduelles ou historiques sont **systématiquement exclues** de `orgTargetVolume` et `orgTargetValue`.
- **Taux d'Atteinte (Volume et Valeur) :** `calculateAttainmentRate(réalisé, cible)` retourne `(réalisé / cible) * 100` ou `null` si la cible n'est pas définie (> 0).
- **Taux R/O (Réalisé / Objectif) :** Moyenne composite des taux volume et valeur (`calculateRoRate`).

### C. Balisage & Contrôle Automatique Continu
- **Tests unitaires automatisés :** `apps/web/src/lib/__tests__/pipeline-metrics.test.ts` valide systématiquement toutes les règles mathématiques et l'exclusion du Senior Manager.
- **Garde-fou pré-build :** `scripts/check-architecture-integrity.js` (Étape 8) bloque tout build ou push si :
  1. Le module `apps/web/src/lib/pipeline-metrics.ts` est altéré ou incomplet.
  2. La route `/api/reporting/org/route.ts` tente de requêter les cibles sur `managerUids` au lieu de `teamManagerUids`.
  3. Le composant `TeamManagerPerformanceCard.tsx` n'utilise pas `stats.activeCount` pour la métrique du Portefeuille Actif.

---

## 8. Règle UI — Opacité 100% des Popovers, Menus Déroulants et Modales

> [!CAUTION]
> **INTERDICTION FORMELLE DE FENÊTRES FLOTTANTES TRANSLUCIDES :**  
> Les menus déroulants (dropdowns de profil, sélecteurs, popovers, drawers, dialogues) ne doivent JAMAIS comporter d'opacité partielle (`bg-popover/95`, `bg-card/90`, etc.) combinée avec `backdrop-blur` qui laisse transparaître le texte de la page sous-jacente.  
> Ils DOIVENT OBLIGATOIREMENT être 100% opaques (`backgroundColor: var(--card)` ou `var(--popover)` solide) pour empêcher toute superposition de caractères désagréable.

---

## 9. Règle Terminologique — Désignation Explicite des « Team Managers » sur la Vue Senior Manager

> [!IMPORTANT]
> Sur toute la vue du Senior Manager (Dashboard de Segment, Cartes KPIs, Tooltips, Tableaux de bord), les managers opérationnels managés doivent être **clairement et explicitement désignés sous l'appellation "Team Manager(s)"** (jamais simplement "Managers"), afin d'éliminer toute ambiguïté avec le Senior Manager lui-même.

---

## 10. Règle Obligatoire — Internationalisation et Traduction Automatique Intégrale (i18n)

> [!IMPORTANT]
> **RÈGLE STRUCTURELLE D'INTERNATIONALISATION :**  
> Tous les textes de l'interface, libellés de mois, qualificatifs de métriques, suffixes d'objectifs, infobulles et statuts DOIVENT s'adapter **automatiquement et intégralement** à la langue active (`lang: 'fr' | 'en'`).
> 
> 1. **Périodes mensuelles et cycles temporels (`monthly-cycle`) :**
>    - Ne JAMAIS afficher directement en dur `period.labelFr` ou `"Mois actif :"` sans aiguillage de langue.
>    - Utiliser systématiquement l'utilitaire canonique `getMonthPeriodLabel(period, lang)` ou l'aiguillage `lang === 'en' ? period.labelEn : period.labelFr`.
> 2. **Libellés de métriques, badges et unités :**
>    - Les unités et qualificatifs d'objectifs (`opportunités conclues` vs `closed opportunities`, `Non défini` vs `Not defined`, `obj` vs `tgt`, `Clôture automatique...` vs `Automatic closing...`) doivent obligatoirement être traduits via `t(...)` ou l'alternative explicite `lang === 'en' ? ... : ...`.
> 3. **Statuts CRM et filtres :**
>    - Les listes et options déroulantes (`CRM_STATUS_LIST`) doivent afficher `lang === 'en' ? item.labelEn : item.labelFr`.
> 4. **Garde-fous automatisés pré-build :**
>    - `scripts/check-architecture-integrity.js` valide systématiquement que les vues de dashboard et de reporting consomment `getMonthPeriodLabel` ou l'aiguillage bilingue sans texte en dur non internationalisé.

---

## 11. Règle Obligatoire — Respect de la Charte Officielle de Marque (Logo & Icône)

> [!IMPORTANT]
> **RÈGLE STRUCTURELLE D'IDENTITÉ VISUELLE :**  
> L'icône de marque et le logo Sales Companion DOIVENT OBLIGATOIREMENT respecter la charte officielle vectorielle :
> 1. **Logo et Icône :** Toujours utiliser le composant canonique `<ScIcon />` (`@/components/ui/ScIcon`), qui restitue l'icône vectorielle officielle (fond vert Cameroun `#1B7A3E`, monogramme blanc `SC` en courbes Bézier précises).
> 2. **Interdiction de substituts ad-hoc :** Il est strictement interdit d'utiliser des carrés ou cercles colorés temporaires avec du texte brut (`<div>SC</div>`) dans les en-têtes (desktop comme mobile).
> 3. **Typographie officielle :** Le nom de marque associé au logo s'écrit `SALES COMPANION 2.0` avec la police de titrage officielle (`font-heading`) et le suffixe `2.0`.
> 4. **Garde-fou automatisé pré-build :** `scripts/check-architecture-integrity.js` valide systématiquement que l'en-tête du menu latéral mobile consomme `ScIcon`.

---

## 12. Règle Inviolable — Révocation des Team Managers & Transfert de Commerciaux (Gouvernance d'Entreprise)

> [!IMPORTANT]
> **RÈGLE STRUCTURELLE DE GOUVERNANCE HIÉRARCHIQUE :**  
> 1. **Droit d'Arbitrage et de Gouvernance des Senior Managers sur leur Segment Respectif :**  
>    - **Tous les Senior Managers** (`orgRole === 'senior_manager'`) ont le même niveau de compétences opérationnelles : chaque Senior Manager arbitre et transfère les commerciaux entre les Team Managers **de son segment respectif** via les routes sécurisées `/api/team/managers/revoke` et `/api/team/members/transfer`.
>    - **Aucun Senior Manager n'est "titulaire" ou "propriétaire" de l'organisation** (celle-ci appartient exclusivement à la personne morale cliente). Le SM1 est l'initiateur technique dont le seul privilège distinctif est de générer les invitations pour les autres Senior Managers. Sur le plan opérationnel, tous les Senior Managers supervisent leur segment avec la même autorité.
>    - L'auto-révocation d'un Senior Manager est **strictement interdite** (`targetUid !== callerUid`).
> 2. **Continuité d'Activité et Passation de Service Obligatoire :**  
>    - En cas de révocation d'un Team Manager, **la totalité de ses dossiers** (opportunités de pipeline, prospects importés Firestore et Supabase `private_prospects`, commerciaux terrain rattachés et assignations) DOIT être transférée de manière atomique vers un **Team Manager successeur du même segment** (ou vers le Senior Manager par intérim si aucun autre TM n'est disponible).
> 3. **Préservation du Portefeuille Commercial & Règle du Portefeuille Actif Exclusif lors des Transferts :**  
>    - Le transfert individuel d'un commercial vers un nouveau Team Manager réassigne la supervision managériale (`managerUid`), mais préserve intégralement le compte du commercial (`users/{memberUid}`) et ses opportunités actives en cours (`userId`).
>    - **Portefeuille Actif Uniquement :** Seules les opportunités au statut **actif** (`prospection` et `negociation`) suivent le commercial vers le nouveau Team Manager.
>    - **Intégrité de la Base Clients de l'Ancien TM :** Toutes les affaires **conclues** (`status === 'conclue'`) restent **définitivement enregistrées dans la base de données clients (`clients`) de l'ancien Team Manager**. La collection `clients` n'est JAMAIS altérée ni transférée lors d'un transfert individuel de commercial.
> 4. **Garde-fous automatisés pré-build :**  
>    - `scripts/check-architecture-integrity.js` valide systématiquement la présence et la conformité des routes `/api/team/managers/revoke` et `/api/team/members/transfer`, l'interdiction formelle de l'auto-révocation, et la restriction stricte du transfert au portefeuille actif (exclusion des affaires conclues et sanctification de la collection `clients`).
> 5. **Révocation d'un Senior Manager — Arbitrage Obligatoire du Support Sales Companion :**  
>    - La révocation directe d'un Senior Manager par un autre Senior Manager (y compris SM1) est **formellement interdite** (`/api/team/managers/revoke` rejette toute cible ayant `orgRole === 'senior_manager'`).
>    - Toute demande de révocation d'un Senior Manager fait obligatoirement l'objet d'une demande formelle auprès du **Support de SALES COMPANION 2.0** via la route `/api/support/sm-revocation`.
>    - L'équipe Support étudie la demande et engage impérativement des vérifications avec la Direction Générale et les responsables statutaires de l'entreprise concernée avant toute validation ou rejet.
>    - Aucune interruption de segment ne peut survenir sans accord formel entre la direction de l'entreprise cliente et Sales Companion 2.0.

---

## 13. Règle Inviolable — Interdiction Absolue d'Affichage d'Identifiants Bruts (UID) dans l'UI & Résolution Obligatoire des Noms Humains

> [!CAUTION]
> **ZÉRO TOLÉRANCE POUR LES UIDS BRUTS EN INTERFACE UTILISATEUR :**  
> Les identifiants techniques internes (UIDs Firebase Auth / UUIDs Supabase, ex: `Nst48TDCkfemRwou9E1h6hHkZrC2`) ne doivent **JAMAIS** être affichés en clair à l'utilisateur à la place d'un nom de Team Manager, d'un commercial ou d'un collaborateur.
>
> 1. **Résolution par lot côté Serveur (`/api/imports`, `/api/pipeline`, `/api/reporting`) :**  
>    - Les routes API qui renvoient des fiches ou des prospects (`managerId`, `transferredToManagerUid`, `assignedTo`) DOIVENT résoudre par lot (`adminDb.getAll(...)`) les noms humains des utilisateurs correspondants (`name || displayName || email`) et peupler directement les champs dédiés (`transferredToManagerName`, `managerName`, `assignedMemberName`).
> 2. **Garde-fous UI hermétiques (`ManagerProspectsList`, `ManagerPipelineList`, etc.) :**  
>    - Les fonctions de résolution de libellé (`getTmName`, `getMemberName`) ne doivent JAMAIS utiliser d'expression de repli retournant l'identifiant brut (`?? uid` ou `|| uid`).
>    - En cas d'absence temporaire du nom dans les props, elles doivent interroger les fiches déjà résolues, le profil utilisateur connecté, ou à défaut renvoyer un libellé métier qualifié (`Team Manager` ou `Commercial`), JAMAIS la clé primaire de base de données.
> 3. **Balisage & Contrôle Automatique Continu :**  
>    - `scripts/check-architecture-integrity.js` (Étape 13) bloque systématiquement tout build ou push si un fallback d'UID est détecté dans les composants d'import ou si la résolution par lot est altérée.

---

## 14. Règle Inviolable — Balisage Strict des Rôles & Confinement de l'Agent Support

> [!CAUTION]
> **CONFINEMENT STRICT DU RÔLE AGENT SUPPORT (`role: 'support_agent'`) :**  
> L'Agent Support possède un rôle transversal d'assistance et de service après-vente hautement restreint. Il n'est en aucun cas un Team Manager ni un superviseur commercial.
>
> 1. **Interdiction Absolue d'Apparence dans la Chaîne Managériale Commerciale :**  
>    - L'Agent Support ne doit **JAMAIS** figurer dans les tableaux, listes, formulaires, sélecteurs ou colonnes dédiés aux « Team Managers ».
>    - Les filtres et dropdowns de sélection de Team Managers (`availableManagersForFilter`, etc.) doivent filtrer strictement sur les Team Managers opérationnels habilités (`role === 'manager'` et `orgRole !== 'senior_manager'`).
> 2. **Interdiction Formelle de Délégation / Transfert de Prospects Opérationnels :**  
>    - La route `/api/imports/transfer` rejette immédiatement (HTTP 400) toute tentative de transférer des prospects à un `support_agent`. Seuls les Team Managers peuvent recevoir des délégations du Senior Manager.
> 3. **Isolation Étanche des Imports d'Opportunités (Chaque Rôle Voit Seulement Ses Propres Imports) :**  
>    - Les fiches importées par un Agent Support sont strictement privées à son espace Support / CRM Clients et ne doivent **JAMAIS** polluer la file d'attente d'importation et de délégation du Senior Manager. Les supports n'ont aucun lien avec les Senior Managers.
>    - **Chaque utilisateur (SM, TM, Support) voit exclusivement ses propres imports :**
>      - Le Senior Manager ne voit dans sa liste que les opportunités qu'il a lui-même importées (et celles qu'il a transférées à ses Team Managers).
>      - Le Team Manager ne voit dans sa liste que ses propres imports et les opportunités qui lui ont été déléguées par son Senior Manager.
>      - L'Agent Support ne voit que ses propres imports dédiés à son activité d'assistance.
> 4. **Garde-fous automatisés pré-build :**  
>    - `scripts/check-architecture-integrity.js` (Étape 14) bloque systématiquement tout build ou push si le confinement de l'Agent Support ou le périmètre d'isolation des imports de chaque utilisateur est altéré.

