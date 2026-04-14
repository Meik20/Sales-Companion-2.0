# 🚂 Déploiement sur Railway

**Guide complet pour déployer SalesCompanion Server sur Railway.app**

---

## 📋 Prérequis

- ✅ Compte [Railway.app](https://railway.app) (gratuit)
- ✅ Repository GitHub avec le code
- ✅ Firebase project setup (voir [FIREBASE-MIGRATION.md](./FIREBASE-MIGRATION.md))
- ✅ Clé API Groq (optionnel mais recommandé)

---

## 🚀 ÉTAPE 1 — Créer un Compte Railway

1. Allez sur **https://railway.app**
2. Cliquez sur **"Start Project"**
3. Connectez avec **GitHub** (recommended) ou email
4. Autorisez Railway à lire vos repositories GitHub

---

## 📦 ÉTAPE 2 — Créer un Nouveau Projet

### Option A: Deploy depuis GitHub (Recommandé)

1. Dans Railway dashboard, cliquez **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Sélectionnez votre repository `SalesCompanion`
4. Sélectionnez la branche (main/master)
5. Railway détecte automatiquement le `Dockerfile`

### Option B: Deploy depuis Docker

1. Cliquez **"New Project"** → **"Add Service"** → **"Docker Image"**
2. Connectez votre repository GitHub

### Option C: Deploy depuis CLI (Advanced)

```bash
# Installation Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy depuis le dossier server
cd server
railway up
```

---

## ⚙️ ÉTAPE 3 — Configuration des Variables d'Environnement

### ✨ Étape par Étape

1. **Allez** dans Railway Dashboard → votre projet → **Variables**
2. **Cliquez** sur **"Add Variable"**
3. **Copiez-collez** chaque ligne ci-dessous:

### 🔥 Firebase Admin SDK Variables

```
FIREBASE_PROJECT_ID = your-project-id
FIREBASE_PRIVATE_KEY_ID = your-private-key-id
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID = your-client-id
FIREBASE_AUTH_URI = https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI = https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL = https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL = https://www.googleapis.com/certificates/...
```

### 📝 Autres Variables

```
NODE_ENV = production
PORT = 3210
GROQ_API_KEY = gsk_your_api_key_here (optionnel)
```

---

## ⚠️ IMPORTANT: Formater FIREBASE_PRIVATE_KEY

Railway a besoin que les newlines soient échappées. Voici comment faire:

### Récupérer la clé depuis Firebase Console:

1. **Firebase Console** → Project Settings → Service Accounts
2. **Click "Generate New Private Key"**
3. Un fichier JSON se télécharge
4. **Ouvrez** le fichier et trouvez le champ `"private_key"`
5. **Copiez** la valeur (commence par `-----BEGIN PRIVATE KEY-----`)

### Format pour Railway:

La clé privée dans le JSON ressemble à:
```
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n...\n-----END PRIVATE KEY-----\n"
```

**Dans Railway Variables**, copiez-la EXACTEMENT comme ci-dessus avec les `\n` (pas les vrais newlines).

---

## 🏗️ ÉTAPE 4 — Configurer le Build et le Deploy

### Build Command (Auto-détecté)

Railway détecte automatiquement:
```bash
npm install
```

### Start Command (depuis server/package.json)

```bash
node server-firebase.js
```

Si Railway ne le détecte pas, allez dans **Settings** et définissez:
- **Start Command**: `node server-firebase.js`
- **Root Directory**: `server` (important!)

---

## 🧪 ÉTAPE 5 — Tester le Déploiement

### Vérifier les Logs

1. Railway Dashboard → **Build Logs** (checker que npm install a réussi)
2. **Deploy Logs** (checker que server démarre)
3. **Runtime Logs** (logs en temps réel)

### Tester l'API

Railway vous donne une URL publique (ex: `https://salescompanion-prod-xxxxx.railway.app`)

```bash
# Test simple
curl https://your-railway-url/health

# Réponse attendue
{"status":"OK","timestamp":"2026-04-14T...Z"}
```

### Tester l'Auth Endpoint

```bash
curl -X POST https://your-railway-url/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "name": "Test User"
  }'
```

---

## 🔒 ÉTAPE 6 — Domaine Personnalisé (Optionnel)

1. Railway Dashboard → **Settings** → **Domains**
2. **Connect Custom Domain**
3. Configurez votre DNS (CNAME vers Railway URL)

Exemple:
```
api.salescompanion.cm CNAME salescompanion-prod-xxxxx.railway.app
```

---

## 📊 ÉTAPE 7 — Monitoring et Logs

### Accéder aux Logs

- **Real-time logs**: Railway Dashboard → Logs tab
- **Error tracking**: Check Build/Deploy/Runtime logs
- **Restart server**: Railway Dashboard → Settings → Restart

### Health Check

Railway inclut un health check automatique basé sur le `healthcheck` du Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3210/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

---

## 🚨 Dépannage

### ❌ Erreur: "Build failed"

**Solution:** Vérifiez les build logs
```bash
# Probablement un problème npm
# Assurez-vous que server/package.json est correct
npm install --production
```

### ❌ Erreur: "Cannot find module 'firebase-admin'"

**Solution:** Vérifiez que vous êtes dans le dossier `server`
```
Root Directory: server
```

### ❌ Erreur: "FIREBASE_PRIVATE_KEY is invalid"

**Solution:** Vérifiez le format des `\n`
- Ne pas utiliser de vrais newlines (Enter)
- Utiliser les caractères littéraux `\n`

### ❌ Erreur 500 sur /auth endpoints

**Solution:** Vérifiez Firebase variables
```bash
# Test local d'abord
NODE_ENV=production node server-firebase.js
```

---

## 📈 Mise à Jour du Code

### Auto-deploy depuis GitHub

Railway peut deploy automatiquement à chaque push:

1. Railway Dashboard → **Settings** → **GitHub Webhook**
2. Activez **Auto deploy on push**
3. À partir de maintenant, chaque `git push` trigger un deploy

### Deploy Manuel

```bash
git push origin main
```

---

## 💰 Pricing Railway

| Plan | Coût | Inclus |
|------|------|--------|
| **Hobby** | Gratuit | $5/mois crédits |
| **Pro** | Pay-as-you-go | $20/mois minimum |

Coûts typiques pour ce serveur:
- Node.js 256MB RAM: ~$5/mois
- Firebase (base de données gratuite tier): $0/mois
- **Total estimé**: ~$5/mois

---

## ✅ Checklist Déploiement

- [ ] Repository pushé sur GitHub
- [ ] Firebase service account JSON downloaded
- [ ] Railway account créé
- [ ] Toutes les variables d'environnement Firebase ajoutées
- [ ] Root Directory mis à `server`
- [ ] Start Command défini: `node server-firebase.js`
- [ ] Build/Deploy logs verts ✅
- [ ] Health check répond
- [ ] Auth endpoints testés
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Auto-deploy GitHub webhook activé

---

## 🎉 C'est prêt!

Votre SalesCompanion Server est maintenant en ligne sur Railway! 🚀

**Votre URL**: https://your-railway-url.railway.app

**Prochaines étapes:**
1. Configurer le client Electron avec cette URL
2. Configurer le mobile PWA
3. Tester les endpoints depuis l'app

---

## 📖 Ressources Utiles

- [Railway Docs](https://docs.railway.app)
- [Railway GitHub Deploy](https://docs.railway.app/deploy/github)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [API Endpoints](./API-ENDPOINTS.md)
- [Firebase Migration Guide](./FIREBASE-MIGRATION.md)
