# 📘 Guide Complet — Déploiement Firestore Collections

Bienvenue dans le guide de déploiement des collections Firestore pour **Sales Companion v2.0**!

## 📋 Table des Matières

1. [Avant de commencer](#avant-de-commencer)
2. [Étape 1: Configuration Firebase](#étape-1--configuration-firebase)
3. [Étape 2: Initialisation des collections](#étape-2--initialisation-des-collections)
4. [Étape 3: Déploiement des Security Rules](#étape-3--déploiement-des-security-rules)
5. [Étape 4: Création des indices](#étape-4--création-des-indices)
6. [Étape 5: Test & Validation](#étape-5--test--validation)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Avant de Commencer

### Prérequis

- [ ] Firebase project créé ([firebase.google.com](https://firebase.google.com))
- [ ] Firebase CLI installé: `npm install -g firebase-tools`
- [ ] Node.js v16+ installé
- [ ] Firestore database initialisée en mode "production"
- [ ] Firebase Authentication activée
- [ ] ServiceAccount JSON téléchargé depuis Firebase Console
- [ ] Fichier `.env` configuré au root du projet

### Fichiers Nécessaires

✓ Déjà créés dans ce projet:
- `FIRESTORE-INIT.js` — Script d'initialisation des collections
- `firestore.rules` — Règles de sécurité Firestore
- `firestore.indexes.json` — Configuration des indices
- `firebase.json` — Configuration Firebase CLI
- `FIRESTORE-COLLECTIONS.md` — Documentation du schéma

---

## 🚀 Étape 1: Configuration Firebase

### 1.1 Télécharger le fichier de ServiceAccount

```bash
# Aller à Firebase Console
# 1. Cliquer sur ⚙️ (Settings) en haut à droite
# 2. Aller à "Service accounts"
# 3. Cliquer "Generate new private key"
# 4. Sauvegarder le fichier JSON
```

### 1.2 Placer le fichier ServiceAccount

```bash
# Copier le fichier ServiceAccount au root du projet
# SI le fichier est nommé "firebase-service-account.json"
# Il sera automatiquement détecté par FIRESTORE-INIT.js

cp ~/Downloads/serviceAccountKey.json ./firebase-service-account.json
```

### 1.3 Mettre à jour le .env

```bash
# Éditer le fichier .env à la root du projet
# Ajouter les valeurs de Firebase Console (Project Settings → Web config)

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id

# Pour la clé API Groq (optionnel)
GROQ_API_KEY=your-groq-api-key
```

### 1.4 Initialiser Firebase CLI

```bash
# Depuis le root du projet
firebase login

# Vérifier la configuration
firebase projects:list

# Utiliser le bon projet
firebase use your-project-id
```

---

## 🗂️ Étape 2: Initialisation des Collections

### 2.1 Installer les dépendances

```bash
# Depuis le root du projet
npm install

# Vérifier que firebase-admin est installé
npm list firebase-admin
```

### 2.2 Lancer le script d'initialisation

```bash
# Depuis le root du projet
node FIRESTORE-INIT.js
```

**Résultat attendu:**
```
🚀 Starting Firestore Initialization...

📝 Initializing Users Collection...
  ↳ Creating admin user...
  ✓ Admin user created: abc123xyz
  ↳ Creating regular user...
  ✓ Regular user created: def456uvw
✅ Users collection initialized

📝 Initializing Companies Collection...
  ↳ Company added: Acme Construction SARL
  ↳ Company added: TechHub Cameroon Inc
  ↳ Company added: Agro Export Cameroon Ltd
✅ 3 companies initialized

📝 Initializing Config Collection...
  ↳ Config added: app_version
  ↳ Config added: max_import_rows
  ↳ Config added: maintenance_mode
  ↳ Config added: groq_api_key
✅ 4 configs initialized

📝 Initializing User Pipeline (subcollection)...
  ↳ Prospect added: Acme Construction SARL (prospection)
  ↳ Prospect added: TechHub Cameroon Inc (negociation)
✅ 2 prospects added to pipeline

📝 Initializing Saved Searches...
✅ Saved search initialized

✅ Firestore initialization completed successfully!

🔑 Test Credentials:
  Admin:
    Email:    admin@salescompanion.cm
    Password: Admin@12345
  Regular User:
    Email:    user@salescompanion.cm
    Password: User@12345
```

---

## 🔐 Étape 3: Déploiement des Security Rules

### 3.1 Vérifier les règles

```bash
# Afficher le contenu des règles
cat firestore.rules

# Ou ouvrir dans VS Code
code firestore.rules
```

### 3.2 Déployer les règles

```bash
# Déployer UNIQUEMENT les Security Rules (recommandé)
firebase deploy --only firestore:rules

# Ou déployer tout (rules + indexes)
firebase deploy
```

**Résultat attendu:**
```
=== Deploying to 'your-project-id' ...

i  firebase: using project your-project-id
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules compiled successfully
i  firestore: uploading rules firestore.rules...
✔  firestore: released rules firestore.rules

✔  Deploy complete!
```

### 3.3 Vérifier les règles dans Firebase Console

```
Firebase Console → Firestore → Rules
→ Vérifier que le nouveau contenu est visible
```

---

## 📊 Étape 4: Création des Indices

### 4.1 Vérifier les indices recommandés

```bash
# Les indices sont définis dans firestore.indexes.json
cat firestore.indexes.json
```

### 4.2 Option A: Déployer via Firebase CLI

```bash
# Firebase créera automatiquement les indices
firebase deploy --only firestore:indexes
```

### 4.3 Option B: Créer manuellement (si erreur)

Aller à Firebase Console → Firestore → Indexes → Composite Indexes

Créer les indices suivants:

**Index 1: companies (sector, region, active)**
- Collection: `companies`
- Fields: `sector` (Ascending), `region` (Ascending), `active` (Ascending)

**Index 2: companies (active, created_at)**
- Collection: `companies`
- Fields: `active` (Ascending), `created_at` (Ascending)

**Index 3: saved_searches (uid, created_at)**
- Collection: `saved_searches`
- Fields: `uid` (Ascending), `created_at` (Descending)

**Index 4: usage_logs (user_id, timestamp)**
- Collection: `usage_logs`
- Fields: `user_id` (Ascending), `timestamp` (Descending)

**Index 5: usage_logs (action, timestamp)**
- Collection: `usage_logs`
- Fields: `action` (Ascending), `timestamp` (Descending)

**Index 6: admin_logs (admin_id, timestamp)**
- Collection: `admin_logs`
- Fields: `admin_id` (Ascending), `timestamp` (Descending)

**Index 7: pipeline (status, updated_at)**
- Collection: `users/{uid}/pipeline`
- Fields: `status` (Ascending), `updated_at` (Descending)

---

## ✔️ Étape 5: Test & Validation

### 5.1 Tester l'authentification

```bash
# Créer un fichier test-auth.js
cat > test-auth.js << 'EOF'
const admin = require('firebase-admin');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Initialize
const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT || 
                       path.join(__dirname, 'firebase-service-account.json');

if (fs.existsSync(credentialPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(credentialPath))
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function testAuth() {
  console.log('🧪 Testing Firebase Authentication...\n');
  
  try {
    // Test 1: Get admin user
    console.log('Test 1: Récupérer l\'utilisateur admin');
    const adminUser = await auth.getUserByEmail('admin@salescompanion.cm');
    console.log('✓ Admin user:', adminUser.uid);
    console.log('  Claims:', adminUser.customClaims);
    
    // Test 2: Get regular user
    console.log('\nTest 2: Récupérer l\'utilisateur régulier');
    const regularUser = await auth.getUserByEmail('user@salescompanion.cm');
    console.log('✓ Regular user:', regularUser.uid);
    console.log('  Claims:', regularUser.customClaims);
    
    // Test 3: Read users collection
    console.log('\nTest 3: Lire la collection users');
    const usersSnapshot = await db.collection('users').get();
    console.log(`✓ Total users: ${usersSnapshot.size}`);
    usersSnapshot.forEach(doc => {
      console.log(`  - ${doc.data().email} (${doc.data().role})`);
    });
    
    // Test 4: Read companies collection
    console.log('\nTest 4: Lire la collection companies');
    const companiesSnapshot = await db.collection('companies').get();
    console.log(`✓ Total companies: ${companiesSnapshot.size}`);
    companiesSnapshot.forEach(doc => {
      console.log(`  - ${doc.data().raison_sociale}`);
    });
    
    // Test 5: Test subcollection pipeline
    console.log('\nTest 5: Lire la sous-collection pipeline');
    const pipelineSnapshot = await db.collection('users')
      .doc(regularUser.uid)
      .collection('pipeline')
      .get();
    console.log(`✓ Total prospects: ${pipelineSnapshot.size}`);
    pipelineSnapshot.forEach(doc => {
      console.log(`  - ${doc.data().company_name} (${doc.data().status})`);
    });
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

testAuth();
EOF

node test-auth.js
```

### 5.2 Tester les Security Rules (Firebase Emulator - optionnel)

```bash
# Démarrer l'émulateur Firebase
firebase emulators:start

# Accès: http://localhost:4000
```

### 5.3 Vérifier dans Firebase Console

```
1. Aller à Firebase Console
2. Firestore Database
3. Vérifier les collections:
   ✓ users
   ✓ companies
   ✓ config
   ✓ saved_searches
   ✓ admin_logs
4. Cliquer sur /users/{uid}/pipeline pour voir la subcollection
5. Aller à Indexes et vérifier que les indices sont "Enabled"
```

### 5.4 Tester l'authentification client

```bash
# Démarrer le serveur
npm start

# Dans un autre terminal, tester avec curl
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@salescompanion.cm",
    "password": "User@12345"
  }'

# Vous devriez recevoir:
# {"uid": "...", "email": "user@salescompanion.cm"}
```

---

## 🚨 Troubleshooting

### Erreur: "Permission denied"

```
Cause: Les Security Rules ne sont pas correctement déployées
Solution:
1. Vérifier les règles: firebase deploy --only firestore:rules
2. Attendre quelques secondes (propagation)
3. Rafraîchir la page Firebase Console
```

### Erreur: "FIRST_NOT_FOUND" ou "Index required"

```
Cause: Les indices ne sont pas créés
Solution:
1. Aller à Firebase Console → Firestore → Indexes
2. Créer les indices manquants manuellement
3. Ou: firebase deploy --only firestore:indexes
```

### Erreur: "ServiceAccount not found"

```
Cause: Le fichier firebase-service-account.json est manquant
Solution:
1. Télécharger depuis Firebase Console → Settings → Service Accounts
2. Placer au root du projet
3. Ou configurer FIREBASE_SERVICE_ACCOUNT dans .env
```

### Les utilisateurs de test n'existent pas

```
Solution:
1. Lancer à nouveau: node FIRESTORE-INIT.js
2. Utiliser les identifiants de test fournis
3. Ou créer manuellement dans Firebase Console → Authentication
```

### Collections vides

```
Solution:
1. Vérifier la configuration Firebase CLI: firebase projects:list
2. Utiliser le bon projet: firebase use your-project-id
3. Lancer à nouveau: node FIRESTORE-INIT.js --verbose
4. Ou créer manuellement via Firebase Console
```

---

## 📚 Ressources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Reference](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Custom Claims Usage](https://firebase.google.com/docs/auth/admin/custom-claims)

---

## ✅ Checklist Complète

- [ ] ServiceAccount téléchargé et placé au root
- [ ] `.env` configuré avec les valeurs Firebase
- [ ] `npm install` exécuté
- [ ] `firebase login` et `firebase use` exécutés
- [ ] `node FIRESTORE-INIT.js` exécuté avec succès
- [ ] `firebase deploy --only firestore:rules` exécuté
- [ ] `firebase deploy --only firestore:indexes` exécuté
- [ ] Indices vérifiés dans Firebase Console (Enabled)
- [ ] Test authentification réussi avec `test-auth.js`
- [ ] Collections visibles dans Firebase Console
- [ ] Utilisateurs de test créés et vérifiés
- [ ] Server lancé et testé: `npm start`

---

## 🎉 Déploiement Réussi!

Si toutes les étapes sont complètes, votre Firestore est maintenant:

✅ **Configurée** avec les collections correct structure
✅ **Sécurisée** avec les Security Rules
✅ **Optimisée** avec les indices appropriés
✅ **Peuplée** avec les données de test

Vous pouvez maintenant:

- 🚀 Lancer l'application: `npm start`
- 📱 Tester sur Electron ou Mobile PWA
- 📊 Importer les données réelles d'entreprises
- 👤 Créer des utilisateurs supplémentaires
- ⚙️ Configurer les paramètres système
