# ▶️ Prochaines Actions — Firebase Integration

## 🎯 Plan d'Action Immédiat

### Phase 1️⃣ : Configuration Firebase (30 min)

**À faire:**
```
1. Aller sur console.firebase.google.com
2. Créer un projet nommé "sales-companion"
3. Télécharger les credentials JSON (Comptes de service)
4. Sauvegarder dans server/firebase-service-account.json
5. Activer Firestore Database (mode test)
6. Activer Authentication (Email/Password)
```

**Vérifier:**
- [ ] Projet Firebase créé
- [ ] Credentials téléchargées
- [ ] Fichier en place (server/firebase-service-account.json)

---

### Phase 2️⃣ : Installation & Test Local (20 min)

**À faire:**
```bash
# 1. Backend
cd server
npm install firebase-admin axios dotenv

# 2. Configuration
cp .env.example .env
nano .env  # Éditer avec vos credentials

# 3. Démarrer le serveur
node server-firebase.js

# 4. Tester
curl http://localhost:3210/health
```

**Attendre:**
```
✅ Admin créé : admin / admin123
✅ Firebase Admin SDK initialized (via env)
```

---

### Phase 3️⃣ : Mettre à Jour le Frontend (30 min)

#### Electron (client/)
```bash
npm install firebase
# Remplacer preload.js avec preload-firebase.js
# Ou adapter le preload.js existant
```

#### Mobile PWA (mobile/)
```html
<!-- Ajouter dans <head> de index.html -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"></script>
<script src="./firebase-config.js"></script>
```

---

### Phase 4️⃣ : Tester l'Authentification (15 min)

**Test Sign-Up:**
```bash
curl -X POST http://localhost:3210/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!",
    "name":"Test User"
  }'
```

**Response attendue:**
```json
{
  "uid": "...",
  "email": "test@example.com",
  "message": "User created successfully"
}
```

---

### Phase 5️⃣ : Migrer les Données (optionnel, 15 min)

**Si vous aviez des données SQLite:**
```bash
cd server
node migrate-sqlite-to-firestore.js
```

**Vérifier dans Firestore Console:**
- [ ] Collection `users/` créée
- [ ] Collection `companies/` créée
- [ ] Documents migrés correctement

---

## 📋 Checklist Complète

### Configuration Firebase
- [ ] Projet créé
- [ ] Firestore activé
- [ ] Authentication activé
- [ ] Domaines autorisés configurés
- [ ] Règles Firestore déployées

### Backend
- [ ] `npm install` exécuté
- [ ] `.env` configuré
- [ ] Serveur démarre sans erreur
- [ ] `/health` répond `{status: "ok"}`

### Frontend Electron
- [ ] Firebase SDK installé (`npm install firebase`)
- [ ] Preload adapté
- [ ] Test sign-up fonctionne
- [ ] Token stocké et utilisé

### Frontend Mobile
- [ ] Firebase CDN ajouté à index.html
- [ ] Config chargée correctement
- [ ] Test authentification fonctionne

### Données
- [ ] ✅ SQLite sauvegardée (si applicable)
- [ ] ✅ Migration exécutée (`migrate-sqlite-to-firestore.js`)
- [ ] ✅ Collections vérifiées dans Firestore

### Sécurité
- [ ] `firebase-service-account.json` dans `.gitignore`
- [ ] `.env` non versionné
- [ ] Credentials sécurisés
- [ ] Règles Firestore restrictives

---

## 👨‍💻 Commandes Essentielles

```bash
# Backend — Démarrage
cd server
node server-firebase.js

# Backend — Développement (auto reload)
npm run dev

# Backend — Migration DB
npm run migrate:db

# Frontend — Electron
cd client
npm install
npm start

# Frontend — Mobile
# Ouvrir: http://localhost:3210/mobile

# Docker — Tous services
docker-compose up -d
docker-compose logs -f backend
docker-compose down

# Test santé
curl http://localhost:3210/health
```

---

## 🆘 Troubleshooting Courant

| Problème | Solution |
|----------|----------|
| "Cannot find firebase-admin" | `npm install firebase-admin` |
| ".env file not found" | `cp .env.example .env` |
| "Project ID not found" | Vérifier `.env` avec `grep FIREBASE_PROJECT_ID` |
| "Server unreachable" | S'assurer que `node server-firebase.js` est en cours |
| "Permission denied (Firestore)" | Vérifier règles Firestore (mode test autorise tout) |
| "Authentication not working" | Vérifier Email/Password activé (Firebase Console) |

---

## 📚 Lectures Recommandées

**Ordre de lecture (important):**

1. ⭐ **[`QUICKSTART.md`](./QUICKSTART.md)** (5 min)
   - 5 étapes rapides pour démarrer

2. 📖 **[`FIREBASE-MIGRATION.md`](./FIREBASE-MIGRATION.md)** (15 min)
   - Guide configuration détaillée

3. 🔧 **[`INTEGRATION-GUIDE.md`](./INTEGRATION-GUIDE.md)** (20 min)
   - Comment adapter votre code existant

4. 🔌 **[`API-ENDPOINTS.md`](./API-ENDPOINTS.md)** (10 min)
   - Documentation des endpoints

5. 📋 **[`FILES-CREATED.md`](./FILES-CREATED.md)** (5 min)
   - Vue d'ensemble des fichiers

---

## 🚀 Déploiement (après tests locaux)

### Option 1: Cloud Run (Recommandé)
```bash
cd server
docker build -t sales-companion .
gcloud run deploy sales-companion \
  --image sales-companion \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id
```

### Option 2: Docker Compose (Développement)
```bash
docker-compose up -d
# Serveur sur http://localhost:3210
```

### Option 3: Serveur Classique (VPS)
```bash
cd server
npm install
NODE_ENV=production node server-firebase.js
```

---

## 📊 Success Criteria

✅ **Vous serez prêt quand:**
- [ ] Backend démarre sans erreur
- [ ] `/health` répond correctement
- [ ] Authentification sign-up fonctionne
- [ ] Firestore a des collections et documents
- [ ] Client Electron se connecte
- [ ] Mobile PWA se connecte
- [ ] Recherche d'entreprises fonctionne
- [ ] Admin peut importer Excel

---

## 🎓 Apprentissage Supplémentaire

**Resources:**
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)

**Files de référence dans le projet:**
- `server/firebase-config.js` → Configuration
- `server/firestore-operations.js` → Opérations DB
- `client/firebase-helpers.js` → Helpers client
- `server/migrate-sqlite-to-firestore.js` → Migration

---

## ⏱️ Timeline Estimée

| Phase | Durée | Tâche |
|-------|-------|-------|
| 1 | 30 min | Configuration Firebase |
| 2 | 20 min | Installation local |
| 3 | 30 min | Mise à jour frontend |
| 4 | 15 min | Test authentification |
| 5 | 15 min | Migration données |
| **Total** | **~2h** | **Intégration complète** |

---

## ✨ Points Clés à Retenir

- 🔑 Gardez les credentials sécurisées (`.env`, pas Git)
- 🔐 Firestore Rules doivent être restrictives en production
-  ⛅ Cloud Run auto-scale vs VPS fixe
- 💡 Firestore gratuit: 50k reads/jour
- 🔄 Migration peut être progressive
- 📱 PWA fonctionne offline (avec cache)
- 🌐 Multi-device sync automatique

---

**👉 Commencez maintenant:** [`QUICKSTART.md`](./QUICKSTART.md)

Bon courage ! 🚀
