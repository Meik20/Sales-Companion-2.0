# 🔧 Guide d'Intégration Firebase au Code Existant

## 📝 Fichiers Créés

```
server/
├── firebase-config.js           # Initialisation Firebase Admin SDK
├── firestore-operations.js      # Opérations Firestore et Auth
├── server-firebase.js           # Serveur principal migrés vers Firebase
├── .env.example                 # Variables d'environnement
├── Dockerfile                   # Container pour déploiement
└── firebase-service-account.json # ⚠️ À créer (credentials)

client/
├── firebase-config.js           # Config Web SDK
├── firebase-helpers.js          # Helper functions pour client
├── preload-firebase.js          # Preload adapté pour Electron
└── (index.html)                 # À mettre à jour

mobile/
├── firebase-config.js           # Config PWA
├── manifest.json                # (À mettre à jour)
└── index.html                   # (À mettre à jour)

./
├── docker-compose.yml           # Stack Docker complète
├── .gitignore                   # Ignorer les credentials
└── FIREBASE-MIGRATION.md        # Guide step-by-step
```

---

## ✅ Étapes d'Intégration

### 1. Configuration Firebase

**Fichier:** `server/firebase-config.js`

Ce fichier initialise l'Admin SDK. Il suffit d'avoir les credentials :

```javascript
// .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
...
```

### 2. Dépendances Backend

**À faire:**
```bash
cd server
npm install
npm install firebase-admin dotenv
```

**package.json updated:**
- ❌ Supprimé: `bcryptjs`, `better-sqlite3`, `jsonwebtoken`
- ✅ Ajouté: `firebase-admin`, `dotenv`, `axios`

### 3. Adapter le Stock Frontend

#### Pour Electron:

**Remplacer l'ancien preload.js:**
```javascript
// client/preload.js → remplacer par preload-firebase.js  
// Ou adapter le preload.js existant avec les nouvelles APIs
```

**S'assurer que main.js utilise le nouveau preload:**
```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload-firebase.js'),
}
```

#### Pour Mobile PWA:

**Ajouter Firebase SDK dans index.html:**
```html
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
<script src="./firebase-config.js"></script>
```

### 4. Adapter les Routes API

**Ancien (SQLite + JWT local):**
```javascript
app.post('/auth/login', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);
  const token = jwt.sign({uid: user.id}, JWT_SECRET);
});
```

**Nouveau (Firebase):**
```javascript
app.post('/auth/sign-up', async (req, res) => {
  const user = await createUser(req.body.email, req.body.password);
  res.json({uid: user.uid});
});

app.get('/api/protected', verifyToken, async (req, res) => {
  // req.userId déjà défini par middleware
});
```

### 5. Adapter le Code Client

#### Avant (localStorage + JWT local):
```javascript
const token = localStorage.getItem('jwt_token');
fetch('/api/companies', {
  headers: {'Authorization': `Bearer ${token}`}
});
```

#### Après (Firebase + Firestore):
```javascript
import { auth, db } from './firebase-config.js';
import { signIn, searchCompanies } from './firebase-helpers.js';

// Authentification
const {uid, token} = await signIn(email, password);

// Firestore
const companies = await searchCompanies({sector: 'BTP'});

// Ou requête API (token automatique)
const token = await auth.currentUser.getIdToken();
fetch('/api/companies/search', {
  headers: {'Authorization': `Bearer ${token}`}
});
```

---

## 🔄 Migration des Données (SQLite → Firestore)

### Script de Migration

Créez `server/migrate-sqlite-to-firestore.js`:

```javascript
const Database = require('better-sqlite3');
const { db } = require('./firebase-config');

const sqliteDb = new Database('sales_companion.db');

async function migrateCompanies() {
  const companies = sqliteDb.prepare('SELECT * FROM companies').all();
  const batch = db.batch();
  
  for (const company of companies) {
    const ref = db.collection('companies').doc();
    batch.set(ref, {
      raisonSociale: company.raison_sociale,
      niu: company.niu,
      // ... mapper tous les champs
    });
  }
  
  await batch.commit();
  console.log('✅ Companies migrated');
}

// Exécuter: node migrate-sqlite-to-firestore.js
```

---

## 🌐 Déploiement

### Option 1: Docker Compose (Développement)
```bash
docker-compose up -d backend
# Serveur sur http://localhost:3210
```

### Option 2: Cloud Run (Production)
```dockerfile
# Dockerfile est prêt
docker build -t sales-companion:latest ./server
docker tag sales-companion:latest gcr.io/your-project/sales-companion
docker push gcr.io/your-project/sales-companion

# Deploy
gcloud run deploy sales-companion \
  --image gcr.io/your-project/sales-companion \
  --set-env-vars FIREBASE_PROJECT_ID=your-project
```

### Option 3: Cloud Functions (Serverless)
```bash
firebase deploy --only functions
```

---

## 🔒 Sécurité

### ✅ À Vérifier

1. **Credentials:**
   - ✅ `firebase-service-account.json` dans `.gitignore`
   - ✅ Variables d'env dans `.env` (non versionné)
   - ✅ Cloud Run/Functions utilisent des secrets

2. **Authentification:**
   - ✅ Token Firebase validé côté serveur (`verifyToken`)
   - ✅ Custom claims pour rôles admin (`verifyAdmin`)
   - ✅ Tokens expirés après 1h (Firebase default)

3. **Firestore Rules:**
   - ✅ Users ne peuvent read/write que leurs documents
   - ✅ Companies en lecture seule
   - ✅ Config/admin en écriture admin only

---

## 📊 Checklist Finale

- [ ] Credentials Firebase configurés (`.env` ou Cloud Run secrets)
- [ ] `npm install` exécuté dans `server/`
- [ ] `server-firebase.js` testés en local
- [ ] Preload Electron adapté ou remplacé
- [ ] SDK Firebase ajouté à index.html (Electron + Mobile)
- [ ] Ancienne DB SQLite sauvegardée avant migration
- [ ] Données migrées vers Firestore
- [ ] Règles Firestore déployées
- [ ] Test authentification sign-up/sign-in
- [ ] Test recherche entreprises
- [ ] Test import Excel (admin)
- [ ] Docker build et test en local
- [ ] Variables d'env documentées

---

## 🆘 Troubleshooting

### "Firebase initialization failed"
```bash
# Vérifier credentials
cat .env | grep FIREBASE_PROJECT_ID

# Vérifier synthaxe JSON
node -e "require('./firebase-service-account.json')" 2>&1 | head
```

### "Permission denied on Firestore"
```javascript
// Vérifier que l'utilisateur est auth
const user = await getCurrentUser();
console.log(user?.uid); // Doit être défini

// Vérifier les règles Firestore console
```

### "Token expired"
```javascript
// Firebase refresh automatiquement, mais au besoin:
auth.onIdTokenChanged(async (user) => {
  if (user) {
    const token = await user.getIdToken();
    // Sauvegarder token si nécessaire
  }
});
```

---

## 📚 Ressources

- **Files docs:** FIREBASE-MIGRATION.md
- **Server:** server/firebase-config.js (config), server/firestore-operations.js (API)
- **Client:** client/firebase-helpers.js (functions)
- **Docker:** docker-compose.yml
