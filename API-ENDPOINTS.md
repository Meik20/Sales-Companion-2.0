# 🔌 API Endpoints — Firebase Edition

## 🔐 Authentication

### POST /auth/sign-up
**Créer un nouvel utilisateur**

```bash
curl -X POST http://localhost:3210/auth/sign-up \
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
  "uid": "user-firebase-uid",
  "email": "user@example.com",
  "message": "User created successfully"
}
```

---

### POST /auth/sign-in
**Authentifier un utilisateur**

```bash
curl -X POST http://localhost:3210/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Réponse (200):**
```json
{
  "message": "Use Firebase client SDK for sign-in with password",
  "email": "user@example.com",
  "uid": "user-firebase-uid"
}
```

---

### GET /auth/user
**Récupérer le profil utilisateur**

```bash
curl http://localhost:3210/auth/user \
  -H "Authorization: Bearer <firebase-token>"
```

**Réponse (200):**
```json
{
  "uid": "user-firebase-uid",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "dailyLimit": 10,
  "dailyUsed": 3,
  "active": true,
  "createdAt": "2024-04-13T10:00:00Z"
}
```

---

## 🏢 Companies

### GET /api/companies/search
**Rechercher des entreprises**

```bash
curl "http://localhost:3210/api/companies/search?sector=BTP&region=Douala&limit=20" \
  -H "Authorization: Bearer <firebase-token>"
```

**Paramètres:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| sector | string | Secteur d'activité (optionnel) |
| region | string | Région/Ville (optionnel) |
| city | string | Ville spécifique (optionnel) |
| limit | number | Nombre de résultats (max 100) |

**Réponse (200):**
```json
{
  "count": 15,
  "data": [
    {
      "id": "company-123",
      "raisonSociale": "Acme Construction SARL",
      "sigle": "ACME",
      "niu": "1234567890",
      "sector": "BTP et construction",
      "region": "Douala",
      "city": "Douala",
      "telephone": "+237612345678",
      "email": "contact@acme.cm",
      "siteWeb": "www.acme.cm",
      "director": "Jean Dupont",
      "active": true,
      "importedAt": "2024-04-01T08:00:00Z"
    },
    // ... plus d'entreprises
  ]
}
```

---

### POST /api/companies/import
**Importer des entreprises (Admin only)**

```bash
curl -X POST http://localhost:3210/api/companies/import \
  -H "Authorization: Bearer <admin-firebase-token>" \
  -F "file=@companies.xlsx"
```

**Réponse (200):**
```json
{
  "message": "Import successful",
  "imported": 150,
  "skipped": 12
}
```

---

## 🎛️ Admin Configuration

### POST /admin/config
**Sauvegarder une configuration (Admin only)**

```bash
curl -X POST http://localhost:3210/admin/config \
  -H "Authorization: Bearer <admin-firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "groq_api_key",
    "value": "gsk_xxxxxxxxxxx"
  }'
```

**Réponse (200):**
```json
{
  "message": "Config groq_api_key saved"
}
```

---

### GET /admin/config/:key
**Récupérer une configuration (Admin only)**

```bash
curl "http://localhost:3210/admin/config/groq_api_key" \
  -H "Authorization: Bearer <admin-firebase-token>"
```

**Réponse (200):**
```json
{
  "key": "groq_api_key",
  "value": "gsk_xxxxxxxxxxx"
}
```

---

### POST /admin/users/:uid/plan
**Changer le plan utilisateur (Admin only)**

```bash
curl -X POST "http://localhost:3210/admin/users/user-uid/plan" \
  -H "Authorization: Bearer <admin-firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro"
  }'
```

**Plans disponibles:**
- `free` (10 recherches/jour)
- `starter` (200 recherches/jour)
- `pro` (500 recherches/jour)
- `enterprise` (illimité)

**Réponse (200):**
```json
{
  "message": "User plan updated to pro"
}
```

---

## 🏥 Health Check

### GET /health
**Vérifier que le serveur est en ligne**

```bash
curl http://localhost:3210/health
```

**Réponse (200):**
```json
{
  "status": "ok",
  "server": "Sales Companion v2.0 (Firebase)",
  "ip": "192.168.1.10",
  "port": 3210
}
```

---

## 📱 Mobile PWA

### GET /mobile
**Charger l'application mobile**

```
http://localhost:3210/mobile
http://your-ip:3210/mobile
```

---

## 🔄 Headers Requis

### Authentification
```
Authorization: Bearer <firebase-id-token>
```

Obtenir le token en client:
```javascript
const token = await firebase.auth().currentUser.getIdToken();
```

### Content-Type
```
Content-Type: application/json
```

---

## ⚠️ Codes d'Erreur

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Paramètres manquants ou invalides |
| 401 | Unauthorized | Token manquant ou expiré |
| 403 | Forbidden | Permissions insuffisantes (non-admin) |
| 404 | Not Found | Ressource non trouvée |
| 500 | Server Error | Erreur serveur interne |

---

## 📊 Changements vs Ancienne API

| Aspect | Avant (SQLite) | Après (Firebase) |
|--------|---|---|
| **Auth** | JWT local | Firebase ID Token |
| **Endpoint** | /api/login | /auth/sign-in |
| **Token** | localStorage | Firebase SDK |
| **DB Query** | db.prepare().get() | db.collection().get() |
| **Real-time** | ❌ | ✅ (listeners) |

---

## 🚀 Client-Side Example

```javascript
import { auth, db } from './firebase-config.js';
import { signIn, searchCompanies } from './firebase-helpers.js';

// 1. Se connecter
const { token } = await signIn('user@example.com', 'password');

// 2. Récupérer token
const idToken = await auth.currentUser.getIdToken();

// 3. Fetcher l'API
const response = await fetch('/api/companies/search?sector=BTP', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});

const companies = await response.json();
console.log(companies);
```

---

Voir aussi:
- [`FIREBASE-MIGRATION.md`](./FIREBASE-MIGRATION.md) — Configuration complète
- [`server/firestore-operations.js`](./server/firestore-operations.js) — Source des fonctions
- [`client/firebase-helpers.js`](./client/firebase-helpers.js) — Helpers client
