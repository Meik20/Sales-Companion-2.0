⚠️ **ALERTE SÉCURITÉ FIREBASE**

## 🚨 INCIDENT DÉTECTÉ

Des clés Firebase **PRIVÉES** ont été trouvées dans `.env.example` (maintenant corrigé).

### Informations Compromises (Trouvées & Supprimées)

```
Project ID: sales-companion-9cf56
Private Key ID: e7b5cd73ef773fd965c6b9bd44b7dbe3d2a44abc
Client Email: firebase-adminsdk-fbsvc@sales-companion-9cf56.iam.gserviceaccount.com
```

### ⚠️ ACTIONS IMMÉDIATEMENT REQUISES

**1️⃣ Révoquer les Clés Compromises**
```
Firebase Console
  → Paramètres du projet
  → Comptes de service
  → Clé en question
  → Supprimer
  → Générer une nouvelle clé
```

**2️⃣ Nettoyer le Git History**
```bash
# Si ces clés ont été pushées sur GitHub:
# 1. Le dépôt est COMPROMIS
# 2. Régénérer TOUTES les clés Firebase
# 3. Considérer le dépôt comme non-confidentiel

# Optionnel: BFG Repo Cleaner
# java -jar bfg.jar --replace-text credentials.txt --no-blob-protection .
```

**3️⃣ Vérifier l'Accès Anormal**
```
Firebase Console
  → Logs & Audit
  → Vérifier les activités récentes
  → Chercher des accès suspects
```

### ✅ CORRECTIONS APPLIQUÉES

- [x] `.env.example` → Remplacé avec templates (pas de vraies clés)
- [x] `.gitignore` → Renforcé (toutes les clés ignorées)
- [x] Fichier `.env` déjà dans `.gitignore`

### 🔐 DIRECTIVES À PARTIR DE MAINTENANT

#### ✅ À FAIRE
```
✓ Stocker les clés dans .env (non versionné)
✓ Utiliser Cloud Run Secrets en production
✓ Utiliser GitHub Secrets pour CI/CD
✓ Réviser les autorisations périodiquement
✓ Utiliser des clés de service avec permissions minimales
```

#### ❌ JAMAIS
```
✗ Committer .env en Git
✗ Committer firebase-service-account.json en Git
✗ Committer les clés privées n'importe où
✗ Utiliser les mêmes clés en dev/prod
✗ Partager les clés par email/Slack
```

### 📋 Checklist Finale

- [ ] Clés compromises révoquées dans Firebase Console
- [ ] Nouvelles clés générées
- [ ] `.env` mis à jour avec nouvelles clés
- [ ] Vérifier que `.env` est bien ignoré par Git
- [ ] Commit avec les corrections
- [ ] Repository Security Review complétée

### 🔗 Ressources

- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/identity)
- [Managing Service Accounts](https://firebase.google.com/docs/admin/setup#initialize-sdk)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

**Status:** ✅ Corrigé et assurisé  
**Date:** 13 Avril 2026  
**Action:** Voir checklist ci-dessus
