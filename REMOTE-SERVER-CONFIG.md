# Intégration du Serveur Distant (Railway)

## 📡 Serveur Distant Actif
- **URL**: `https://sales-companion-production.up.railway.app`
- **Status**: ✅ Opérationnel
- **Health**: `/health`
- **Config Firebase**: `/api/config/firebase`

---

## 🖥️ Application Electron (Desktop)

### Configuration Actuelle
- ✅ URL du serveur distant: **`https://sales-companion-production.up.railway.app`**
- ✅ Stockage persistant: `~/.config/Sales Companion/server_url.txt`
- ✅ Tous les endpoints utilisent le serveur distant par défaut

### Handlers IPC Configurés
```javascript
// Authentification
ipcMain.handle('login', ...) → /auth/login
ipcMain.handle('register', ...) → /auth/register
ipcMain.handle('get-me', ...) → /auth/me

// Recherche & Chat
ipcMain.handle('search', ...) → /api/search
ipcMain.handle('chat', ...) → /api/chat

// Recherches Sauvegardées
ipcMain.handle('save-search', ...) → /api/saved-searches
ipcMain.handle('load-saved-searches', ...) → /api/saved-searches
ipcMain.handle('delete-saved-search', ...) → /api/saved-searches/{id}

// Pipeline
ipcMain.handle('pipeline', ...) → /api/pipeline
```

### Options de Développement Local
Pour développer localement, vous pouvez:

1. **Démarrer le serveur local**:
   ```bash
   npm start
   # Écoute sur http://localhost:3210
   ```

2. **Configurer Electron pour utiliser le serveur local**:
   ```bash
   # Créer/modifier le fichier de configuration
   ~/.config/Sales\ Companion/server_url.txt
   # Contenu: http://localhost:3210
   ```

### Gestion des Erreurs Améliorée
- Logs détaillés en console pour diagnostiquer les problèmes de connexion
- Retry automatique (3 tentatives) avec délai exponentiel
- Messages d'erreur plus spécifiques (code d'erreur réseau inclus)
- Support des certificats SSL non validés (rejectUnauthorized: false)

---

## 📱 Application Mobile (PWA)

### Architecture
- **Authentication**: Firebase Client SDK (client-side)
- **Backend APIs**: Serveur distant pour search, chat, pipeline, etc.

### Configuration Actuelle
- ✅ Serveur distant configuré: `https://sales-companion-production.up.railway.app`
- ✅ Tous les appels API passent par le serveur distant
- ✅ Firebase Auth initialisé côté client

### Comment ça Fonctionne
1. Utilisateur se connecte via **Firebase Auth** (direct, pas via backend)
2. ID Token obtenu de Firebase
3. API calls utilisent ce token avec le serveur distant:
   ```javascript
   async function api(method, path, body, token) {
     const opts = { 
       method, 
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': 'Bearer ' + token
       }
     };
     if (body) opts.body = JSON.stringify(body);
     return fetch('https://sales-companion-production.up.railway.app' + path, opts);
   }
   ```

### Endpoints Supportés
- `POST /api/search` - Recherche avancée
- `POST /api/chat` - Chat/Discussion
- `POST /api/saved-searches` - Sauvegarder recherche
- `GET /api/saved-searches` - Lister recherches
- `DELETE /api/saved-searches/{id}` - Supprimer recherche
- `GET /api/pipeline` - Récupérer pipeline
- `POST /api/pipeline` - Ajouter prospect
- `PUT /api/pipeline/{id}` - Mettre à jour prospect
- `DELETE /api/pipeline/{id}` - Supprimer prospect

---

## 🔧 Tests de Connexion

### Test 1: Vérifier le serveur distant
```bash
curl https://sales-companion-production.up.railway.app/health | jq
```
**Réponse attendue**:
```json
{
  "status": "ok",
  "server": "Sales Companion v2.0 (Firebase)",
  "ip": "...",
  "port": 3210
}
```

### Test 2: Récupérer config Firebase
```bash
curl https://sales-companion-production.up.railway.app/api/config/firebase | jq '.projectId'
```
**Réponse attendue**: `"sales-companion-9cf56"`

### Test 3: Tester l'authentification
```bash
curl -X POST https://sales-companion-production.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## 📊 Diagnostic des Problèmes

### Electron: "Erreur réseau"
**Cause probable**: Problème de certificat SSL ou timeout

**Solution**:
1. Vérifier les logs de développement (F12)
2. Vérifier que le serveur répond: `curl -v https://sales-companion-production.up.railway.app/health`
3. Vérifier la connexion internet

### PWA: Firebase non initialisé
**Cause probable**: Délai de chargement du SDK Firebase

**Solution**: 
1. Attendre que Firebase soit prêt (l'app attend 5s max)
2. Vérifier la console pour les erreurs Firebase
3. Rafraîchir la page

### Token Invalide
**Cause probable**: Token expiré ou malformé

**Solution**:
1. Vous reconnecter
2. Vérifier que le backend accepte les tokens Firebase
3. Vérifier les logs du serveur distant

---

## 🚀 Déploiement

### Sur Railway
- Le serveur est actuellement déployé à: `sales-companion-production.up.railway.app`
- Toutes les variables d'environnement Firebase sont configurées
- Restart service si nécessaire depuis le dashboard Railway

### Test de Déploiement
```bash
# Vérifier le serveur distant
npm run test:remote
# ou manuellement
curl https://sales-companion-production.up.railway.app/health
```

---

## 📝 Résumé de l'Intégration

| Aspect | Electron | PWA Mobile |
|--------|----------|------------|
| **Serveur Distant** | ✅ Configuré | ✅ Configuré |
| **URL** | `https://sales-companion-production.up.railway.app` | `https://sales-companion-production.up.railway.app` |
| **Auth** | Backend HTTP | Firebase Client SDK |
| **Endpoints API** | ✅ Tous supportés | ✅ Tous supportés |
| **Status** | ✅ Opérationnel | ✅ Opérationnel |
| **Retry** | ✅ 3 tentatives | ✅ Fetch native |
| **Logs** | ✅ Détaillés | ✅ Console |
