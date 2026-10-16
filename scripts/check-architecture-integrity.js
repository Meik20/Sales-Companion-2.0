/**
 * scripts/check-architecture-integrity.js
 *
 * Script de garde-fou automatique validant l'intégrité architecturale de Sales Companion 2.0.
 * Bloque toute régression (dépendances incompatibles, hardcoding d'UIDs, cassure de modèles, imports non isolés).
 */
const fs = require('fs')
const path = require('path')

let errors = []
let warnings = []

// Helper pour parcourir récursivement un répertoire
function walkSync(dir, fileList = [], filterExts = ['.ts', '.tsx', '.js', '.jsx']) {
  if (!fs.existsSync(dir)) return fileList
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        walkSync(fullPath, fileList, filterExts)
      }
    } else {
      if (filterExts.some((ext) => file.endsWith(ext))) {
        fileList.push(fullPath)
      }
    }
  }
  return fileList
}

console.log("🔍 Démarrage du contrôle d'intégrité architecturale...")

// 1. Vérifier la version de firebase-admin dans apps/web/package.json
try {
  const webPkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../apps/web/package.json'), 'utf8')
  )
  const fbAdminVersion = webPkg.dependencies['firebase-admin']
  if (!fbAdminVersion) {
    errors.push("❌ 'firebase-admin' est absent de apps/web/package.json")
  } else if (
    fbAdminVersion.includes('14.') ||
    fbAdminVersion.includes('^14') ||
    fbAdminVersion.includes('~14')
  ) {
    errors.push(
      `❌ RÉGRESSION CRITIQUE : firebase-admin est en version "${fbAdminVersion}". Elle DOIT rester en 13.x pour prévenir le bug ERR_REQUIRE_ESM (jose / jwks-rsa) sur Vercel.`
    )
  } else {
    console.log(`✅ Dépendance firebase-admin sécurisée : ${fbAdminVersion}`)
  }
} catch (e) {
  errors.push(`❌ Impossible de lire apps/web/package.json : ${e.message}`)
}

// 2. Vérifier apps/web/src/lib/firebase-admin.ts (présence des Proxies dynamiques)
try {
  const fbAdminCode = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/lib/firebase-admin.ts'),
    'utf8'
  )
  if (fbAdminCode.includes("import { getAuth } from 'firebase-admin/auth'")) {
    errors.push(
      '❌ Import statique interdit de getAuth trouvé dans firebase-admin.ts. Utiliser le Proxy dynamique avec require() interne.'
    )
  }
  if (fbAdminCode.includes("import { getFirestore } from 'firebase-admin/firestore'")) {
    errors.push(
      '❌ Import statique interdit de getFirestore trouvé dans firebase-admin.ts. Utiliser le Proxy dynamique avec require() interne.'
    )
  }
  if (!fbAdminCode.includes('new Proxy')) {
    errors.push(
      '❌ Les Proxies dynamiques pour adminDb et adminAuth sont absents de firebase-admin.ts.'
    )
  }
  console.log('✅ Module firebase-admin.ts conforme (Proxies dynamiques actifs)')
} catch (e) {
  errors.push(`❌ Impossible de vérifier firebase-admin.ts : ${e.message}`)
}

// 3. Vérifier qu'aucun UID ou email de test n'est injecté en dur dans firestore.rules
const forbiddenPatterns = [
  { regex: /s1Jp6S7JRfcmp6ZCeuOle9WOlDj2/, label: 'UID Senior Manager test (s1Jp...)' },
  { regex: /8oL20QAFAVhZD6PBDiKjkTf56Bi2/, label: 'UID Team Manager test (8oL2...)' },
  { regex: /kYp9ihtDKLUFgFesHRfRl6qvoen2/, label: 'UID Member test (kYp9...)' },
  { regex: /mbaye_ivan@outlook\.fr/i, label: 'Email persona test (mbaye_ivan@...)' },
  { regex: /kevinivan230589@gmail\.com/i, label: 'Email persona test (kevinivan230589@...)' }
]

try {
  const rules = fs.readFileSync(
    path.resolve(__dirname, '../firestore/rules/firestore.rules'),
    'utf8'
  )
  for (const pat of forbiddenPatterns) {
    if (pat.regex.test(rules)) {
      errors.push(
        `❌ RÈGLE DE SÉCURITÉ VIOLÉE : Motif ad-hoc "${pat.label}" trouvé en dur dans firestore.rules !`
      )
    }
  }
  console.log('✅ firestore.rules conforme (aucun hardcoding ad-hoc de test)')
} catch (e) {
  errors.push(`❌ Impossible de lire firestore.rules : ${e.message}`)
}

// 4. Scanner récursivement tout apps/web/src contre les UIDs / emails de test en dur
try {
  const srcDir = path.resolve(__dirname, '../apps/web/src')
  const files = walkSync(srcDir)
  let foundViolations = 0

  for (const file of files) {
    // Exclure les fichiers de typage ou mocks explicites s'il y en a
    const content = fs.readFileSync(file, 'utf8')
    for (const pat of forbiddenPatterns) {
      if (pat.regex.test(content)) {
        const relPath = path.relative(path.resolve(__dirname, '..'), file)
        errors.push(
          `❌ HARDCODING INTERDIT : Motif de test "${pat.label}" trouvé dans ${relPath}`
        )
        foundViolations++
      }
    }
  }

  if (foundViolations === 0) {
    console.log(`✅ Code source apps/web/src (${files.length} fichiers vérifiés sans motif de test en dur)`)
  }
} catch (e) {
  errors.push(`❌ Erreur lors du scan de apps/web/src : ${e.message}`)
}

// 5. Vérifier qu'aucun fichier dans apps/web/src n'importe getFirestore/getAuth directement de firebase-admin
try {
  const srcDir = path.resolve(__dirname, '../apps/web/src')
  const files = walkSync(srcDir)
  let illegalImports = 0

  for (const file of files) {
    if (file.endsWith('firebase-admin.ts')) continue
    const content = fs.readFileSync(file, 'utf8')
    if (
      content.includes("from 'firebase-admin/firestore'") &&
      (content.includes('getFirestore') || content.includes('default as admin'))
    ) {
      const relPath = path.relative(path.resolve(__dirname, '..'), file)
      errors.push(
        `❌ IMPORT INTERDIT : getFirestore importé statiquement depuis firebase-admin dans ${relPath}. Utiliser adminDb depuis @/lib/firebase-admin.`
      )
      illegalImports++
    }
    if (
      content.includes("from 'firebase-admin/auth'") &&
      (content.includes('getAuth') || content.includes('default as admin'))
    ) {
      const relPath = path.relative(path.resolve(__dirname, '..'), file)
      errors.push(
        `❌ IMPORT INTERDIT : getAuth importé statiquement depuis firebase-admin dans ${relPath}. Utiliser adminAuth depuis @/lib/firebase-admin.`
      )
      illegalImports++
    }
  }

  if (illegalImports === 0) {
    console.log('✅ Aucun import statique illégal de getFirestore/getAuth dans apps/web/src')
  }
} catch (e) {
  errors.push(`❌ Erreur lors du contrôle des imports firebase-admin : ${e.message}`)
}

// 6. Vérifier l'isolation du connecteur Supabase (PostgREST natif sans dépendance ESM tierce)
try {
  const supabaseConnector = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/lib/supabase-companies.ts'),
    'utf8'
  )
  if (supabaseConnector.includes('@supabase/supabase-js')) {
    errors.push(
      '❌ Dépendance interdite : @supabase/supabase-js trouvé dans supabase-companies.ts. Utiliser PostgREST natif (fetch) pour prévenir les conflits de packaging ESM sur Vercel.'
    )
  } else {
    console.log('✅ Connecteur Supabase conforme (PostgREST natif sans dépendance externe)')
  }
} catch (e) {
  errors.push(`❌ Impossible de vérifier supabase-companies.ts : ${e.message}`)
}

// 7. Vérifier l'invariant du pipeline consolidé Senior Manager :
//    le service pipeline-org NE DOIT PAS filtrer les managers par segment.
//    Ce filtre était la cause racine du bug "disparition des données TM après changement de segment".
//    Toute réintroduction de cette logique casse la visibilité consolidée du SM.
try {
  const pipelineOrgService = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/server/services/pipeline-org.service.ts'),
    'utf8'
  )
  // Détecter le pattern de filtre segment sur les managers (la régression connue)
  const segmentManagerFilterPattern =
    /filteredManagersDocs\s*=\s*callerSegment\s*\?/
  if (segmentManagerFilterPattern.test(pipelineOrgService)) {
    errors.push(
      '❌ RÉGRESSION DÉTECTÉE : pipeline-org.service.ts filtre les managers par callerSegment. ' +
      'Ce pattern masque les TMs du pipeline consolidé du SM après un changement de segment. ' +
      'Le SM doit voir TOUS les managers de son orgCode sans filtre segment.'
    )
  } else {
    console.log('✅ pipeline-org.service.ts conforme (pas de filtre segment sur les managers)')
  }

  // Détecter le filtre segment sur les items pipeline (même régression côté items)
  const segmentItemFilterPattern =
    /callerSegment\s*&&\s*data\.segment\s*&&\s*data\.segment\s*!==\s*callerSegment/
  if (segmentItemFilterPattern.test(pipelineOrgService)) {
    errors.push(
      '❌ RÉGRESSION DÉTECTÉE : pipeline-org.service.ts filtre les items pipeline par callerSegment. ' +
      'Le segment d\'un item reflète celui du TM créateur, pas celui du SM appelant. ' +
      'Ce filtre exclut à tort les items des TMs avec un segment différent.'
    )
  } else {
    console.log('✅ pipeline-org.service.ts conforme (pas de filtre segment sur les items)')
  }
} catch (e) {
  errors.push(`❌ Impossible de vérifier pipeline-org.service.ts : ${e.message}`)
}

// Affichage du bilan
if (warnings.length > 0) {
  console.warn("\n⚠️ AVERTISSEMENTS D'INTÉGRITÉ :")
  warnings.forEach((w) => console.warn(w))
}

if (errors.length > 0) {
  console.error("\n🚨 ÉCHEC DES CONTRÔLES D'INTÉGRITÉ ARCHITECTURALE :")
  errors.forEach((err) => console.error(err))
  process.exit(1)
} else {
  console.log("\n🔒 TOUS LES GARDE-FOUS D'INTÉGRITÉ SONT RESPECTÉS.")
}
