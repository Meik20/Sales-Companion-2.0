# 🔍 Diagnostic Rapide — Sécurité Firebase

**Si vous avez des questions sur la sécurité, commencez ici.**

---

## ❓ Questions Fréquentes

### Q1: ".env.example contient-il des vraies clés?"
```bash
# Vérifier
grep "-----BEGIN PRIVATE KEY-----" server/.env.example

# Résultat attendu:
# ✅ (aucune sortie) = OK, c'est des templates
# ❌ (affiche une clé) = PROBLÈME!
```

### Q2: Mes clés sont-elles dans Git?"
```bash
# Vérifier
git ls-files | grep -E "\.env$|firebase.*\.json"

# Résultat attendu:
# ✅ (aucune sortie) = OK
# ❌ (affiche des fichiers) = PROBLÈME!

# Corriger
git rm --cached .env
git rm --cached firefox-service-account.json
git commit -m "Remove sensitive files"
```

### Q3: Est-ce que mon dépôt est compromis?"
```bash
# Chercher les vraies clés dans l'historique
git log -p --all | grep -i "private key\|firebase-adminsdk"

# Résultat attendu:
# ✅ (aucune sortie) = OK
# ❌ (affiche une clé) = PROBLÈME! Révoquer les clés immédiatement
```

### Q4: Comment ajouter mes credentials localement?"
```bash
# 1. Copier le template
cp server/.env.example server/.env

# 2. Éditer avec vraies clés
nano server/.env
# OU
code server/.env

# 3. Vérifier que .env n'est pas commité
git status server/.env
# ✅ Doit afficher "nothing to commit" (car .gitignore)
```

### Q5: Comment vérifier que tout est sécurisé?"
```bash
# Exécuter le script de vérification
bash check-security.sh

# Ou exécuter manuellement
echo "1. .env ignoré:"
git status server/.env

echo "2. firebase-service-account ignoré:"
go ls-files | grep firebase

echo "3. Pas de clés en Git:"
git log -p | grep "PRIVATE KEY" | wc -l
```

---

## 🚨 Diagnostic des Problèmes

### Problème: "Mon .env est suivi par Git"

```bash
# Cause: .env.example avait des clés et a été commité

# Solution:
git rm --cached server/.env
git commit -m "Stop tracking .env"
git push

# Vérifier:
git ls-files | grep "\.env"
# ✅ Doit être vide maintenant
```

### Problème: "Je ne sais pas mes vraies credentials"

```bash
# Solution: Les récupérer depuis Firebase

# 1. Firebase Console
#    https://console.firebase.google.com
#    Paramètres du projet
#    Comptes de service
#    Générer une clé privée
#    JSON

# 2. Ouvrir le fichier JSON téléchargé
#    Copier les valeurs dans .env
```

### Problème: "Les variables d'environment ne se chargent pas"

```bash
# Vérifier que .env existe
ls -la server/.env
# ✅ Doit afficher le fichier

# Vérifier que .env n'est pas vide
wc -l server/.env
# ✅ Doit avoir > 0 lignes

# Vérifier le format
cat server/.env | grep "FIREBASE_PROJECT_ID="
# ✅ Doit afficher une ligne
```

### Problème: "Ça dit 'PRIVATE KEY' dans l'historique Git"

```bash
# 🚨 CRITIQUE! Les clés sont exposées

# 1. Révoquer les clés
#    Firebase Console
#    Settings → Service Accounts
#    Delete la clé
#    Generate new key

# 2. Copier la nouvelle clé dans .env
cp server/.env.example server/.env
nano server/.env

# 3. Commit et push
git add -A
git commit -m "Update Firebase credentials"
git push

# 4. Considérer le dépôt comme potentiellement compromis
#    (Si GH public = les clés pourraient avoir été trouvées avant suppression)
```

---

## ✅ Diagnostic Complet

Exécutez cette checklist:

1. **`.env.example` sans vraies clés**
   ```bash
   grep "sales-companion-9cf56" server/.env.example
   # ✅ Doit être vide
   ```

2. **`.env` n'est pas commité**
   ```bash
   git ls-files server/.env
   # ✅ Doit être vide
   ```

3. **`firebase-service-account.json` n'est pas commité**
   ```bash
   git ls-files | grep firebase-service-account
   # ✅ Doit être vide
   ```

4. **`.gitignore` contient les patterns**
   ```bash
   grep -E "\.env|firebase.*json" .gitignore
   # ✅ Doit afficher des lignes
   ```

5. **Pas de clés dans l'historique**
   ```bash
   git log --all -p | grep -c "PRIVATE KEY"
   # ✅ Doit afficher 0
   ```

6. **Pas de clés hardcodées en source**
   ```bash
   grep -r "firebase-adminsdk" ./server --include="*.js"
   # ✅ Doit être vide (sauf dans .env.example qui est OK)
   ```

---

## 🔧 Réparations Rapides

### Fix 1: Ajouter .env.example sans clés
```bash
# Générer depuis template
cp server/.env.example.bak server/.env.example

# Ou recréer manuellement avec templates
cat > server/.env.example << 'EOF'
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
# ... (voir SECURITY-GUIDE.md pour le format complet)
EOF

# Commit
git add server/.env.example
git commit -m "Fix: Remove credentials from .env.example"
```

### Fix 2: Forcer Git à ignorer .env
```bash
# Si .env était déjà commité
git rm --cached server/.env
git update-index --assume-unchanged server/.env

# Vérifier que .gitignore a .env
grep "^\.env$" .gitignore

# Commit
git commit -m "Stop tracking .env"
```

### Fix 3: Nettoyer l'historique Git (si clés exposées)
```bash
# ⚠️ ATTENTION: Cela change l'historique!
# Ne faire que si dépôt n'est pas public

# Option A: Rebase (si rebase possible)
git rebase -i HEAD~10  # Adapter le nombre de commits

# Option B: Nettoyer avec BFG
java -jar bfg.jar --replace-text passwords.txt .

# Sinon: Considérer le dépôt comme compromis
# Créer nouveau dépôt avec historique clean
```

---

## 📞 Support

**Je ne sais pas quoi faire:**
→ Exécutez: `bash check-security.sh`

**Ça dit qu'il y a un erreur:**
1. Lire [`SECURITY-GUIDE.md`](./SECURITY-GUIDE.md)
2. Lire [`SECURITY-ALERT.md`](./SECURITY-ALERT.md)
3. Suivre les étapes

**Mes clés ont peut-être été exposées:**
1. Les révoquer: Firebase Console → Delete key
2. Générer nouvelles clés
3. Mettre à jour `.env`
4. Lire [`SECURITY-ALERT.md`](./SECURITY-ALERT.md)

---

## 📚 Ressources

- [`SECURITY-GUIDE.md`](./SECURITY-GUIDE.md) — Guide complet
- [`SECURITY-ALERT.md`](./SECURITY-ALERT.md) — Actions requises
- [`SECURITY-CHECKLIST.md`](./SECURITY-CHECKLIST.md) — Checklist rapide
- [`SECURITY-SUMMARY.md`](./SECURITY-SUMMARY.md) — Résumé
- `check-security.sh` — Script automatisé

---

**Prochaine étape:** Exécuter `bash check-security.sh` ↓
