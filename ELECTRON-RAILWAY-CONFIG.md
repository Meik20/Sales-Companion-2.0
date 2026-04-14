# 🔧 Configurer le Client Electron avec Railway

**Guide pour connecter l'app desktop au serveur Railway**

---

## 📍 Configuration Simple

Quand vous lancez l'app Electron, à la première connexion, elle vous demande l'URL du serveur.

### Option 1: Via l'Interface (Facile)

1. **Lancez** l'app desktop Electron
2. Elle demande l'URL du serveur (première connexion)
3. **Entrez** votre URL Railway:
   ```
   https://your-railway-url.railway.app
   ```
4. L'URL est **sauvegardée** dans `~/.config/SalesCompanion/server_url.txt`

### Option 2: Via le Code

Modifiez le fichier `client/main.js` avant de builder:

```javascript
const DEFAULT_SERVER = 'https://your-railway-url.railway.app';
```

---

## 🔐 Configuration Sécurisée

### Environnement Local (Développement)

```javascript
// client/main.js - LOCAL DEV
const DEFAULT_SERVER = 'http://localhost:3210';
```

### Production (Railway)

```javascript
// client/main.js - PRODUCTION
const DEFAULT_SERVER = 'https://your-railway-url.railway.app';
```

---

## 🏗️ Builder l'App pour Production

Une fois Railway configuré, builder l'executable:

```bash
cd client
npm run build:win      # Pour Windows
npm run build:mac      # Pour macOS
npm run build:linux    # Pour Linux
```

### Résultat

Les installers se trouvent dans `client/dist/`:
- Windows: `client/dist/B2B Intelligence Cameroun.exe`
- Mac: `client/dist/B2B Intelligence Cameroun.dmg`
- Linux: `client/dist/sales-companion.AppImage`

---

## 🧪 Tester Avant de Builder

Pour tester l'app avec Railway sans builder:

```bash
cd client
npm start
```

Quand elle demande l'URL, entrez:
```
https://your-railway-url.railway.app
```

---

## 📱 Configurer le Mobile PWA

Le mobile PWA utilise le même serveur. Pour pointer vers Railway:

### Modifier le fichier `mobile/firebase-config.js`

```javascript
// Si vous utilisez une API gateway alternative
const API_BASE_URL = 'https://your-railway-url.railway.app';
```

Ou directement dans le code de l'app:

```javascript
// mobile/index.html ou mobile/main.js
fetch('https://your-railway-url.railway.app/companies/search')
  .then(...)
```

---

## 🔗 Configuration Dynamique (Avancé)

Vous pouvez aussi faire une **configuration API sur Railway**:

1. **Railway Dashboard** → Variables → Ajouter:
   ```
   CLIENT_REDIRECT_URL = https://your-railway-url.railway.app
   ```

2. **L'app utilise** cet endpoint dynamique:
   ```
   GET /config/urls
   ```

---

## ✅ Checklist Configuration

- [ ] URL Railway copiée (ex: `https://salescompanion-prod-xxxxx.railway.app`)
- [ ] Health check testé: `curl https://your-url/health`
- [ ] `DEFAULT_SERVER` mis à jour dans `client/main.js`
- [ ] App testée localement avec Railway URL
- [ ] App buildée pour production
- [ ] Installer distribué aux utilisateurs

---

## 🚀 Distribution de l'App

Une fois buildée, distribuez l'installer:

### Windows
```
client/dist/Sales-Companion-Setup-2.0.0.exe
```

### macOS
```
client/dist/Sales-Companion-2.0.0.dmg
```

### Linux
```
client/dist/sales-companion-2.0.0.AppImage
```

---

## 📊 Variables d'Environnement Electron

L'app stocke localement:

| Fichier | Contenu | Location |
|---------|---------|----------|
| `auth_token.txt` | Firebase JWT token | `~/.config/SalesCompanion/` |
| `server_url.txt` | URL du serveur | `~/.config/SalesCompanion/` |

Vous pouvez préconfigurer ces fichiers avant distribution:

```bash
# Linux/Mac
mkdir -p ~/.config/SalesCompanion
echo "https://your-railway-url.railway.app" > ~/.config/SalesCompanion/server_url.txt

# Windows (PowerShell)
New-Item -Path "$env:APPDATA\SalesCompanion" -ItemType Directory -Force
"https://your-railway-url.railway.app" | Out-File "$env:APPDATA\SalesCompanion\server_url.txt" -Encoding UTF8
```

---

## 🔍 Debugging

Si l'app ne se connecte pas à Railway:

### Vérifier les logs Electron

```bash
# Sur Windows
%appdata%\SalesCompanion\logs\

# Sur Mac/Linux
~/.config/SalesCompanion/logs/
```

### Tester manuellement l'endpoint

```bash
curl -X GET https://your-railway-url.railway.app/health \
  -H "Authorization: Bearer <your-token>"
```

### Vérifier la connexion réseau

```bash
# Ping Railway
ping your-railway-url.railway.app

# Test DNS
nslookup your-railway-url.railway.app
```

---

## 🎉 Prêt!

Votre app Electron est maintenant **connectée à Railway** ✅
