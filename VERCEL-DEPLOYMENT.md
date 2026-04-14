# Déploiement sur Vercel

## Configuration Rapide

### 1. **Prérequis**
- Compte Vercel (https://vercel.com)
- GitHub connecté à Vercel
- Repository poussé sur GitHub

### 2. **Installation Vercel CLI** (optionnel)
```bash
npm install -g vercel
```

### 3. **Déployer le projet**

#### Option A: Via GitHub Integration (Recommandé)
1. Allez à https://vercel.com/new
2. Sélectionnez "GitHub" et autorisez Vercel
3. Sélectionnez le repository `Sales-Companion`
4. Vercel détecte automatiquement la configuration `vercel.json`
5. Configurez les variables d'environnement (voir étape 4)
6. Cliquez sur "Deploy"

#### Option B: Via Vercel CLI
```bash
vercel login
vercel
```

### 4. **Configurer les Variables d'Environnement sur Vercel**

Allez sur le dashboard Vercel → Project Settings → Environment Variables et ajoutez :

#### Firebase Admin SDK Variables (IMPORTANTE)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=your-private-key (avec ternaires \n)
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your-cert-url
```

#### Autres Variables (optionnel)
```
NODE_ENV=production
GROQ_API_KEY=your-groq-key (si utilisé)
```

### 5. **Endpoints API Disponibles**

Une fois déployé, les endpoints seront :

```
GET  /api/health                          → Vérifier le status du serveur
POST /api/auth/register                   → Créer un compte
POST /api/auth/login                      → Se connecter
POST /api/admin/import-companies          → Importer des entreprises (admin)
GET  /api/companies/search                → Rechercher des entreprises
GET  /api/config                          → Récupérer la configuration
POST /api/config                          → Sauvegarder la configuration
POST /api/usage/log                       → Logger l'utilisation
```

### 6. **Test après Déploiement**

```bash
# Tester le health check
curl https://your-sales-companion.vercel.app/api/health

# Réponse attendue:
# {"status":"OK","timestamp":"2025-04-14T...Z"}
```

## Dépannage

### Erreur 404
- Vérifiez que `vercel.json` est à la racine du projet
- Vérifiez que `api/index.js` existe
- Vérifiez les logs Vercel: `vercel logs <project-name>`

### Erreur de Firebase
- Vérifiez les variables d'environnement sur Vercel
- La clé privée Firebase doit avoir `\n` échappées en `\\n`
- Testez localement d'abord: `npm run dev`

### Uploads Timeout
- Les uploads sont limités à 5MB sur Vercel
- Utilisez une solution cloud (Firebase Storage, S3) pour les fichiers plus volumineux

## Surveillance et Logs

```bash
# Voir les logs en temps réel
vercel logs --tail

# Voir les logs d'une date spécifique
vercel logs --since 30m
```

## Domaine Personnalisé

1. Allez à Vercel Project Settings → Domains
2. Ajoutez votre domaine personnalisé
3. Configurez les DNS records (Vercel affiche les instructions)

## Redéploiement

### Automatique
- Chaque push sur `main` redéploie automatiquement

### Manuel
```bash
vercel --prod
```

---

**Notes:**
- Le serveur est sans état (stateless) sur Vercel
- Les uploads sont temporaires (`/tmp`) - utilisez Firebase Storage pour la persistance
- Les fonctions Vercel ont un timeout de 60s en plan gratuit
- Le plan gratuit inclut 1000 Function Invocations gratuites par mois
