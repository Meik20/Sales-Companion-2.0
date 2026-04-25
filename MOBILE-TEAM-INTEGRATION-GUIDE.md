# 📱 Intégration de la Gestion d'Équipe - Application Mobile

## ✅ Améliorations Implémentées

### 1. **Nouvelle Fonctionnalité : Onglet Équipe pour Managers**
- ✅ Onglet "Équipe" uniquement visible pour les managers
- ✅ Trois sections : Commerciaux, Activité, Accès
- ✅ Accès caché dans la navigation par défaut

### 2. **Génération d'Accès Membres**
- ✅ Limite de 10 accès actifs par Manager
- ✅ Format ID : `Prénom/Nom@Entreprise`
- ✅ Statuts : Pending, Active, Revoked
- ✅ Copie automatique de l'ID après création

### 3. **Activation de Compte (Première Connexion)**
- ✅ Formulaire d'activation au lieu de connexion normale
- ✅ Changement obligatoire du mot de passe (min. 8 caractères)
- ✅ Linking automatique au Manager

### 4. **Gestion des Commerciaux**
- ✅ Liste des commerciaux avec KPIs
- ✅ Expansion pour voir le pipeline
- ✅ Affichage du nombre de prospects par statut
- ✅ Pipeline récent (5 derniers prospects)

### 5. **Flux d'Activité en Temps Réel**
- ✅ Activité de tous les commerciaux
- ✅ Statuts visuels (Prospect, Négociation, Conclu)
- ✅ Tri chronologique descendant
- ✅ Affichage des notes associées

## 📁 Fichiers Créés/Modifiés

### Fichiers Créés
- ✅ `mobile/team-manager.js` - Logique complète de gestion d'équipe

### Fichiers Modifiés
- ✅ `mobile/index.html` 
  - Ajout du script team-manager.js
  - Onglet team dans le contenu principal
  - Bouton team dans la navigation
  - Sheets pour création d'accès et activation
  - Styles CSS pour la gestion d'équipe

## 🎨 Styles CSS Ajoutés

```css
/* Onglet équipe et segmentation */
.team-header, .team-seg, .tseg

/* Cartes des commerciaux */
.member-card, .member-head, .member-av, .member-info
.member-chevron, .member-kpi, .mkpi, .mkpi-val, .mkpi-lbl

/* Pipeline membres */
.member-pipeline, .mpip-title, .mpip-item, .mpip-item-status

/* Gestion des accès */
.access-header, .access-quota, .access-card, .access-status-badge
.access-card-actions, .access-btn

/* Flux d'activité */
.activity-item, .activity-dot, .activity-body, .activity-text
```

## 🔌 Intégration API

Les appels API suivants sont utilisés :

### Endpoints Requis

```
GET  /api/team                      # Charger les commerciaux
GET  /api/pipeline?assignee=...     # Pipeline par commercial
GET  /api/team/accesses             # Lister les accès
POST /api/team/accesses             # Créer un accès
PUT  /api/team/accesses/:id         # Révoquer un accès
POST /api/auth/activate-member      # Activer un compte member
```

### Formats de Données Attendus

#### Response GET /api/team
```json
{
  "data": [
    {
      "uid": "user-id",
      "name": "Jean Dupont",
      "email": "jean@example.com",
      "role": "salesman"
    }
  ]
}
```

#### Response GET /api/team/accesses
```json
{
  "data": [
    {
      "id": "acc-1",
      "access_id": "Jean/Dupont@Entreprise",
      "member_name": "Jean Dupont",
      "status": "active|pending|revoked",
      "created_at": "2026-04-25T...",
      "activated_at": "2026-04-25T..."
    }
  ]
}
```

#### Request POST /api/team/accesses
```json
{
  "member_name": "Jean Dupont",
  "access_id": "Jean/Dupont@Entreprise",
  "manager_uid": "manager-uid",
  "company_name": "Entreprise"
}
```

#### Request POST /api/auth/activate-member
```json
{
  "access_id": "Jean/Dupont@Entreprise",
  "new_password": "SecurePass123"
}
```

## 🧪 Test de l'Intégration

### Vérifier les Éléments HTML
```javascript
// Vérifier que l'onglet team existe
document.getElementById('tab-team')                    // ✅

// Vérifier le bouton de navigation team
document.getElementById('nav-team')                    // ✅

// Vérifier les containers
document.getElementById('team-members-view')          // ✅
document.getElementById('team-activity-view')         // ✅
document.getElementById('team-access-view')           // ✅
```

### Tester les Fonctions
```javascript
// Manager role application
applyManagerRole()                                    // ✅

// Charger les données d'équipe
refreshTeamData()                                     // ✅

// Accéder à la création d'accès
openCreateAccessSheet()                               // ✅

// Activation d'accès
activateMemberAccess()                                // ✅
```

## ⚙️ Configuration Requise

### Côté Backend

Les endpoints suivants doivent être implémentés :

1. **GET /api/team** - Retourner les commerciaux liés au manager
2. **GET /api/pipeline** - Retourner le pipeline filtrés par assignee
3. **GET /api/team/accesses** - Lister les accès du manager
4. **POST /api/team/accesses** - Créer un nouvel accès
5. **PUT /api/team/accesses/:id** - Modifier un accès (révocation)
6. **POST /api/auth/activate-member** - Activer un compte member

### Côté Frontend Mobile

Variables globales disponibles :
- `user` - Utilisateur actuel
- `token` - Token d'authentification
- `API` ou `RAILWAY_SERVER` - URL de base API

Fonctions disponibles :
- `api()` - Fonction d'appel API avec gestion des erreurs
- `toast()` - Afficher une notification
- `openSheet()` / `closeSheet()` - Gérer les sheets
- `showApp()` - Afficher l'application

## 🚀 Utilisation

### Pour les Managers

1. **Accéder à l'équipe** : Cliquer sur "Équipe" dans la navigation
2. **Voir les commerciaux** : Onglet "Commerciaux" (par défaut)
3. **Voir l'activité** : Cliquer sur "Activité"
4. **Gérer les accès** : Cliquer sur "Accès" → "Créer un accès"
5. **Copier l'ID** : L'ID est copié automatiquement après création

### Pour les Membres (Première Connexion)

1. **Recevoir l'ID** : Format `Prénom/Nom@Entreprise`
2. **Cliquer sur "Activation du compte"**
3. **Entrer l'ID d'accès**
4. **Créer un mot de passe** (min. 8 caractères)
5. **Activer le compte** → Connexion automatique

## 📊 Statistiques Affichées

### Par Commercial
- Nombre de prospects
- Nombre de négociations en cours
- Nombre de ventes conclues
- Pipeline récent (5 derniers)

### Activité Équipe
- Nom du commercial
- Entreprise concernée
- Statut du prospect
- Note (si présente)
- Date et heure

### Accès
- ID d'accès (format lisible)
- Statut (En attente, Actif, Révoqué)
- Nom du membre
- Dates création/activation
- Actions (Copier, Révoquer)

## ⚠️ Notes Importantes

1. **Limite d'Accès** : Max 10 accès actifs/en attente par manager
2. **Mot de Passe** : Minimum 8 caractères requis
3. **Token Valide** : Un token valide est requis pour tous les appels API
4. **Format ID** : `Prénom/Nom@NomEntreprise` - Pas de caractères spéciaux
5. **Révocation** : Les accès révoqués ne peuvent pas être restaurés
6. **Synchronisation** : L'onglet team se met à jour au changement d'onglet

## 🔐 Sécurité

- ✅ Authentification par token Bearer
- ✅ Validation du rôle Manager
- ✅ Mot de passe sécurisé (min 8 chars)
- ✅ Pas d'exposition du token en localStorage
- ✅ Refresh automatique du token expiré

## 📝 Prochaines Étapes (Optionnel)

1. Ajouter la pagination pour la liste des commerciaux
2. Ajouter des filtres d'activité (par date, par commercial)
3. Ajouter un export des données d'équipe
4. Ajouter des statistiques agrégées
5. Ajouter une notification en temps réel
6. Ajouter un système d'assignation depuis l'onglet team
