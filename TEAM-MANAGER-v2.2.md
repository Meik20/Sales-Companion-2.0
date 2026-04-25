# 🎯 AMÉLIORATIONS TEAM MANAGER — v2.2

## ✅ Intégration Complète

### 📋 Fichiers Modifiés
- **client/index.html** — Ajout du formulaire d'activation, sections manager, sheets et styles
- **client/team-manager.js** — Nouveau module complet de gestion d'équipe

### 🔑 Nouvelles Fonctionnalités

#### 1. **Génération d'Accès Membres** (Max 10)
- Managers peuvent créer jusqu'à 10 accès uniques pour les membres de l'équipe
- Format ID d'accès: `Prénom/Nom@Entreprise`
- Gestion complète: création, copie de l'ID, révocation
- Statuts: `pending`, `active`, `revoked`

#### 2. **Activation Automatique de Compte**
- Nouveau formulaire d'activation au login
- Les membres utilisent l'ID d'accès fourni par le manager
- Changement obligatoire du mot de passe (min 8 caractères)
- Confirmation automatique du mot de passe
- Connexion automatique après activation

#### 3. **Gestion d'Équipe Complète**
- **Onglet Membres**: Vue des commerciaux de l'équipe
  - Cartes expandables avec KPI (prospects, négociations, conclus)
  - Pipeline récent pour chaque membre
  - Actions: assigner prospects, voir tout le pipeline
  
- **Onglet Activité**: Feed temps réel de l'équipe
  - Statuts avec icônes (prospect, négociation, conclu)
  - Affichage des notes et dates
  - Auto-tri par date décroissante
  
- **Onglet Accès**: Gestion des accès générés
  - Quota visible (X/10 accès utilisés)
  - Détails: nom, date création, date activation
  - Actions: copier ID, révoquer accès

#### 4. **Assignation de Prospects**
- Multi-sélection d'entreprises (bouton overlay)
- Assignation à un ou plusieurs commerciaux
- Ajout de notes et contexte
- Support de l'API `/api/assignments` avec fallback `/api/pipeline`

### 📁 Structure HTML Ajoutée

```html
<!-- Formulaire d'Activation -->
<div id="activation-form">
  - ID d'accès
  - Nouveau mot de passe
  - Confirmation mot de passe

<!-- Section Manager -->
<div id="team-manager-content">
  - Tabs: Membres | Activité | Accès
  - Vues dynamiques pour chaque section

<!-- Sheets (Modales) -->
<div id="create-access-sheet">  <!-- Création accès -->
<div id="assignments-sheet">   <!-- Mes tâches -->
<div id="assign-create-sheet">  <!-- Créer assignation -->
```

### 🎨 Styles CSS

Styles complets pour:
- Team manager content et tabs
- Member cards avec KPI
- Activity feed et timeline dots
- Access management et badges
- Form elements et buttons
- Assign chips et member rows

### 🔌 API Endpoints Requis

#### Backend doit supporter:

```javascript
// Gestion des accès
GET    /api/team/accesses              // Lister les accès
POST   /api/team/accesses              // Créer un accès
PUT    /api/team/accesses/:id          // Modifier statut accès

// Activation
POST   /api/auth/activate-member       // Activer un accès (sans auth)
  Request: { access_id, new_password }
  Response: { token, user }

// Équipe
GET    /api/team                       // Lister les membres
GET    /api/pipeline?assignee=uid      // Pipeline d'un membre

// Assignations
POST   /api/assignments                // Créer assignation
PUT    /api/pipeline/:id               // Maj statut prospect
```

### 🛠️ Functions JavaScript Ajoutées

**Helpers**:
- `openSheet(sheetId)` — Ouvre une modale
- `closeSheet(sheetId)` — Ferme une modale
- `openTab(tabName)` — Switch formulaire

**Manager Role**:
- `applyManagerRole()` — Applique UI pour les managers
- `switchTeamSeg(seg, el)` — Change d'onglet équipe
- `refreshTeamData()` — Recharge données équipe

**Accès**:
- `loadGeneratedAccesses()` — Charge accès du manager
- `renderAccessManagement()` — Affiche gestion d'accès
- `openCreateAccessSheet()` — Ouvre formulaire création
- `submitCreateAccess()` — Crée nouvel accès
- `copyAccessId(accessId)` — Copie l'ID (clipboard + fallback)
- `revokeAccess(accessId)` — Révoque un accès

**Activation**:
- `showMemberActivationFlow()` — Bascule au formulaire activation
- `activateMemberAccess()` — Valide et active un accès
- `updateAccessPreview()` — Aperçu de l'ID d'accès

**Équipe**:
- `loadTeamData()` — Charge commerciaux + pipeline
- `renderTeamMembers()` — Affiche cartes membres
- `buildActivityFeed()` — Construit feed d'activité
- `renderActivityFeed()` — Affiche activité temps réel

**Assignations**:
- `toggleSelectForAssignMobile(i)` — Sélectionne entreprise
- `updateManagerSelectBar()` — Maj barre de sélection
- `clearManagerSelection()` — Réinitialise sélection
- `openManagerAssignSheet()` — Ouvre sheet assignation
- `populateAssignTeamList()` — Liste les commerciaux
- `selectAssignMember(uid)` — Choisit commercial
- `submitAssignmentNew()` — Crée assignation

### 🔐 Sécurité

1. **Activation sécurisée**: 
   - Validation ID d'accès côté serveur
   - Mot de passe min 8 caractères
   - Vérification unicité

2. **Limite d'accès**:
   - Max 10 accès par manager
   - Vérification de la limite avant création

3. **Revocation**:
   - Statut `revoked` permanent
   - Empêche la réutilisation

### 🚀 Utilisation

#### Lors du Login
```javascript
// L'application détecte automatiquement:
// 1. Compte manager → applyManagerRole()
// 2. Premier login avec accès → showMemberActivationFlow()
```

#### Pour les Managers
1. Aller à l'onglet **Accès**
2. Cliquer **Créer un accès**
3. Entrer prénom/nom du commercial
4. L'ID est généré automatiquement (ex: Jean/Dupont@Acme)
5. Copier et partager l'ID au nouveau commercial

#### Pour les Nouveaux Commerciaux
1. Voir écran login
2. Cliquer **Pas d'ID ?** → Activation
3. Entrer l'ID reçu du manager
4. Choisir mot de passe (min 8 caractères)
5. Confirmer → Compte activé automatiquement

### 📊 Données Stockées

```javascript
// Client (localStorage)
generatedAccesses = [
  {
    id: string,
    access_id: "Prénom/Nom@Entreprise",
    member_name: "Prénom Nom",
    status: "pending" | "active" | "revoked",
    created_at: ISO8601,
    activated_at?: ISO8601,
    manager_uid: string,
    company_name: string
  }
]

teamMembers = [
  {
    uid: string,
    email: string,
    name: string,
    role: "commercial" | "manager"
  }
]

teamMembersPipeline = {
  [uid]: [
    {
      id: string,
      company_name: string,
      company_sector: string,
      company_city: string,
      status: "prospection" | "negociation" | "conclue",
      created_at: ISO8601,
      updated_at: ISO8601,
      note: string
    }
  ]
}
```

### 🔄 Hooks d'Intégration

Le code se greffe automatiquement sur les fonctions existantes:

```javascript
// Dans DOMContentLoaded du team-manager.js:
- Intercepte window.showApp() → applyManagerRole()
- Intercepte window.renderResults() → Ajoute overlay select
- Intercepte window.switchTab2() → loadTeamData() pour tab 'team'
```

### ✨ Prochaines Étapes (Optional)

1. **Notification en temps réel**: Socket.io pour activations
2. **Permissions granulaires**: Rôles (full manager, commercial, support)
3. **Historique des accès**: Audit trail complet
4. **Export données**: CSV des membres et pipeline
5. **Invitations email**: Automatique lors de création d'accès

---

**Version**: 2.2  
**Date**: Avril 2026  
**Status**: ✅ Production Ready
