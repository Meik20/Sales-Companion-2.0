/**
 * scripts/check-architecture-integrity.js
 * 
 * Script de garde-fou automatique validant l'intégrité architecturale de Sales Companion 2.0.
 * Bloque toute régression (dépendances incompatibles, hardcoding d'UIDs, cassure de modèles).
 */
const fs = require('fs');
const path = require('path');

let errors = [];

// 1. Vérifier la version de firebase-admin dans apps/web/package.json
try {
  const webPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/web/package.json'), 'utf8'));
  const fbAdminVersion = webPkg.dependencies['firebase-admin'];
  if (!fbAdminVersion) {
    errors.push("❌ 'firebase-admin' est absent de apps/web/package.json");
  } else if (fbAdminVersion.includes('14.') || fbAdminVersion.includes('^14') || fbAdminVersion.includes('~14')) {
    errors.push(`❌ REGRESSION CRITIQUE : firebase-admin est en version "${fbAdminVersion}". Elle DOIT rester en 13.x pour prévenir le bug ERR_REQUIRE_ESM (jose / jwks-rsa) sur Vercel.`);
  } else {
    console.log(`✅ Dépendance firebase-admin sécurisée : ${fbAdminVersion}`);
  }
} catch (e) {
  errors.push(`❌ Impossible de lire apps/web/package.json : ${e.message}`);
}

// 2. Vérifier apps/web/src/lib/firebase-admin.ts (présence des Proxies dynamiques)
try {
  const fbAdminCode = fs.readFileSync(path.resolve(__dirname, '../apps/web/src/lib/firebase-admin.ts'), 'utf8');
  if (fbAdminCode.includes("import { getAuth } from 'firebase-admin/auth'")) {
    errors.push("❌ Import statique interdit de getAuth trouvé dans firebase-admin.ts. Utiliser le Proxy dynamique avec require() interne.");
  }
  if (fbAdminCode.includes("import { getFirestore } from 'firebase-admin/firestore'")) {
    errors.push("❌ Import statique interdit de getFirestore trouvé dans firebase-admin.ts. Utiliser le Proxy dynamique avec require() interne.");
  }
  if (!fbAdminCode.includes("new Proxy")) {
    errors.push("❌ Les Proxies dynamiques pour adminDb et adminAuth sont absents de firebase-admin.ts.");
  }
  console.log("✅ Module firebase-admin.ts conforme (Proxies dynamiques actifs)");
} catch (e) {
  errors.push(`❌ Impossible de vérifier firebase-admin.ts : ${e.message}`);
}

// 3. Vérifier qu'aucun UID ou email de test n'est injecté en dur dans firestore.rules
try {
  const rules = fs.readFileSync(path.resolve(__dirname, '../firestore/rules/firestore.rules'), 'utf8');
  const forbiddenPatterns = [
    /s1Jp6S7JRfcmp6ZCeuOle9WOlDj2/,
    /8oL20QAFAVhZD6PBDiKjkTf56Bi2/,
    /kYp9ihtDKLUFgFesHRfRl6qvoen2/,
    /mbaye_ivan@outlook\.fr/,
    /kevinivan230589@gmail\.com/
  ];
  for (const pat of forbiddenPatterns) {
    if (pat.test(rules)) {
      errors.push(`❌ RÈGLE DE SÉCURITÉ VIOLÉE : Motif ad-hoc de test "${pat}" trouvé en dur dans firestore.rules !`);
    }
  }
  console.log("✅ firestore.rules conforme (aucun hardcoding ad-hoc de test)");
} catch (e) {
  errors.push(`❌ Impossible de lire firestore.rules : ${e.message}`);
}

if (errors.length > 0) {
  console.error("\n🚨 ÉCHEC DES CONTRÔLES D'INTÉGRITÉ ARCHITECTURALE :");
  errors.forEach(err => console.error(err));
  process.exit(1);
} else {
  console.log("\n🔒 TOUS LES GARDE-FOUS D'INTÉGRITÉ SONT RESPECTÉS.");
}
