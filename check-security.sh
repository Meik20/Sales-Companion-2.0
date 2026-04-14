#!/bin/bash
# 🔐 Security Verification Script for SalesCompanion

echo "🔍 Vérification de Sécurité — SalesCompanion"
echo "==========================================="
echo ""

ERROR_COUNT=0
WARNING_COUNT=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check 1: .env should NOT be committed
echo "1️⃣  Vérification: .env non versionné"
if git ls-files | grep -q "^\.env$"; then
    echo -e "${RED}❌ ERREUR: .env est suivi par Git!${NC}"
    echo "   Exécutez: git rm --cached .env && git commit -m 'Remove .env'"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ .env n'est pas versionné${NC}"
fi
echo ""

# Check 2: firebase-service-account.json should NOT be committed
echo "2️⃣  Vérification: firebase-service-account.json non versionné"
if git ls-files | grep -q "firebase.*\.json"; then
    echo -e "${RED}❌ ERREUR: Fichiers Firebase JSON sont suivis!${NC}"
    echo "   Fichiers trouvés:"
    git ls-files | grep "firebase.*\.json"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ Aucun fichier Firebase JSON versionné${NC}"
fi
echo ""

# Check 3: .gitignore should contain .env
echo "3️⃣  Vérification: .gitignore contient .env"
if grep -q "\.env" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env dans .gitignore${NC}"
else
    echo -e "${RED}❌ ERREUR: .env n'est pas dans .gitignore${NC}"
    ((ERROR_COUNT++))
fi
echo ""

# Check 4: .gitignore should contain firebase patterns
echo "4️⃣  Vérification: .gitignore contient patterns Firebase"
if grep -qE "firebase.*\.json|firebase-service" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ Patterns Firebase dans .gitignore${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Patterns Firebase manquants dans .gitignore${NC}"
    ((WARNING_COUNT++))
fi
echo ""

# Check 5: No PRIVATE KEY in git history
echo "5️⃣  Vérification: Pas de 'PRIVATE KEY' dans l'historique"
if git log --all -p 2>/dev/null | grep -q "PRIVATE KEY"; then
    echo -e "${RED}❌ ERREUR: 'PRIVATE KEY' trouvée dans git history!${NC}"
    echo "   Les clés Firebase ont probablement été exposées"
    ((ERROR_COUNT++))
else
    echo -e "${GREEN}✅ Aucune PRIVATE KEY dans l'historique${NC}"
fi
echo ""

# Check 6: .env.example should NOT have real credentials
echo "6️⃣  Vérification: .env.example sans vraies clés"
if grep -q "-----BEGIN PRIVATE KEY-----" server/.env.example 2>/dev/null; then
    echo -e "${RED}❌ ERREUR: .env.example contient une vraie clé!${NC}"
    echo "   Corrigez immediamment!"
    ((ERROR_COUNT++))
elif grep -q "your-" server/.env.example 2>/dev/null; then
    echo -e "${GREEN}✅ .env.example contient uniquement des placeholders${NC}"
else
    echo -e "${YELLOW}⚠️  Impossible de vérifier .env.example${NC}"
fi
echo ""

# Check 7: server/.env exists locally (if it should)
echo "7️⃣  Vérification: server/.env local"
if [ -f "server/.env" ]; then
    echo -e "${GREEN}✅ server/.env existe${NC}"
    if [ -s "server/.env" ]; then
        echo -e "${GREEN}   (fichier non vide)${NC}"
    else
        echo -e "${YELLOW}⚠️  Fichier .env est vide${NC}"
        ((WARNING_COUNT++))
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: server/.env n'existe pas (normal si non installé)${NC}"
fi
echo ""

# Check 8: Look for hardcoded keys in source
echo "8️⃣  Vérification: Pas de clés dans le code source"
FOUND_KEYS=0
if grep -r "-----BEGIN PRIVATE KEY-----" --include="*.js" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v "\.env"; then
    ((FOUND_KEYS++))
fi
if grep -r "firebase-adminsdk" --include="*.js" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v "\.env" | grep -v ".example"; then
    ((FOUND_KEYS++))
fi

if [ $FOUND_KEYS -eq 0 ]; then
    echo -e "${GREEN}✅ Pas de clés hardcodées trouvées${NC}"
else
    echo -e "${RED}❌ ERREUR: Possibles clés trouvées dans le code!${NC}"
    ((ERROR_COUNT++))
fi
echo ""

# Summary
echo "==========================================="
echo "📊 RÉSUMÉ"
echo "==========================================="
echo -e "${GREEN}✅ Vérifications réussies: ${NC}"
PASSED=$((8 - ERROR_COUNT - WARNING_COUNT))
echo "   $PASSED/8"

if [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Avertissements: ${NC}"
    echo "   $WARNING_COUNT"
fi

if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}❌ Erreurs: ${NC}"
    echo "   $ERROR_COUNT"
    echo ""
    echo -e "${RED}🚨 ACTION REQUISE!${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}🔒 Sécurité OK!${NC}"
    exit 0
fi
