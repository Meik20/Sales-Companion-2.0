# 🗂️ Firestore Collections — Sales Companion

## 📋 Vue d'ensemble

```
firestore/
├── users/{uid}/                              # Profils utilisateurs
├── companies/{companyId}/                    # Base de d'entreprises
├── config/{key}/                             # Configuration système
├── usage_logs/{logId}/                       # Logs d'utilisation
├── saved_searches/{searchId}/                # Recherches sauvegardées
└── admin_logs/{logId}/                       # Logs admin
```

---

## 📊 Collections Détaillées

### 1️⃣ **users** — Profils Utilisateurs

**Path:** `users/{uid}`  
**Document ID:** Firebase Auth UID  
**Row-level Security:** Chaque utilisateur ne voit que son profil (sauf admins)

```json
{
  "uid": "user-firebase-uid",
  "email": "user@example.com",
  "name": "Jean Dupont",
  "role": "user",                              // "admin" ou "user"
  "plan": "free",                              // free | starter | pro | enterprise
  "daily_limit": 10,                           // Limite recherches/jour
  "daily_used": 0,                             // Recherches utilisées aujourd'hui
  "last_reset": "2026-04-13T00:00:00.000Z",   // Dernier reset du counter
  "remaining": 10,                             // Caraculé: daily_limit - daily_used
  "active": true,
  "created_at": "2026-04-13T10:30:00.000Z",
  "updated_at": "2026-04-13T10:30:00.000Z"
}
```

**Sous-collection:** `users/{uid}/pipeline`

```json
// users/{uid}/pipeline/{prospectId}
{
  "id": "prospect-001",
  "company_id": "company-123",                 // Référence optionnelle
  "company_name": "Acme Construction SARL",
  "company_sector": "BTP et construction",
  "company_city": "Douala",
  "company_phone": "+237612345678",
  "company_email": "contact@acme.cm",
  "status": "prospection",                     // prospection | negociation | conclue
  "note": "Contact pris, suivi prévu",
  "next_action": "Rappel téléphonique",
  "next_date": "2026-04-20",
  "created_at": "2026-04-13T10:30:00.000Z",
  "updated_at": "2026-04-13T14:00:00.000Z"
}
```

---

### 2️⃣ **companies** — Base de Données Entreprises

**Path:** `companies/{companyId}`  
**Document ID:** Auto-généré ou NIU (si présent)  
**Row-level Security:** Lisible par tout utilisateur authentifié

```json
{
  "id": "company-001",
  "raison_sociale": "Acme Construction SARL",     // ✓ Obligatoire
  "sigle": "ACME",
  "niu": "1234567890",                            // Index unique (NIU)
  "sector": "BTP et construction",                // Auto-détecté
  "region": "Littoral",                           // Auto-détecté
  "city": "Douala",                               // Auto-détecté
  "activite_principale": "Construction bâtiments",
  "centre_rattachement": "Douala/Littoral",
  "statut_juridique": "SARL",
  "telephone": "+237612345678",
  "email": "contact@acme.cm",
  "site_web": "www.acme.cm",
  "dirigeant": "Jean Dupont",
  "rccm": "RC/DLA/2024/A/001234",
  "adresse": "123 Rue de la Paix, Douala",
  "active": true,
  "source": "excel_import_2026-04-13",            // Provenance
  "imported_by": "admin-uid-123",                 // Admin qui a importé
  "imported_at": "2026-04-13T10:30:00.000Z",
  "created_at": "2026-04-13T10:30:00.000Z",
  "updated_at": "2026-04-13T10:30:00.000Z"
}
```

**Indices recommandés:**
- `(sector, region, active)` — Pour les recherches filtrées
- `(active, sector)` — Pour les recherches par secteur
- `(niu)` unique — Dédoublonnage

---

### 3️⃣ **config** — Configuration Système

**Path:** `config/{key}`  
**Document ID:** Clé de configuration (ex: `groq_api_key`, `app_version`)  
**Row-level Security:** Admins seulement (sauf variables publiques)

```json
// config/groq_api_key
{
  "key": "groq_api_key",
  "value": "gsk_xxxxxxxxxxxxxxxxxxxxxxx",
  "type": "secret",                             // secret | public
  "description": "Clé API Groq pour l'assistant IA",
  "updated_at": "2026-04-13T10:30:00.000Z",
  "updated_by": "admin-uid"
}
```

```json
// config/app_version
{
  "key": "app_version",
  "value": "2.0.0",
  "type": "public",
  "description": "Version actuelle de l'application",
  "updated_at": "2026-04-13T10:30:00.000Z"
}
```

**Clés courants:**
- `groq_api_key` (secret) — Clé API Groq
- `app_version` (public) — Version app
- `maintenance_mode` (public) — Mode maintenance
- `max_import_rows` (public) — Limite import Excel

---

### 4️⃣ **usage_logs** — Logs d'Utilisation

**Path:** `usage_logs/{logId}`  
**Document ID:** Auto-généré par Firestore  
**Row-level Security:** Admins seulement

```json
{
  "id": "log-001",
  "user_id": "user-uid-123",
  "user_email": "user@example.com",
  "action": "search",                           // search | import | export | config_change
  "query": "BTP Douala",
  "filters": {
    "sector": "BTP et construction",
    "region": "Littoral",
    "city": "Douala"
  },
  "results_count": 45,
  "success": true,
  "error": null,
  "timestamp": "2026-04-13T14:30:00.000Z",
  "ip_address": "192.168.1.100"                 // Si capturé
}
```

---

### 5️⃣ **saved_searches** — Recherches Sauvegardées

**Path:** `saved_searches/{searchId}`  
**Document ID:** Auto-généré par Firestore  
**Row-level Security:** Propriétaire seulement

```json
{
  "id": "search-001",
  "uid": "user-uid-123",
  "title": "BTP Douala — Prospects avril 2026",
  "query": "BTP Douala",
  "filters": {
    "sector": "BTP et construction",
    "region": "Littoral",
    "city": "Douala",
    "statut_juridique": "SARL"
  },
  "results": [
    {
      "id": "company-001",
      "raison_sociale": "Acme Construction SARL",
      "sector": "BTP et construction",
      "city": "Douala"
    }
    // Max 20 résultats sauvegardés
  ],
  "results_count": 45,                         // Nombre réel trouvé
  "created_at": "2026-04-13T10:30:00.000Z",
  "updated_at": "2026-04-13T14:00:00.000Z",
  "last_accessed": "2026-04-13T15:00:00.000Z"
}
```

---

### 6️⃣ **admin_logs** — Logs Admin

**Path:** `admin_logs/{logId}`  
**Document ID:** Auto-généré par Firestore  
**Row-level Security:** Admins seulement

```json
{
  "id": "admin-log-001",
  "admin_id": "admin-uid-123",
  "admin_email": "admin@example.com",
  "action": "user_plan_change",                 // user_plan_change | import_excel | delete_company | settings_change
  "target_user_id": "user-uid-456",
  "target_user_email": "user@example.com",
  "details": {
    "old_plan": "free",
    "new_plan": "pro",
    "reason": "Upgrade manuel"
  },
  "success": true,
  "timestamp": "2026-04-13T14:30:00.000Z"
}
```

---

## 🔑 Indices à Créer (Firestore Indexes)

Pour optimiser les requêtes:

```
1. Collection: companies
   Fields: (sector, region, active) - Ascending (pour filtrage)
   Fields: (active, created_at) - Ascending (pour tri)

2. Collection: saved_searches
   Fields: (uid, created_at) - Ascending (pour récupérer les recherches de l'user)

3. Collection: usage_logs
   Fields: (user_id, timestamp) - Ascending (pour audit user)
   Fields: (action, timestamp) - Ascending (pour audit global)

4. Collection: admin_logs
   Fields: (admin_id, timestamp) - Ascending

5. Subcollection: users/{uid}/pipeline
   Fields: (status, updated_at) - Ascending (pour trier par statut)
```

---

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ── Helper Functions ──
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin(uid) {
      return request.auth.token.admin == true;
    }
    
    function isUser(uid) {
      return request.auth.uid == uid;
    }
    
    // ── USERS Collection ──
    match /users/{uid} {
      allow read: if isSignedIn() && (isUser(uid) || isAdmin(request.auth.uid));
      allow create: if isSignedIn() && isUser(uid);
      allow update: if isSignedIn() && (isUser(uid) || isAdmin(request.auth.uid));
      allow delete: if isSignedIn() && isAdmin(request.auth.uid);
      
      // Subcollection: pipeline
      match /pipeline/{prospectId} {
        allow read: if isSignedIn() && isUser(uid);
        allow create: if isSignedIn() && isUser(uid);
        allow update: if isSignedIn() && isUser(uid);
        allow delete: if isSignedIn() && isUser(uid);
      }
    }
    
    // ── COMPANIES Collection ──
    match /companies/{companyId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && isAdmin(request.auth.uid);
      allow update: if isSignedIn() && isAdmin(request.auth.uid);
      allow delete: if isSignedIn() && isAdmin(request.auth.uid);
    }
    
    // ── CONFIG Collection ──
    match /config/{key} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && isAdmin(request.auth.uid);
    }
    
    // ── USAGE_LOGS Collection ──
    match /usage_logs/{logId} {
      allow read: if isSignedIn() && isAdmin(request.auth.uid);
      allow create: if isSignedIn();
      allow delete: if isSignedIn() && isAdmin(request.auth.uid);
    }
    
    // ── SAVED_SEARCHES Collection ──
    match /saved_searches/{searchId} {
      allow read: if isSignedIn() && isUser(resource.data.uid);
      allow create: if isSignedIn() && isUser(request.resource.data.uid);
      allow update: if isSignedIn() && isUser(resource.data.uid);
      allow delete: if isSignedIn() && isUser(resource.data.uid);
    }
    
    // ── ADMIN_LOGS Collection ──
    match /admin_logs/{logId} {
      allow read: if isSignedIn() && isAdmin(request.auth.uid);
      allow create: if isSignedIn() && isAdmin(request.auth.uid);
      allow delete: if isSignedIn() && isAdmin(request.auth.uid);
    }
  }
}
```

---

## 👥 Gestion des Rôles

### Role Utilisateur Normal ("user")

1. **Création automatique:** À la registration
2. **Permissions:**
   - ✓ Voir son profil
   - ✓ Voir toutes les entreprises
   - ✓ Créer/gérer ses pipeline
   - ✓ Sauvegarder ses recherches
   - ✗ Importer des entreprises
   - ✗ Voir les logs d'autres utilisateurs
   - ✗ Accéder au panel admin

### Role Admin ("admin")

1. **Création manuelle:** Via Firebase Console ou script admin
2. **Permissions:**
   - ✓ Tout ce qu'un user normal peut faire
   - ✓ Importer des entreprises (Excel)
   - ✓ Modifier configuration système
   - ✓ Changer les plans des utilisateurs
   - ✓ Accéder au panel admin
   - ✓ Voir les logs d'utilisation
   - ✓ Voir les logs admin

### Attribution du rôle Admin

**Option 1: Via Firebase Console**
```
1. Aller à Authentication → Users
2. Sélectionner l'utilisateur
3. Cliquer "Custom Claims"
4. Ajouter: {"admin": true}
5. Sauvegarder
```

**Option 2: Via Script Node.js**
```javascript
const admin = require('firebase-admin');
admin.initializeApp(serviceAccountKey);

const uid = 'user-uid-to-make-admin';
await admin.auth().setCustomUserClaims(uid, { admin: true });
console.log('✓ Admin role assigned');
```

---

## 📋 Checklist Création Firestore

- [ ] Créer collection `users`
- [ ] Créer collection `companies` avec indices
- [ ] Créer collection `config`
- [ ] Créer collection `usage_logs` avec indices
- [ ] Créer collection `saved_searches` avec indices
- [ ] Créer collection `admin_logs` avec indices
- [ ] Déployer Firestore Security Rules
- [ ] Créer premier admin via Firebase Console
- [ ] Tester les permissions de sécurité
- [ ] Importer les données d'entreprises (Excel)

---

## 🧪 Données Test

Voir `FIRESTORE-INIT.js` pour initialiser les données de test.
