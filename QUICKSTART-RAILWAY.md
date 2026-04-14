# ⚡ Quick Start — Railway en 10 Minutes

**Les étapes essentielles pour déployer SalesCompanion sur Railway**

---

## 1️⃣ Créer un Compte Railway (2 min)

```
Allez sur → https://railway.app
Cliquez → "Sign up with GitHub"
Autorisez Railway
```

---

## 2️⃣ Créer un Nouveau Projet (1 min)

```
Railway Dashboard → "New Project" → "Deploy from GitHub"
Sélectionnez votre repo "SalesCompanion"
Sélectionnez branche "main"
Railway détecte le Dockerfile automatiquement
```

---

## 3️⃣ Ajouter les Variables Firebase (5 min)

Railway Dashboard → **Variables** → Copiez chaque ligne:

### 🔑 Récupérer les Clés Firebase

1. Allez sur https://console.firebase.google.com
2. Projet → Settings → Service Accounts
3. **"Generate New Private Key"**
4. Un fichier JSON se télécharge
5. Ouvrez-le et copiez les données

### 📋 Variables à Ajouter

```
FIREBASE_PROJECT_ID = [vôtre du JSON]
FIREBASE_PRIVATE_KEY_ID = [du JSON]
FIREBASE_PRIVATE_KEY = [EXACTEMENT comme du JSON avec \n]
FIREBASE_CLIENT_EMAIL = [du JSON]
FIREBASE_CLIENT_ID = [du JSON]
FIREBASE_AUTH_URI = https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI = https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL = https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL = [du JSON]

NODE_ENV = production
```

---

## 4️⃣ Configurer le Build (1 min)

Railway Dashboard → **Settings**:

```
Root Directory: server
Start Command: node server-firebase.js
Build Command: npm install
```

---

## 5️⃣ Attendre le Deploy (2 min)

```
Build Logs → Vérifier qu'il n'y a pas d'erreurs
Deploy Logs → Vérifier que le serveur démarre
Runtime Logs → Vérifier qu'il tourne
```

---

## 6️⃣ Récupérer l'URL Publique

Railway Dashboard → votre service → **Deployments** → **Domain**

Vous voyez quelque chose comme:
```
https://salescompanion-prod-xxxxx-xxxxx.railway.app
```

---

## 7️⃣ Tester l'API

```bash
curl https://your-railway-url/health

# Réponse attendue:
{"status":"OK","timestamp":"..."}
```

---

## 8️⃣ Configurer le Client Electron

Modifiez `client/main.js`:

```javascript
// Avant:
const DEFAULT_SERVER = 'http://localhost:3210';

// Après:
const DEFAULT_SERVER = 'https://your-railway-url.railway.app';
```

---

## 9️⃣ Builder l'App (Optionnel)

```bash
cd client
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
```

Installers dans `client/dist/`

---

## ✅ C'est Fait!

Votre serveur est maintenant sur Railway et accessible depuis:
- ✅ Desktop app
- ✅ Mobile PWA
- ✅ API REST publique

---

## 📝 Prochaines Étapes

- [ ] [Guide Complet Railway](./RAILWAY-DEPLOYMENT.md)
- [ ] [Configuration Electron + Railway](./ELECTRON-RAILWAY-CONFIG.md)
- [ ] [Dépannage](./RAILWAY-DEPLOYMENT.md#-dépannage)
