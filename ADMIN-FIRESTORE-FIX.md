## 📋 Problème Résolu : Tableau de Bord Admin Ne Se Connecte Pas à Firestore

### ❌ Problème Initial
Le tableau de bord admin retournait des erreurs **403 Forbidden** lors de l'accès aux endpoints Firestore comme:
- `/admin/stats` (statistiques du tableau de bord)
- `/admin/companies` (liste des entreprises)
- `/admin/users` (liste des utilisateurs)

### 🔍 Diagnostic Effectué

1. **Vérification de l'authentification admin**: L'utilisateur admin existait et avait les custom claims `admin: true` configurés.

2. **Test du token personnalisé**: En décodant le JWT du token personnalisé créé à la connexion, on a découvert que les custom claims n'étaient PAS au niveau racine du payload, mais dans une clé `claims` imbriquée.

**Payload du token personnalisé:**
```json
{
  "aud": "https://identitytoolkit.googleapis.com/...",
  "iat": 1777082053,
  "exp": 1777085653,
  "iss": "firebase-adminsdk-fbsvc@...",
  "sub": "firebase-adminsdk-fbsvc@...",
  "uid": "MDtwLaYQq0dZTd7HJBM8mjTo7zw2",
  "claims": {
    "admin": true
  }
}
```

### 🐛 Bug Principal Identifié

Le middleware `verifyAdmin` dans `server/firestore-operations.js` cherchait le claim admin au mauvais endroit:

**Code incorrect:**
```javascript
// ❌ INCORRECT - cherche à la racine du payload
if (!decoded.admin) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

Pour les tokens personnalisés générés par Firebase, le claim est placé dans `decoded.claims.admin`, pas `decoded.admin`.

### ✅ Correctif Appliqué

**Fichier modifié:** `server/firestore-operations.js` (fonction `verifyAdmin`)

```javascript
// ✅ CORRECT - vérifie les deux endroits
const isAdmin = decoded.admin === true || decoded.claims?.admin === true;
if (!isAdmin) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

### 🛡️ Correction CSP Bonus

**Fichier modifié:** `server/server-firebase.js` (configuration Helmet CSP)

Ajout de `https://cdn.jsdelivr.net` aux directives CSP pour permettre le chargement de Chart.js:

```javascript
scriptSrc: [
  "'self'",
  "'unsafe-inline'",
  "https://www.gstatic.com",
  "https://apis.google.com",
  "https://cdn.jsdelivr.net"  // ← AJOUTÉ
],

scriptSrcElem: [
  "'self'",
  "'unsafe-inline'",
  "https://www.gstatic.com",
  "https://apis.google.com",
  "https://cdn.jsdelivr.net"  // ← AJOUTÉ
],
```

### 📊 Résultats Après Correction

✅ Connexion admin au panel fonctionne correctement
✅ Accès aux routes `/admin/*` autorisé
✅ Firestore stats se chargent sans erreur
✅ Graphiques Chart.js se rendent correctement
✅ Logs d'activité affichent les connexions admin

### 🔧 Tests Effectués

1. **Diagnostic script**: `server/diagnose-init-admin.js` ✅
2. **Token test**: `server/test-admin-token.js` ✅  
3. **Test manuel du panel**: Connexion et chargement des données ✅

### 📝 Notes Importantes

- Firebase Admin SDK place les custom claims dans une clé `claims` lors de la création d'un token personnalisé (custom token)
- Les ID tokens (obtenus via l'authentification standard) ont les custom claims au niveau racine
- Le middleware `verifyAdmin` accepte maintenant les deux formats

---

**Date de correction:** 25 avril 2026  
**Composants affectés:** Middleware d'authentification admin, Configuration CSP
