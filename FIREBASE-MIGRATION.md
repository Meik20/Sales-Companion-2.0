# 🔥 Migration Firebase — SalesCompanion v2.0

## Vue d'ensemble
Le projet SalesCompanion passe de **SQLite + JWT local** à **Firebase Authentication + Firestore**.

### ✅ Avantages Firebase
- 🔐 Authentification robuste et sécurisée
- ☁️ Base de données distribuée et scalable
- 📱 Support multi-plateforme natif
- 🌍 Réplication mondiale des données
- 💰 Modèle de coûts pay-as-you-go
- 🔄 Real-time synchronization

---

## 📋 Configuration Initiale

### 1. Créer un projet Firebase

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez **"Créer un projet"**
3. Entrez le nom : `sales-companion`
4. Acceptez les conditions et créez

### 2. Générer les credentials

#### Pour le Backend (Admin SDK)
1. Allez dans **Paramètres du projet** → **Comptes de service**
2. Cliquez **"Générer une nouvelle clé privée"** → JSON
3. Sauvegardez le fichier sous `server/firebase-service-account.json`

#### Pour le Frontend (Web SDK)
1. Allez dans **Paramètres du projet** → **Vos applications** → Web
2. Copiez la configuration Firebase
3. Sauvegardez les credentials dans le `.env`

### 3. Configurer l'authentification

#### Activer les méthodes
1. **Authentication** → **Méthode de connexion**
2. Activez :
   - ✅ Email/Mot de passe
   - ✅ Google (optionnel)
   - ✅ GitHub (optionnel)

#### Configurer les domaines autorisés
1. **Authentication** → **Paramètres**
2. Ajouter sous **Domaines autorisés** :
   - `localhost:3000`
   - `localhost:5173`
   - Votre domaine production
   - IP locale (ex: `192.168.1.10:3210`)

### 4. Créer la base Firestore

1. **Firestore Database** → **Créer une base de données**
2. Sélectionnez le mode : **Démarrer en mode test** (pour développement seulement)
3. Région : Sélectionnez `europe-west1` ou plus proche

#### Configurer la sécurité (Règles Firestore)
Remplacez les règles par défaut avec :

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own document only
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      
      // Subcollection: pipeline
      match /pipeline/{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
    }

    // Public companies (read-only)
    match /companies/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }

    // Config (admin only)
    match /config/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }

    // Usage logs
    match /usage_logs/{document=**} {
      allow write: if request.auth != null;
      allow read: if request.auth.token.admin == true;
    }

    // Saved searches
    match /saved_searches/{document=**} {
      allow read, write: if request.auth.uid == resource.data.uid;
      allow create: if request.auth.uid == request.resource.data.uid;
    }
  }
}
```

---

## 🔧 Installation & Démarrage

### Backend
```bash
cd server
npm install
# Copier firebase-service-account.json dans le répertoire
cp /chemin/vers/firebase-service-account.json ./

# Configuration des variables d'environnement
cp .env.example .env
# Éditer .env avec vos credentials Firebase
nano .env

# Démarrer le serveur
node server-firebase.js
```

### Frontend Electron
```bash
cd client
npm install firebase
npm start
```

### Frontend Mobile PWA
1. Ouvrir `http://localhost:3210/mobile`
2. L'application sera chargée depuis le serveur

---

## 📊 Structure Firestore

### Collections & Documents

```
firestore/
├── users/{uid}/
│   ├── email
│   ├── name
│   ├── plan (free/starter/pro/enterprise)
│   ├── dailyLimit
│   ├── dailyUsed
│   ├── lastReset
│   ├── active
│   ├── createdAt
│   └─ pipeline/ (subcollection)
│       ├── {prospectId}
│       │   ├── companyName
│       │   ├── status (prospection/qualified/negotiation/closed)
│       │   ├── note
│       │   ├── nextAction
│       │   ├── nextDate
│       │   ├── createdAt
│       │   └─ updatedAt
│
├── companies/{companyId}/
│   ├── raisonSociale
│   ├── sigle
│   ├── niu (index unique)
│   ├── sector
│   ├── region
│   ├── city
│   ├── telephone
│   ├── email
│   ├── siteWeb
│   ├── dirigeant
│   ├── active
│   └─ importedAt
│
├── config/{key}/
│   ├── value
│   └─ updatedAt
│
├── usage_logs/{logId}/
│   ├── userId
│   ├── query
│   ├── resultsCount
│   └─ timestamp
│
└── saved_searches/{searchId}/
    ├── uid
    ├── title
    ├── query
    ├── filters
    ├── results
    └─ createdAt
```

---

## 🔐 Authentification

### Sign Up (Inscription)
```javascript
// Client
const { auth } = window.firebase;

await auth.createUserWithEmailAndPassword(email, password);
const token = await auth.currentUser.getIdToken();
```

### Sign In (Connexion)
```javascript
const userCredential = await auth.signInWithEmailAndPassword(email, password);
const token = await userCredential.user.getIdToken();

// Sauvegarder le token
localStorage.setItem('firebase_token', token);
```

### Utiliser le token pour les requêtes API
```javascript
const response = await fetch('/api/companies/search', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🚀 Déploiement

### Backend (Cloud Run)
```bash
# Build container
docker build -t sales-companion-server .

# Deploy to Google Cloud Run
gcloud run deploy sales-companion-server \
  --image sales-companion-server \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id
```

### Frontend Electron
```bash
cd client
npm run build:win  # Windows
npm run build:mac  # macOS
npm run build:linux # Linux
```

### Mobile PWA (Firebase Hosting)
```bash
firebase deploy
```

---

## 📈 Coûts Firebase

### Plan Gratuit
- ✅ 50k lectures/jour
- ✅ 20k écritures/jour
- ✅ 1GB stockage
- ✅ 10GB transfers/mois

### Bonnes pratiques
1. **Indexer les requêtes fréquentes** → Performance
2. **Limiter les reads** → Factures moins élevées
3. **Batch operations** → Économiser les écritures
4. **Enable offline persistence** → Moins de requêtes

---

## ⚠️ Points de Migration

### Ce qui change
- ❌ SQLite → ✅ Firestore
- ❌ JWT local → ✅ Firebase Auth
- ❌ Bcrypt → ✅ Firebase managed
- ❌ Express routes → ✅ Cloud Functions (optionnel)

### Ce qui reste
- ✅ Structure des données (adaptée)
- ✅ Routes API
- ✅ UI/UX identique
- ✅ Fonctionnalités métier

---

## 🔍 Troubleshooting

### "Firestore database not accessible"
```bash
# Vérifier que Firestore est activé
firebase emulators:start  # Pour tester localement
```

### "Token expired"
```javascript
// Refresh token automatiquement
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const newToken = await user.getIdToken();
    localStorage.setItem('firebase_token', newToken);
  }
});
```

### "Permission denied"
- Vérifier les règles Firestore
- Vérifier que l'utilisateur est authentifié
- Vérifier les custom claims pour admin

---

## 📚 Ressources

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
