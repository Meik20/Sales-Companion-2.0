# ✅ Firestore Collections Créées — Résumé

**Date:** Avril 2026  
**Statut:** ✅ Prêt pour déploiement  
**Rôles:** Admin, User (role-based access control)

---

## 📦 Fichiers Créés (6 fichiers)

### 1️⃣ 📘 FIRESTORE-COLLECTIONS.md
**Documentation architecture Firestore complète**

Contient:
- ✅ Vue d'ensemble des 6 collections + 1 subcollection
- ✅ Schéma détaillé de chaque document avec types
- ✅ Explication des rôles (Admin vs User)
- ✅ Indices recommandés (7 total)
- ✅ Security Rules (règles d'accès)
- ✅ Checklist de création

**Lire:** 20 minutes

---

### 2️⃣ 🚀 FIRESTORE-INIT.js
**Script Node.js pour initialiser Firestore**

Fait automatiquement:
- ✅ Crée les utilisateurs de test (1 admin + 1 regular user)
- ✅ Crée la collection "users" avec 2 profils
- ✅ Crée la collection "companies" avec 3 entreprises test
- ✅ Crée la collection "config" avec 4 paramètres
- ✅ Crée la subcollection "pipeline" pour chaque user
- ✅ Crée la collection "saved_searches" avec 1 recherche test
- ✅ Set des custom claims "admin: true" pour l'admin

**Utilisation:**
```bash
node FIRESTORE-INIT.js
```

**Sortie:** Collections + utilisateurs de test automatiquement créés

---

### 3️⃣ 🔐 firestore.rules
**Firestore Security Rules (règles d'accès)**

Implémente:
- ✅ Authentification requise pour toutes les opérations
- ✅ Row-level security: chaque user ne voit que ses données
- ✅ Admins ont accès complet
- ✅ Companies lisibles par tous (pour recherche)
- ✅ Config accessible par admins seulement (sauf config "public")
- ✅ Logs accessibles par admins seulement
- ✅ Deny par défaut (sécurité maximum)

**Déployer:**
```bash
firebase deploy --only firestore:rules
```

---

### 4️⃣ 📊 firestore.indexes.json
**Configuration des indices Firestore (performance)**

Définit 7 indices composés:

| Collection | Champs | Rôle |
|-----------|--------|------|
| companies | sector, region, active | Filtres de recherche |
| companies | active, created_at | Tri par date |
| saved_searches | uid, created_at | Recherches par user |
| usage_logs | user_id, timestamp | Logs par user |
| usage_logs | action, timestamp | Audit trail |
| admin_logs | admin_id, timestamp | Actions admin |
| pipeline | status, updated_at | Prospects par statut |

**Déployer:**
```bash
firebase deploy --only firestore:indexes
```

---

### 5️⃣ 🎯 firebase.json
**Configuration Firebase CLI**

Définit:
- Chemin des rules: `firestore.rules`
- Chemin des indexes: `firestore.indexes.json`
- Configuration des émulateurs (optionnel)

---

### 6️⃣ 🧪 test-firebase-auth.js
**Script de validation complet**

Teste:
- ✅ Récupération de l'utilisateur admin
- ✅ Récupération de l'utilisateur régulier
- ✅ Les custom claims (admin: true)
- ✅ Access à la collection users
- ✅ Access à la collection companies
- ✅ Access à la subcollection pipeline
- ✅ Accès à la collection config
- ✅ Génération de tokens
- ✅ Hiérarchie des permissions

**Utilisation:**
```bash
node test-firebase-auth.js
```

**Résultat:** Rapport complet avec:
- ✓ ou ✗ pour chaque test
- Informations des users de test
- Données trouvées (companies, config, etc)
- Prochaines étapes

---

### 📘 FIRESTORE-DEPLOYMENT.md
**Guide complet étape-par-étape**

Contient:
- ✅ 5 étapes de configuration
- ✅ 5 étapes d'initialisation
- ✅ 5 étapes de test/validation
- ✅ Section troubleshooting
- ✅ Checklist complète
- ✅ Ressources et documentation

**Lire:** 30 minutes  
**Suivre:** 15 minutes pour déploiement complet

---

## 🗂️ Collections Créées (Firestore)

### users/{uid}
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "name": "Prenom Nom",
  "role": "admin|user",
  "plan": "free|starter|pro|enterprise",
  "daily_limit": 10-1000,
  "daily_used": 0-1000,
  "remaining": number,
  "active": true,
  "created_at": timestamp,
  "updated_at": timestamp
}
```

**Subcollection:** `users/{uid}/pipeline/{prospectId}`

---

### companies/{companyId}
```json
{
  "id": "company-001",
  "raison_sociale": "...",
  "sigle": "...",
  "niu": "unique",
  "sector": "auto-detected",
  "region": "auto-detected",
  "city": "...",
  "telephone": "+237...",
  "email": "...",
  "site_web": "...",
  "dirigeant": "...",
  "rccm": "...",
  "active": true,
  "imported_by": "admin-uid",
  "imported_at": timestamp,
  "created_at": timestamp,
  "updated_at": timestamp
}
```

---

### config/{key}
```json
{
  "key": "groq_api_key|app_version|...",
  "value": "...",
  "type": "secret|public",
  "description": "...",
  "updated_at": timestamp,
  "updated_by": "admin-uid"
}
```

---

### usage_logs/{logId}
```json
{
  "id": "log-001",
  "user_id": "uid",
  "user_email": "email",
  "action": "search|import|export|...",
  "query": "BTP Douala",
  "filters": {...},
  "results_count": 45,
  "success": true,
  "error": null,
  "timestamp": timestamp,
  "ip_address": "192.168..."
}
```

---

### saved_searches/{searchId}
```json
{
  "id": "search-001",
  "uid": "owner-uid",
  "title": "BTP Douala — Prospects",
  "query": "BTP Douala",
  "filters": {
    "sector": "...",
    "region": "...",
    "city": "..."
  },
  "results": [...],
  "results_count": 45,
  "created_at": timestamp,
  "updated_at": timestamp,
  "last_accessed": timestamp
}
```

---

### admin_logs/{logId}
```json
{
  "id": "admin-log-001",
  "admin_id": "admin-uid",
  "admin_email": "admin@example.com",
  "action": "user_plan_change|import_excel|...",
  "target_user_id": "uid",
  "target_user_email": "email",
  "details": {...},
  "success": true,
  "timestamp": timestamp
}
```

---

## 👥 Rôles & Permissions

### Role: ADMIN
**Custom Claim:** `admin: true`

**Permissions:**
- ✅ Voir tout (all users, all companies, logs)
- ✅ Importer des entreprises (Excel)
- ✅ Modifier configuration système
- ✅ Changer les plans des utilisateurs
- ✅ Accéder au panel admin
- ✅ Voir logs (usage + admin)
- ✅ Créer/modifier/supprimer toutes les données

**Attribution:**
```javascript
// Via script Node.js
await admin.auth().setCustomUserClaims(uid, { admin: true });

// Ou via Firebase Console
// Authentication → Users → Custom Claims → {"admin": true}
```

---

### Role: USER
**Custom Claim:** (aucune)

**Permissions:**
- ✅ Voir son propre profil
- ✅ Créer/modifier/supprimer son pipeline
- ✅ Sauvegarder ses recherches
- ✅ Voir toutes les companies (pour recherche)
- ✅ Accéder au panel utilisateur
- ✗ Importer des entreprises
- ✗ Voir les logs
- ✗ Accéder au panel admin
- ✗ Modifier la configuration système

---

## 🚀 Guide de Déploiement (15 minutes)

### Étape 1: Configuration (2 min)
```bash
# Firebase CLI login
firebase login

# Utiliser le bon projet
firebase use your-project-id

# Vérifier .env est configuré
cat .env
```

### Étape 2: Initialiser Collections (2 min)
```bash
node FIRESTORE-INIT.js
```

**Résultat attendu:**
```
✅ Users collection initialized
✅ 3 companies initialized
✅ 4 configs initialized
✅ Firestore initialization completed successfully!
```

### Étape 3: Déployer Security Rules (3 min)
```bash
firebase deploy --only firestore:rules
```

**Résultat attendu:**
```
✔ firestore: rules compiled successfully
✔ firestore: released rules firestore.rules
✔ Deploy complete!
```

### Étape 4: Créer Indices (5 min)
```bash
firebase deploy --only firestore:indexes
```

Or create manually in Firebase Console → Firestore → Indexes

### Étape 5: Valider Setup (3 min)
```bash
node test-firebase-auth.js
```

**Résultat attendu:**
```
✓ Setup successful
✓ All tests passed
✓ Users found
✓ Companies found
✓ Collections initialized
```

---

## 📊 Données de Test Créées

### Utilisateurs
| Email | Password | Role | Plan |
|-------|----------|------|------|
| admin@salescompanion.cm | Admin@12345 | admin | enterprise |
| user@salescompanion.cm | User@12345 | user | starter |

### Entreprises (3)
1. Acme Construction SARL (BTP, Douala, Littoral)
2. TechHub Cameroon Inc (Informatique, Yaoundé, Centre)
3. Agro Export Cameroon Ltd (Agriculture, Kribi, Sud)

### Configuration (4)
- `app_version` = "2.0.0"
- `max_import_rows` = "5000"
- `maintenance_mode` = "false"
- `groq_api_key` = environment variable

### Prospects (Pipeline)
- 2 prospects ajoutés pour l'utilisateur test
- Statuts: prospection, negociation

### Recherchez Sauvegardées
- 1 recherche "BTP Douala" sauvegardée

---

## ✅ Checklist Déploiement

- [ ] Firebase project créé
- [ ] Service account JSON téléchargé
- [ ] Firebase CLI installé (`npm install -g firebase-tools`)
- [ ] `.env` configuré
- [ ] `firebase login` exécuté
- [ ] `firebase use your-project-id` exécuté
- [ ] `node FIRESTORE-INIT.js` exécuté
- [ ] `firebase deploy --only firestore:rules` exécuté
- [ ] `firebase deploy --only firestore:indexes` exécuté
- [ ] `node test-firebase-auth.js` réussi
- [ ] Collections visibles dans Firebase Console
- [ ] Utilisateurs test créés avec custom claims
- [ ] Server lancé: `npm start`
- [ ] Authentification testée via client

---

## 📚 Fichiers de Référence

| Fichier | Lire | Déployer | Tester |
|---------|------|----------|--------|
| FIRESTORE-COLLECTIONS.md | ✅ | - | - |
| FIRESTORE-DEPLOYMENT.md | ✅ | - | - |
| FIRESTORE-INIT.js | - | ✅ | - |
| firestore.rules | ✅ | ✅ | - |
| firestore.indexes.json | ✅ | ✅ | - |
| firebase.json | ✅ | - | - |
| test-firebase-auth.js | - | - | ✅ |

---

## 🎉 Résultat Final

**Une architecture Firestore 100% prête:**

✅ 6 collections bien structurées  
✅ Security Rules implémentées (2 rôles)  
✅ 7 indices pour la performance  
✅ 2 utilisateurs de test avec custom claims  
✅ 3 entreprises pour tester la recherche  
✅ 4 configurations système  
✅ Subcollection pipeline fonctionnelle  
✅ Logs audit en place  

**Temps total:** 15 minutes (installation + déploiement + test)

---

## 🚀 Prochaines Étapes

1. **Déployer les collections** → Suivre FIRESTORE-DEPLOYMENT.md
2. **Importer données réelles** → Via Excel import endpoint
3. **Configurer clients** → Mettre à jour config Firebase dans Electron/Mobile
4. **Tester authentification** → Signer avec admin/user test
5. **Lancer en production** → Docker + Cloud Run deployment

---

**Besoin d'aide?** → Voir FIRESTORE-DEPLOYMENT.md troubleshooting section
