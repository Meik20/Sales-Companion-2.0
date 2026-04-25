# ✅ CHECKLIST D'INTÉGRATION — Team Manager v2.2

## 📁 Fichiers Modifiés

- [x] **client/team-manager.js** (CRÉÉ)
  - Module complet de gestion d'équipe manager
  - Toutes les nouvelles fonctionnalités
  
- [x] **client/index.html** (MODIFIÉ)
  - Formulaire d'activation ajouté après login-form
  - Section team-manager-content avec tabs
  - Sheet create-access-sheet pour création d'accès
  - Sheet assignments-sheet pour tâches assignées
  - Sheet assign-create-sheet pour créer assignations
  - Styles CSS pour tous les éléments manager
  - Script reference: `<script src="team-manager.js"></script>`

## 🔍 Vérifications Effectuées

### Variables Globales
- [x] `token` — Existe dans index.html
- [x] `user` — Existe dans index.html
- [x] `selectedForAssign` — Existe dans index.html
- [x] `lastResults` — Existe dans index.html
- [x] `selectedForAssignMobile` — Ajoutée dans team-manager.js

### Fonctions Helper Requises
- [x] `toast()` — Existe dans index.html (ligne 2667)
- [x] `openSheet()` — Ajoutée dans team-manager.js
- [x] `closeSheet()` — Ajoutée dans team-manager.js
- [x] `api()` — À vérifier (doit être dans index.html ou client)

### Éléments HTML
- [x] `#login-form` — Existe
- [x] `#activation-form` — Ajoutée
- [x] `#team-manager-content` — Ajoutée
- [x] `#team-members-view` — Ajoutée
- [x] `#team-activity-view` — Ajoutée
- [x] `#team-access-view` — Ajoutée
- [x] `#create-access-sheet` — Ajoutée
- [x] `#assignments-sheet` — Ajoutée
- [x] `#assign-create-sheet` — Ajoutée
- [x] `#team-loading` — Ajoutée
- [x] `#activity-loading` — Ajoutée

### API Endpoints Requis

**À configurer sur le serveur**:
```javascript
// Gestion des accès
GET    /api/team/accesses              ⚠️ À implémenter
POST   /api/team/accesses              ⚠️ À implémenter
PUT    /api/team/accesses/:id          ⚠️ À implémenter

// Activation
POST   /api/auth/activate-member       ⚠️ À implémenter
  - Sans authentification requise
  - Valide access_id unique
  - Crée compte utilisé avec mot de passe
  - Retourne token + user

// Existants (devraient fonctionner)
GET    /api/team
GET    /api/pipeline?assignee=
POST   /api/assignments
PUT    /api/pipeline/:id
```

## 🚀 Tests Recommandés

### 1. Test Formulaire d'Activation
- [ ] Accès l'écran login
- [ ] Chercher lien activation (ou détection auto)
- [ ] Entrer ID d'accès valide
- [ ] Entrer mot de passe faible → Erreur
- [ ] Entrer 2 mots de passe différents → Erreur
- [ ] Créer compte avec données valides
- [ ] Vérifier auto-login après activation

### 2. Test Gestion d'Équipe Manager
- [ ] Se connecter comme manager
- [ ] Vérifier apparition onglet "Accès"
- [ ] Créer nouvel accès (prénom/nom)
- [ ] Vérifier format ID: `Prénom/Nom@Entreprise`
- [ ] Vérifier copie ID automatique
- [ ] Vérifier limite max 10 accès
- [ ] Tester révocation d'accès

### 3. Test Onglets Équipe
- [ ] **Membres**: Affichage membres + KPI
- [ ] **Activité**: Feed temps réel
- [ ] **Accès**: Gestion des accès générés

### 4. Test Assignations
- [ ] Sélectionner entreprises en recherche (overlay)
- [ ] Ouvrir sheet assignation
- [ ] Sélectionner un commercial
- [ ] Créer assignation
- [ ] Vérifier apparition dans pipeline

## ⚠️ Points d'Attention

### Fonction `api()` Manquante?
Si la fonction `api()` n'existe pas dans le client, vérifier:
- [ ] Est-ce qu'elle existe dans `client/main.js` ou `client/api-client.js`?
- [ ] Sinon, ajouter un fallback utilisant `fetch()`

### Variables Globales
- Toutes les variables accèdent à `user`, `token`, `lastResults`
- Vérifier que ces variables existent et sont accessibles

### CSS Conflits
- Vérifier qu'aucun CSS existant ne surcharge les nouveaux styles
- Les styles manager utilisent les variables CSS existantes (`--g`, `--bd`, etc.)

## 📝 Logs de Débogage

Ajouter au browser console:
```javascript
// Vérifier variables
console.log('user:', user);
console.log('token:', token);
console.log('selectedForAssignMobile:', window.selectedForAssignMobile);
console.log('teamMembers:', teamMembers);

// Vérifier functions
console.log('api exists:', typeof api);
console.log('toast exists:', typeof toast);
console.log('openSheet exists:', typeof openSheet);
```

## 🔗 Points d'Intégration Clés

### Dans `showApp()` (existante)
```javascript
// AJOUTÉ: Appelle applyManagerRole()
// vérifie si user.role === 'manager'
// Affiche/cache les éléments manager
```

### Dans `renderResults()` (existante)
```javascript
// AJOUTÉ: Pour chaque carte entreprise
// - Ajoute overlay button pour sélection
// - Ajoute class 'manager-selected' si déjà sélectionnée
```

### Dans `switchTab2()` (existante)
```javascript
// AJOUTÉ: Quand name === 'team'
// - Vérifie si user est manager
// - Appelle loadTeamData() si première visite
```

## 🎯 Résolution d'Erreurs Courantes

**Erreur: "toast is not defined"**
→ Vérifier que toast() existe dans index.html

**Erreur: "selectedForAssignMobile is not defined"**
→ Vérifier que window.selectedForAssignMobile est initialisée dans team-manager.js

**Erreur: "api is not defined"**
→ Chercher où api() est définie (client/api-client.js?) ou créer fallback

**Accès managers ne s'affichent pas**
→ Vérifier que `/api/team/accesses` est implémentée côté serveur

**Activation échoue**
→ Vérifier que `/api/auth/activate-member` accepte POST sans auth

## ✨ Améliorations Futures

1. **Backend**: Implémenter les endpoints manquants
2. **Notifications**: Toast différentes pour succès/erreurs
3. **Validation**: Côté client + serveur
4. **Tests**: Unit tests des fonctions manager
5. **Audit**: Logger les créations d'accès
6. **Export**: CSV des membres et accès

---

**Date Intégration**: 25 Avril 2026  
**Status**: En attente d'implémentation backend  
**Testabilité**: ⚠️ Partielle (dépend du backend)
