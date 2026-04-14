# 🔐 Authentification + Firestore + Railway — Guide Complet

**Configuration complète et intégrée du projet SalesCompanion**

---

## 🎯 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT ELECTRON                           │
│  • Vue de connexion (email/password)                         │
│  • Token JWT Firebase stocké localement                      │
│  • Requêtes API avec token Bearer                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              RAILWAY SERVER (Production)                     │
│  • Express.js avec Express sur port 3210                     │
│  • Middleware d'authentification                             │
│  • Endpoints RESTful                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    ▼         ▼
        ┌──────────────────┐ ┌─────────────────┐
        │ FIREBASE AUTH    │ │ FIRESTORE       │
        │ • Sign-up        │ │ • Collections   │
        │ • Sign-in        │ │ • Documents     │
        │ • Tokens         │ │ • Real-time     │
        │ • Verification   │ │ • Queries       │
        └──────────────────┘ └─────────────────┘
                        (Google Cloud)
```

---

## 🔐 AUTHENTIFICATION FIREBASE

### 1. Flux de Connexion

```
┌─────────────────┐
│  Client Electron │
└────────┬────────┘
         │
         │ 1. Email + Password
         ▼
┌──────────────────────────┐
│  Firebase Auth           │
│  (Credentials validation) │
└────────┬─────────────────┘
         │
         │ 2. ID Token généré
         ▼
┌──────────────────────────┐
│  Client stocke token     │
│  ~/.config/SalesCompanion│
│  auth_token.txt          │
└────────┬─────────────────┘
         │
         │ 3. Requêtes avec token
         ▼
┌──────────────────────────┐
│  Railway Server          │
│  Middleware: verifyToken │
│  Valide le token JWT     │
└────────┬─────────────────┘
         │
         │ 4. Autorisation OK
         ▼
┌──────────────────────────┐
│  Firestore Database      │
│  Retourne les données    │
└──────────────────────────┘
```

---

### 2. Endpoints Authentification

#### POST `/auth/sign-up` — Créer un Compte

```bash
curl -X POST https://your-railway-app.railway.app/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

**Réponse (200):**
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4NzQ4ZmFkY2...",
  "message": "User created successfully"
}
```

#### POST `/auth/sign-in` — Se Connecter

```bash
curl -X POST https://your-railway-app.railway.app/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Réponse (200):**
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4NzQ4ZmFkY2...",
  "message": "Use Firebase client SDK for password"
}
```

#### GET `/auth/user` — Récupérer Profil

```bash
curl -X GET https://your-railway-app.railway.app/auth/user \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4NzQ4ZmFkY2..."
```

**Réponse (200):**
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "plan": "free",
  "createdAt": "2026-04-14T10:30:00Z"
}
```

#### POST `/auth/sign-out` — Déconnexion

```bash
curl -X POST https://your-railway-app.railway.app/auth/sign-out \
  -H "Authorization: Bearer <token>"
```

---

### 3. Token JWT Firebase

Le token JWT contient:

```json
{
  "iss": "https://securetoken.google.com/your-project-id",
  "aud": "your-project-id",
  "auth_time": 1618392800,
  "user_id": "firebase-user-id",
  "sub": "firebase-user-id",
  "iat": 1618392800,
  "exp": 1618396400,
  "firebase": {
    "identities": {
      "email": ["user@example.com"]
    },
    "sign_in_provider": "password"
  }
}
```

**Durée de validité:** 1 heure (3600 secondes)  
**Refresh:** Automatique par Firebase SDK

---

### 4. Middleware d'Authentification (Server)

```javascript
// server/firestore-operations.js
async function verifyToken(token) {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Usage dans les routes
app.get('/auth/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    const decodedToken = await verifyToken(token);
    const user = await getUser(decodedToken.uid);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
```

---

## 💾 FIRESTORE DATABASE

### 1. Structure des Collections

```
Firestore Database
├── users/
│   └── {userId}
│       ├── email: "user@example.com"
│       ├── name: "John Doe"
│       ├── plan: "free"
│       ├── credits: 100
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── companies/
│   └── {companyId}
│       ├── name: "AccionCam SARL"
│       ├── sector: "BTP et construction"
│       ├── phone: "+237123456789"
│       ├── email: "contact@accion.cm"
│       ├── location: "Yaounde"
│       ├── status: "contacted"
│       ├── owner: {userId}
│       ├── notes: "Bon prospect"
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── config/
│   └── {userId}
│       ├── apiKey: "gsk_..."
│       ├── theme: "dark"
│       ├── language: "fr"
│       └── notifications: true
│
└── logs/
    └── {logId}
        ├── userId: {userId}
        ├── action: "search_companies"
        ├── details: {...}
        ├── timestamp: Timestamp
        └── ip: "192.168.1.1"
```

---

### 2. Opérations CRUD

#### **CREATE — Créer une Entreprise**

```javascript
// server/firestore-operations.js
async function createCompany(companyData, userId) {
  const docRef = await db.collection('companies').add({
    ...companyData,
    owner: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { id: docRef.id, ...companyData };
}
```

**Endpoint API:**
```bash
curl -X POST https://your-railway-app.railway.app/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "AccionCam SARL",
    "sector": "BTP et construction",
    "phone": "+237123456789"
  }'
```

#### **READ — Récupérer les Données**

```javascript
async function searchCompanies(query, userId, limit = 20) {
  let q = db.collection('companies')
    .where('owner', '==', userId);
  
  if (query.sector) {
    q = q.where('sector', '==', query.sector);
  }
  
  if (query.search) {
    q = q.where('name', '>=', query.search)
        .where('name', '<=', query.search + '\uf8ff');
  }
  
  return await q.limit(limit).get();
}
```

**Endpoint API:**
```bash
curl "https://your-railway-app.railway.app/companies/search?sector=BTP&search=AccionCam" \
  -H "Authorization: Bearer <token>"
```

#### **UPDATE — Modifier une Entreprise**

```javascript
async function updateCompany(companyId, updates, userId) {
  await db.collection('companies')
    .doc(companyId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}
```

#### **DELETE — Supprimer une Entreprise**

```javascript
async function deleteCompany(companyId, userId) {
  await db.collection('companies').doc(companyId).delete();
}
```

---

### 3. Real-time Listeners (Client)

```javascript
// client/firebase-helpers.js
import { db } from './firebase-config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// Écouter les changements en temps réel
function listenToCompanies(userId, callback) {
  const q = query(
    collection(db, 'companies'),
    where('owner', '==', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const companies = [];
    snapshot.forEach((doc) => {
      companies.push({ id: doc.id, ...doc.data() });
    });
    callback(companies);
  });
}

// Usage dans Electron
listenToCompanies(userId, (companies) => {
  console.log('Companies updated:', companies);
  // Mettre à jour l'UI
});
```

---

### 4. Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Authentification requise
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Utilisateur peut voir/modifier ses propres entreprises
    match /companies/{companyId} {
      allow read, write: if request.auth.uid == resource.data.owner;
      allow create: if request.auth.uid == request.resource.data.owner;
    }
    
    // Configuration utilisateur
    match /config/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Logs (lecture seule pour audit)
    match /logs/{logId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if request.auth.uid != null;
    }
  }
}
```

---

## 🚂 RAILWAY SERVER

### 1. Architecture du Serveur

```javascript
// server/server-firebase.js
const express = require('express');
const { verifyToken, verifyAdmin } = require('./firestore-operations');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes d'authentification (PUBLIC)
app.post('/auth/sign-up', signUp);
app.post('/auth/sign-in', signIn);
app.post('/auth/password-reset', passwordReset);

// Routes utilisateur (PROTÉGÉ)
app.get('/auth/user', verifyToken, getUser);
app.post('/auth/sign-out', verifyToken, signOut);

// Routes entreprises (PROTÉGÉ)
app.get('/companies/search', verifyToken, searchCompanies);
app.post('/companies/import', verifyToken, importCompanies);
app.patch('/companies/:id', verifyToken, updateCompany);
app.delete('/companies/:id', verifyToken, deleteCompany);

// Routes configuration (PROTÉGÉ)
app.get('/config', verifyToken, getConfig);
app.post('/config', verifyToken, setConfig);

// Routes admin (ADMIN SEULEMENT)
app.get('/admin/users', verifyAdmin, getAllUsers);
app.get('/admin/stats', verifyAdmin, getStats);

// Health check (PUBLIC)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 3210;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

### 2. Variables d'Environnement Railway

Configurez sur le dashboard Railway:

```
# Firebase Admin SDK
FIREBASE_PROJECT_ID = your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID = your-private-key-id
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID = your-client-id
FIREBASE_AUTH_URI = https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI = https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL = https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL = https://www.googleapis.com/certificates/...

# Server configuration
NODE_ENV = production
PORT = 3210

# Optional
GROQ_API_KEY = gsk_your_key_here
```

---

### 3. Volume de Déploiement Railway

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3210:3210"
    environment:
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3210/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### 4. Logs et Monitoring

**Voir les logs en temps réel:**

Railway Dashboard → **Logs** → filtre par service

```
2026-04-14 14:32:15 [INFO] User created: uid=xyz123
2026-04-14 14:32:18 [INFO] Sign-in: user@example.com | uid=xyz123
2026-04-14 14:32:25 [INFO] Search companies: sector=BTP | found=45
2026-04-14 14:32:30 [INFO] Import: 250 companies | Success
```

---

## 🔄 Flux Complet: Utilisateur → Auth → Firestore → Railway

### Scénario: Un utilisateur se connecte et recherche des entreprises

```
1. UTILISATEUR OUVRE CLIENT ELECTRON
   ├─ Client détecte: pas de token
   ├─ Affiche: Page de connexion
   └─ Utilisateur entre: email + password

2. CLIENT ENVOIE: POST /auth/sign-in
   ├─ Headers: { "Content-Type": "application/json" }
   └─ Body: { "email": "...", "password": "..." }

3. RAILWAY SERVEUR REÇOIT
   ├─ Valide l'email format
   ├─ Appelle Firebase Auth
   └─ Firebase retourne: { uid, idToken, expiresIn }

4. RAILWAY RETOURNE: { idToken, uid }
   └─ Client stocke token dans: ~/.config/SalesCompanion/auth_token.txt

5. UTILISATEUR CLIQUE: "Rechercher entreprises"
   ├─ Client lit le token
   ├─ Envoie: GET /companies/search?sector=BTP
   └─ Headers: { "Authorization": "Bearer <token>" }

6. RAILWAY VALIDE LE TOKEN
   ├─ Middleware verifyToken exécuté
   ├─ Décode le JWT
   ├─ Vérifie la signature (clé publique Firebase)
   ├─ Extrait : uid du token
   └─ Autorise la requête

7. RAILWAY REQUÊTE FIRESTORE
   ├─ Query: companies where owner == uid AND sector == 'BTP'
   ├─ Applique Firestore Security Rules
   └─ Retourne: 45 entreprises

8. RAILWAY RETOURNE: [ { name, sector, phone, ... }, ... ]
   └─ Client affiche les résultats dans l'UI
```

---

## 🚀 Checklist de Configuration

### Firebase Setup
- [ ] Créer Firebase Project sur console.firebase.google.com
- [ ] Activer Email/Password authentication
- [ ] Télécharger service account JSON
- [ ] Créer Firestore Database
- [ ] Ajouter Firestore Security Rules

### Railway Setup
- [ ] Créer compte Railway.app
- [ ] Créer nouveau projet depuis GitHub
- [ ] Ajouter toutes les variables d'environnement Firebase
- [ ] Vérifier que le Dockerfile sont présent
- [ ] Configurer root directory: `server`
- [ ] Activer auto-deploy depuis GitHub

### Client Configuration
- [ ] Modifier DEFAULT_SERVER dans client/main.js
- [ ] Tester connexion locale d'abord
- [ ] Builder l'app pour production
- [ ] Tester depuis Railway URL

### Tests
- [ ] [ ] Tester `/health` endpoint
- [ ] [ ] Tester `/auth/sign-up`
- [ ] [ ] Tester `/auth/sign-in`
- [ ] [ ] Tester `/companies/search` avec token
- [ ] [ ] Tester import Excel
- [ ] [ ] Vérifier Firestore logs

---

## 📊 Endpoints API Complète

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/auth/sign-up` | ❌ | Créer compte |
| POST | `/auth/sign-in` | ❌ | Se connecter |
| PUT | `/auth/password-reset` | ❌ | Réinitialiser mot de passe |
| GET | `/auth/user` | ✅ | Profil utilisateur |
| POST | `/auth/sign-out` | ✅ | Déconnexion |
| GET | `/companies/search` | ✅ | Chercher entreprises |
| POST | `/companies` | ✅ | Créer entreprise |
| POST | `/companies/import` | ✅ | Importer Excel |
| PATCH | `/companies/:id` | ✅ | Modifier entreprise |
| DELETE | `/companies/:id` | ✅ | Supprimer entreprise |
| GET | `/config` | ✅ | Config utilisateur |
| POST | `/config` | ✅ | Sauvegarder config |
| GET | `/admin/users` | 🔐 | Tous utilisateurs (admin) |
| GET | `/admin/stats` | 🔐 | Statistiques (admin) |
| GET | `/health` | ❌ | Status du serveur |

**Légende:** ❌ = Public | ✅ = Authentification requise | 🔐 = Admin seulement

---

## 🎯 Prochaines Étapes

1. **Suivre [QUICKSTART-RAILWAY.md](./QUICKSTART-RAILWAY.md)** (10 min)
2. **Tester tous les endpoints** avec curl
3. **Builder et déployer l'app Electron**
4. **Finir la configuration mobile PWA**
5. **Ajouter monitoring et alertes**

---

**Questions?** Consultez les guides détaillés:
- [RAILWAY-DEPLOYMENT.md](./RAILWAY-DEPLOYMENT.md)
- [FIREBASE-MIGRATION.md](./FIREBASE-MIGRATION.md)
- [API-ENDPOINTS.md](./API-ENDPOINTS.md)
