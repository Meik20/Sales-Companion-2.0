# 🔧 Corrections Authentification et Boutons Admin

## Résumé des Modifications

### ✅ 1. Retrait du bouton "Tableau de bord admin" (Mobile)
**Fichier:** `mobile/index.html` (ligne 556)

**Avant:**
```html
<button class="sheet-btn secondary" onclick="openAdmin()">⚙️ Tableau de bord admin</button>
```

**Après:**
```html
<!-- Bouton supprimé - Admin panel removed from user navigation -->
```

**Impact:** Les utilisateurs n'accèdent plus au tableau de bord admin via le menu de profil mobile.

---

### ✅ 2. Correction du Flash de Page de Connexion

#### **Problème Initial:**
- Au rafraîchissement (F5), la page affichait brièvement l'écran de connexion avant de revenir à la session
- Causé par une vérification asynchrone du token APRÈS le rendu initial
- L'écran s'affichait d'abord, puis se cachait une fois la session vérifiée

#### **Erreur Desktop (Electron):**
La IIFE anonyme chargait le token APRÈS `DOMContentLoaded`
```javascript
// AVANT (problématique)
(async()=>{
  token=await window.electronAPI.getToken();
  if(token){...}
  updateCities();
})();
```

#### **Solution - Desktop (Electron):**

**Fichier:** `client/index.html`

1. **Fonction `initializeApp()` créée** (déjà présente):
```javascript
async function initializeApp(){
  try{
    console.log('[App Init] Checking for cached token...');
    const cachedToken=await window.electronAPI.getToken();
    if(cachedToken){
      // Valider le token
      const r=await window.electronAPI.getMe(cachedToken);
      if(r.status===200){
        token=cachedToken;
        user=r.data;
        console.log('[App Init] ✓ Token is valid, showing app');
        showApp();
        isInitializing=false;
        return;
      }
    }
  }catch(e){...}
  isInitializing=false;
}
```

2. **Appel systématique de `initializeApp()`:**
```javascript
// AVANT:
(async()=>{...})();

// APRÈS:
document.addEventListener('DOMContentLoaded', async ()=>{
  await initializeApp();
  updateCities();
});
// Also initialize immediately in case DOMContentLoaded already fired
if(document.readyState==='interactive'||document.readyState==='complete'){
  initializeApp().then(()=>updateCities());
}
```

3. **Protection des formulaires pendant l'initialisation:**
```javascript
async function doLogin(){
  if(isInitializing){
    toast('L\'application initialise...');
    return;
  }
  // ...
}

async function doRegister(){
  if(isInitializing){
    toast('L\'application initialise...');
    return;
  }
  // ...
}
```

#### **Solution - Mobile (PWA):**

**Fichier:** `mobile/index.html`

1. **Fonction `checkCachedToken()` créée:**
```javascript
async function checkCachedToken(){
  try{
    console.log('[App Init] Checking cached token...');
    if(token){
      // Make a test API call to verify token is still valid
      const r=await api('GET','/auth/me',null,token);
      if(r.ok){
        console.log('[App Init] ✓ Token is valid, loading user data...');
        const userData=await r.json();
        user=userData;
        localStorage.setItem('sc_token',token);
        showApp();
        return true;
      }
    }
  }catch(e){...}
  isInitializing=false;
  return false;
}
```

2. **Vérification du token AVANT Firebase auth listener:**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // Check cached token FIRST to prevent auth screen flash
  const tokenIsValid=await checkCachedToken();
  if(tokenIsValid){
    console.log('[App Init] Using cached token, skipping Firebase auth listener');
    updateCities();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    return; // ← Important: Skip Firebase listener if token valid
  }
  
  // If no cached token, set up Firebase auth listener
  waitForFirebase(() => {
    if (!auth) {
      console.error('✗ Firebase Auth not ready');
      isInitializing=false;
      return;
    }
    auth.onAuthStateChanged(async (fbUser) => {
      isInitializing=false; // Mark init as complete
      // ...
    });
  });
});
```

3. **Protection des formulaires:**
```javascript
async function doLogin() {
  if(isInitializing){
    showToast('L\'application initialise...');
    return;
  }
  // ...
  btn.disabled = false;
  btn.textContent = 'Se connecter →';
  isInitializing=false; // ← Reset flag
}

async function doRegister() {
  // ... same pattern
  isInitializing=false;
}
```

---

### ✅ 3. Persistence de Session

#### **Problème Initial:**
- Utilisateur authentifié, ferme l'app
- Au redémarrage, il voyait l'écran de connexion (même s'il ne s'était pas déconnecté)
- Le token était perdu ou non utilisé au redémarrage

#### **Solution:**

**Variables d'état:**
```javascript
let isInitializing = true; // Flag pour tracker l'initialisation
```

**Desktop (Electron):**
- Le token est stocké dans un fichier sécurisé (`TOKEN_FILE`)
- À chaque démarrage, on le récupère via `window.electronAPI.getToken()`
- Si valide → montre l'app directement
- Si invalide → affiche l'écran de connexion

**Mobile (PWA):**
- Le token est stocké dans `localStorage` (clé: `sc_token`)
- À chaque chargement, on l'utilise pour vérifier la session
- Si valide → montre l'app directement
- Si invalide → affiche l'écran de connexion avec Firebase Auth

---

## 🔄 Flux de Démarrage - Avant vs Après

### **AVANT (Problématique):**
```
App Start
  ↓
Show Auth Screen (always)
  ↓
In background: Check token
  ↓
If valid: Hide auth screen & show app
  ↓
User sees: Auth screen → then app (FLASH!)
```

### **APRÈS (Corrigé):**
```
App Start
  ↓
Check token (hidden, synchrone)
  ↓
If valid → Show app directly ✓
If invalid → Show auth screen
  ↓
User sees: Only the correct screen (NO FLASH!)
```

---

## 🧪 Cas de Test

| Cas | Avant | Après |
|-----|-------|-------|
| Utilisateur authentifié + refresh | Flash d'écran de connexion | App affichée directement ✓ |
| Utilisateur authentifié + fermeture/réouverture | Écran de connexion affiché | App affichée directement ✓ |
| Token expiré | Reste sur l'app (avec erreurs) | Écran de connexion affiché ✓ |
| Première connexion | Écran de connexion | Écran de connexion ✓ |
| Déconnexion | App reste active | Écran de connexion ✓ |

---

## 📝 Détails Techniques

### **Desktop (main.js):**
- `ipcMain.handle('get-token')` - Récupère le token du fichier
- `ipcMain.handle('save-token')` - Sauvegarde le token
- `ipcMain.handle('clear-token')` - Supprime le token
- Tous les tokens sont stockés avec `mode: 0o600` (lecture/écriture propriétaire uniquement)

### **Mobile (Firebase):**
- `localStorage.setItem('sc_token', token)` - Persiste le token
- `localStorage.removeItem('sc_token')` - Supprime le token
- `/auth/me` endpoint valide le token côté serveur

### **Variables d'État:**
```javascript
let isInitializing = true;  // Flag d'initialisation
let token = '';             // Token d'authentification
let user = null;            // Données utilisateur
```

---

## 🚀 Vérification

Pour vérifier que les changements fonctionnent:

### **Desktop:**
1. Ouvrir l'app → Authentifier l'utilisateur
2. Fermer l'app (Alt+F4 ou X)
3. Réouvrir l'app
4. **Résultat attendu:** App affichée directement (pas de flash d'écran de connexion)

### **Mobile:**
1. Ouvrir l'app sur mobile → Authentifier
2. Rafraîchir la page (F5)
3. **Résultat attendu:** App affichée directement (pas de flash d'écran de connexion)

---

## 📋 Résumé des Fichiers Modifiés

| Fichier | Modifications |
|---------|---------------|
| `mobile/index.html` | ✓ Bouton admin supprimé |
| `mobile/index.html` | ✓ `checkCachedToken()` créée |
| `mobile/index.html` | ✓ DOMContentLoaded optimisé |
| `mobile/index.html` | ✓ isInitializing checks ajoutés |
| `client/index.html` | ✓ `initializeApp()` appelée correctement |
| `client/index.html` | ✓ DOMContentLoaded optimisé |
| `client/index.html` | ✓ isInitializing checks ajoutés |
| `client/index.html` | ✓ toast() utilisée au lieu de showToast() |

---

**Statut:** ✅ **COMPLET - Prêt pour test**
