# 🎨 Intégration du Logo "SC" - Documentation

## Vue d'ensemble
Le logo "SC" (Sales Companion) a été intégré dans toute l'application:
- ✅ **Desktop (Electron)**: Icônes Windows, Linux, macOS
- ✅ **Mobile (PWA)**: Icônes multiples résolutions (72px-512px)
- ✅ **UI**: Logo "SC" affiché dans les authentifications
- ✅ **Configuration**: Electron-builder, manifest.json

---

## 📁 Fichiers Générés

### Desktop (Client - Electron)
```
client/assets/
├── icon.svg           ← Source vectorielle
├── icon.png           ← 256x256 (fallback pour Linux)
├── icon-256.png       ← 256x256
├── icon.ico           ← Windows installer + taskbar
└── (icon.icns)        ← macOS (À GÉNÉRER)
```

### Mobile (PWA)
```
mobile/icons/
├── icon.svg           ← Source vectorielle
├── icon-72.png        ← 72×72 (tablette)
├── icon-96.png        ← 96×96 (tablette)
├── icon-128.png       ← 128×128
├── icon-144.png       ← 144×144 (tablette)
├── icon-152.png       ← 152×152 (iPad)
├── icon-192.png       ← 192×192 (device, maskable)
├── icon-384.png       ← 384×384
└── icon-512.png       ← 512×512 (splash screen, maskable)
```

---

## ⚙️ Configurations Mises à Jour

### 1. **client/package.json** - Electron Builder
```json
"build": {
  "win": {
    "target": "nsis",
    "icon": "assets/icon.ico"
  },
  "nsis": {
    "installerIcon": "assets/icon.ico",
    "uninstallerIcon": "assets/icon.ico"
  },
  "mac": {
    "icon": "assets/icon.icns"
  },
  "linux": {
    "icon": "assets/icon.png"
  }
}
```

### 2. **client/main.js** - BrowserWindow Icon
```javascript
mainWindow = new BrowserWindow({
  icon: path.join(__dirname, 'assets', 'icon.png'),
  // ...
});
```

### 3. **mobile/manifest.json** - PWA Icons
✅ Déjà configuré avec tous les chemins corrects

### 4. **HTML Logos**
- ✅ **client/index.html** - Logo "SC" dans auth + titlebar
- ✅ **mobile/index.html** - Logo "SC" dans auth + titlebar

---

## 🚀 Prochaines Étapes

### Générer l'icône macOS (.icns)
```bash
# Option 1: Utiliser ImageMagick (si installé)
npm run generate:mac-icon

# Option 2: Service en ligne
# https://cloudconvert.com/svg-to-icns
# Télécharger icon.svg et convertir en icon.icns
# Placer le fichier dans client/assets/

# Option 3: Sur macOS avec iconutil
# mkdir -p icon.iconset
# cp icon.png icon.iconset/icon_512x512.png
# iconutil -c icns icon.iconset
```

### Build de l'application

#### Windows
```bash
cd client
npm install
npm run build:win
# Générer: client/dist/B2B-Cameroun-Setup-x.x.x.exe
# ✅ Affichera le logo "SC" dans le programme d'installation
```

#### macOS
```bash
cd client
npm run build:mac
# Générer: client/dist/B2B-Cameroun-x.x.x.dmg
# ⚠️ Nécessite d'abord générer icon.icns
```

#### Linux
```bash
cd client
npm run build:linux
# Générer: client/dist/AppImage ou deb
# ✅ Utilisera icon.png (256x256)
```

#### Mobile (PWA)
```bash
# L'app PWA est servie via:
http://SERVER:3210/mobile
# ✅ Les icônes sont dans mobile/icons/
# ✅ manifest.json configure automatiquement
```

---

## 🎨 Design du Logo "SC"

### Couleurs
- **Fond**: Vert `#1B7A3E` (correspond au thème app)
- **Texte**: Blanc (`#FFFFFF`)
- **Coins arrondis**: Oui (15% du rayon)

### Spécifications
- **Format Source**: SVG vectoriel
- **Résolutions PNG**: 9 tailles (72px → 512px)
- **Formats Binaires**: 
  - `.ico` pour Windows (256×256)
  - `.icns` pour macOS (128×128+)
  - `.png` pour Linux

---

## ✅ Checklist de Déploiement

| Plateforme | Statut | Icône | Détails |
|-----------|--------|-------|---------|
| **Windows** | ✅ Prêt | `icon.ico` | Installer + Taskbar |
| **macOS** | ⚠️ À finir | `icon.icns` | À générer |
| **Linux** | ✅ Prêt | `icon.png` | AppImage/Deb |
| **PWA Mobile** | ✅ Prêt | `72-512.png` | Install + splash |
| **UI Desktop** | ✅ Prêt | SVG inline | Auth + titlebar |
| **UI Mobile** | ✅ Prêt | SVG inline | Auth + titlebar |

---

## 📝 Notes

1. **Fichier .ico Windows**: Généré automatiquement du PNG 256x256. C'est un format simplifié mais fonctionne pour les installers NSIS.

2. **Logo Responsive**: Le logo SVG s'adapte automatiquement à tous les contextes (petit = juste "SC", grand = avec fond vert + coins arrondis).

3. **PWA Maskable Icons**: Les fichiers `icon-192.png` et `icon-512.png` sont marqués comme "maskable", ce qui permet aux appareils modernes de les adapter à leur forme de masque d'app.

4. **Branding Unifié**: Le logo "SC" apparaît maintenant uniformément dans:
   - Installation Windows (NSIS)
   - Taskbar & Explorer
   - Accueil macOS
   - App drawer Linux
   - Écran d'accueil Android/iOS
   - Barre de titre de l'app

---

## 🔧 Scripts Disponibles

```bash
# Générer les icônes PNG et ICO
npm run generate:icons

# Générer l'icône macOS (nécessite ImageMagick)
npm run generate:mac-icon

# Build desktop
npm run build:win
npm run build:mac
npm run build:linux

# Dev
npm start        # Client desktop
npm start        # Depuis ./server pour backend
```

---

**Version**: 1.0.0  
**Date**: 2026-04-18  
**Statut**: ✅ Production-Ready (sauf macOS icon.icns)
