# 🔐 Guide Sécurité — Gestion des Credentials Firebase

## 📋 Vue d'Ensemble

Ce guide explique comment gérer en sécurité les credentials Firebase en développement et production.

---

## 🚫 Fichiers Sensibles à NE JAMAIS Commit

```
❌ JAMAIS Committer:
├── .env                             (Credentials locales)
├── .env.local                       (Credentials locales)
├── firebase-service-account.json    (Admin SDK key)
├── firebase-key.json                (Variante du nom)
├── keys.json                        (Autre variante)
└── *-firebase*.json                 (Pattern de sécurité)
```

**Tous ces fichiers sont ignorés par `.gitignore`** ✅

---

## ✅ Fichiers SAFE à Commit

```
✅ SAFE Committer:
├── .env.example                     (Template SANS clés)
├── .gitignore                       (Règles d'exclusion)
├── firebase.json                    (Config publique)
└── package.json                     (Dépendances)
```

---

## 🔄 Flux de Développement

### 1. Clone du Projet
```bash
git clone <repo>
cd SalesCompanion/server
```

### 2. Créer `.env` Local
```bash
cp .env.example .env
```

### 3. Ajouter Vraies Clés
**Pour obtenir les clés:**
```
1. Firebase Console
2. Paramètres du projet
3. Comptes de service
4. Générer clé privée (JSON)
5. Copier le contenu dans .env
```

### 4. Vérifier (IMPORTANT!)
```bash
# Vérifier que .env existe et n'est pas versionné
ls -la .env           # Doit exister localement
git status .env       # NE doit PAS être listé (ignoré)
```

---

## 🌐 Déploiement en Production

### Option 1: Cloud Run (RECOMMANDÉ)

```bash
# 1. Via gcloud CLI
gcloud run deploy sales-companion \
  --set-env-vars FIREBASE_PROJECT_ID=xxxxx \
  --set-env-vars FIREBASE_PRIVATE_KEY=xxxxx \
  --image sales-companion:latest

# 2. Via Cloud Run Console
Cloud Run → Service → Variables d'environnement
```

**Avantage:** Secrets chiffrés par Google Cloud, jamais en local.

### Option 2: GitHub Secrets (CI/CD)

```yaml
# .github/workflows/deploy.yml
env:
  FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
  FIREBASE_PRIVATE_KEY: ${{ secrets.FIREBASE_PRIVATE_KEY }}
  # ...
```

**Setup:**
```
Repository → Settings → Secrets and variables → Actions
  → New repository secret
  → Ajouter FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, ...
```

### Option 3: Docker + .env.production

```bash
# Créer .env.production (local, jamais versionné)
cp .env.example .env.production

# Éditer avec clés production
nano .env.production

# Build avec secrets
docker build \
  --build-arg ENV_FILE=.env.production \
  -t sales-companion:prod .
```

---

## 🔍 Audit de Sécurité

### Vérifier que Tout est Sécurisé

```bash
# 1. Vérifier le gitignore
cat .gitignore | grep -E "\.env|firebase.*\.json"

# 2. S'assurer que .env n'est pas versionné
git ls-files | grep -E "\.env|firebase-service-account"
# ✅ Sortie vide = GOOD

# 3. Chercher les credentials qui traîneraient
git log --all --full-history -S "PRIVATE KEY" -p | head -20
# ✅ Sortie vide = GOOD

# 4. Vérifier les commits sensibles
git log --oneline | head -5
# ✅ Pas de commit avec "env", "key", "secret"
```

---

## ⚠️ Si une Clé a Été Exposée

### Étapes d'Urgence

1. **IMMÉDIATEMENT:** Révoquer dans Firebase Console
   ```
   Settings → Service Accounts → Key → Delete
   ```

2. **DANS L'HEURE:** Générer nouvelle clé
   ```
   Settings → Service Accounts → Generate new key
   ```

3. **NETTOYER LE GIT:**
   ```bash
   # Option A: Si pas pushé en public encore
   git reset HEAD~1          # Annuler dernier commit
   rm .env /.gitignore       # Supprimer fichiers sensibles
   git add .gitignore
   git commit -m "Remove sensitive files"
   
   # Option B: Si déjà pushé (dépôt compromis)
   # → Toutes les clés sont compromises
   # → Repository doit être traité comme PUBLIC
   # → Réévaluer si le code peut être public
   ```

4. **SCANNER LES LOGS:**
   ```
   Firebase Console → Logs & Audit
   → Chercher accès anormal
   → IP suspects
   → Timestamps inhabituels
   ```

5. **NOTIFICATIONS:**
   - Équipe dev
   - DevOps
   - Security team

---

## 🛡️ Best Practices

### ✅ À FAIRE

```bash
# 1. Utiliser .env.example comme template
cp .env.example .env
# Éditer avec vraies valeurs

# 2. Réviser .gitignore régulièrement
cat .gitignore | head -20

# 3. Utiliser les minimum required permissions
# → Firebase Admin SDK a toutes les permissions
# → Créer des Restricted Keys si possible

# 4. Rotation des clés (tous les 6-12 mois)
# → Générer nouvelle clé
# → Mettre à jour variables d'env
# → Supprimer ancienne clé

# 5. Audit des clés actives
# Firebase Console → Service Accounts
# → Vérifier dates de création
```

### ❌ À ÉVITER

```bash
# ❌ Jamais
cat .env                              # Ne pas afficher les clés
echo $FIREBASE_PRIVATE_KEY            # Ne pas logger
git add .env                          # .gitignore doit l'ignorer automatiquement

# ❌ Jamais partager
curl -X POST ... -d "key=$$FIREBASE_PRIVATE_KEY"
slack: "Clé: $FIREBASE_PRIVATE_KEY"
email: firebase creds en pièce jointe

# ❌ Jamais hardcoder
const KEY = "-----BEGIN PRIVATE KEY-----..."
"privateKey": "real_key_here"
```

---

## 🔐 Checklist Sécurité

### Development Setup
- [ ] `.env.example` created (without real credentials)
- [ ] `.env` in `.gitignore`
- [ ] `firebase-service-account.json` in `.gitignore`
- [ ] `firebase-*.json` pattern in `.gitignore`

### Before Committing
- [ ] No `.env` file in staging: `git status .env`
- [ ] No hard-coded credentials in code
- [ ] No credentials in commit messages

### Before Pushing to GitHub
```bash
# Vérifier qu'aucune clé n'est pushée
git log -p | grep -i "private key\|firebase"
# Sortie vide = OK
```

### In Production (Cloud Run)
- [ ] Credentials in Cloud Run Secrets (not .env files)
- [ ] Environment variables set via Console
- [ ] Service account has minimal permissions
- [ ] Audit logs enabled

### Regular Maintenance
- [ ] Review active credentials monthly
- [ ] Rotate keys every 6-12 months
- [ ] Archive old keys (for rotation reference)
- [ ] Update documentation

---

## 📞 Support

**Problème:** Je vois `.env` dans Git!
```bash
# Récupérer depuis .gitignore s'il a été commité
git rm --cached .env
git update-index --assume-unchanged .env
git commit -m "Remove .env from tracking"
```

**Problème:** Les clés ne se chargent pas
```bash
# Vérifier que .env existe
ls .env

# Vérifier que variables sont exportées
source .env
echo $FIREBASE_PROJECT_ID
```

**Problème:** Je ne sais pas quelles clés ont été exposées
```
1. Allez sur Firebase Console
2. Settings → Service Accounts
3. Vérifiez la date de création
4. Si avant aujourd'hui → déjà commit
5. Revoquer et régénérer
```

---

## 📚 Ressources

- [Firebase Security](https://firebase.google.com/docs/projects/identity)
- [Google Cloud Secrets Manager](https://cloud.google.com/secret-manager)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Version:** 1.0  
**Date:** 13 Avril 2026  
**Status:** Sécurisé ✅
