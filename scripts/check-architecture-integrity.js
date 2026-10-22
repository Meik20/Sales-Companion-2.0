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

// 8. Vérifier les règles canoniques de calcul de pipeline et de consolidation du segment
try {
  // A. Présence du module canonique pipeline-metrics.ts
  const metricsModulePath = path.resolve(__dirname, '../apps/web/src/lib/pipeline-metrics.ts')
  if (!fs.existsSync(metricsModulePath)) {
    errors.push("❌ Module canonique manquant : apps/web/src/lib/pipeline-metrics.ts est introuvable.")
  } else {
    const metricsCode = fs.readFileSync(metricsModulePath, 'utf8')
    const requiredExports = [
      'normalizePipelineStatus',
      'calculatePipelineStats',
      'calculateAttainmentRate',
      'calculateRoRate',
      'aggregateOrgSegmentTargets'
    ]
    for (const exp of requiredExports) {
      if (!metricsCode.includes(`export function ${exp}`)) {
        errors.push(`❌ RÈGLE DE CALCUL BALISÉE : La fonction canonique "${exp}" est absente de pipeline-metrics.ts.`)
      }
    }
    console.log('✅ Module canonique pipeline-metrics.ts conforme (toutes les règles formelles sont exportées)')
  }

  // B. Vérifier que api/reporting/org/route.ts consolide les targets sur teamManagerUids (exclut le Senior Manager)
  const reportingOrgRoute = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/app/api/reporting/org/route.ts'),
    'utf8'
  )
  if (reportingOrgRoute.includes('for (let i = 0; i < managerUids.length; i += 30)')) {
    errors.push(
      '❌ RÉGRESSION DÉTECTÉE DANS api/reporting/org/route.ts : Les cibles (targets) sont requêtées sur "managerUids" (incluant le Senior Manager). ' +
      'Les objectifs consolidés du segment doivent OBLIGATOIREMENT être requêtés sur "teamManagerUids" (exclusion stricte du SM).'
    )
  } else {
    console.log('✅ api/reporting/org/route.ts conforme (consolidation exclusive des Team Managers opérationnels)')
  }

  // C. Vérifier que TeamManagerPerformanceCard affiche bien activeCount dans Portefeuille Actif
  const perfCardCode = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/features/pipeline/components/TeamManagerPerformanceCard.tsx'),
    'utf8'
  )
  if (!perfCardCode.includes('stats.activeCount')) {
    errors.push(
      '❌ RÉGRESSION DÉTECTÉE DANS TeamManagerPerformanceCard.tsx : La carte Portefeuille Actif doit afficher "stats.activeCount" (prospection + négociation), non le totalCount incluant les conclues.'
    )
  } else {
    console.log('✅ TeamManagerPerformanceCard.tsx conforme (Portefeuille Actif affiche activeCount)')
  }

  // D. Vérifier la désignation explicite "Team Managers" sur la vue Senior Manager
  const frLocale = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/locales/fr.ts'),
    'utf8'
  )
  if (!frLocale.includes("kpiManagers: 'Team Managers'") || !frLocale.includes("topPerformersTooltip: 'Team Managers")) {
    errors.push(
      "❌ RÈGLE MÉTIER VIOLÉE : Sur la vue du Senior Manager, les managers managés doivent être explicitement désignés comme 'Team Managers' (kpiManagers et tooltips)."
    )
  } else {
    console.log('✅ Locales conformes (désignation explicite "Team Managers" sur la vue Senior Manager)')
  }

  // E. Vérifier l'opacité 100% des popovers (prévention de la superposition de caractères)
  const headerCode = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/components/layout/AppHeader.tsx'),
    'utf8'
  )
  if (headerCode.includes('bg-popover/95') || headerCode.includes('backdrop-blur-md shadow-elevation-3')) {
    errors.push(
      "❌ RÉGRESSION UI DÉTECTÉE DANS AppHeader.tsx : Le menu déroulant de profil ne doit jamais être semi-transparent (bg-popover/95 backdrop-blur). Il doit avoir un fond opaque solide (var(--card))."
    )
  } else {
    console.log('✅ AppHeader.tsx conforme (menu profil opaque sans translucidité parasite)')
  }

  // F. Vérifier l'internationalisation automatique des périodes et métriques (i18n)
  const dashboardCode = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/app/(protected)/dashboard/page.tsx'),
    'utf8'
  )
  if (dashboardCode.includes("Mois actif : {data?.monthlyCycle") || dashboardCode.includes("labelFr || 'En cours'")) {
    errors.push(
      "❌ INTERNATIONALISATION VIOLÉE DANS dashboard/page.tsx : Le libellé du mois ou de cycle est codé en dur en français. Utiliser getMonthPeriodLabel(...) et t('dashboard.activeMonth')."
    )
  } else if (!dashboardCode.includes("getMonthPeriodLabel")) {
    errors.push(
      "❌ RÈGLE D'INTERNATIONALISATION : dashboard/page.tsx doit utiliser getMonthPeriodLabel pour adapter le mois à la langue active."
    )
  } else {
    console.log('✅ dashboard/page.tsx conforme (internationalisation dynamique du cycle mensuel et des métriques)')
  }

  // G. Vérifier le respect de la charte officielle de marque (ScIcon) dans la sidebar mobile
  const sidebarCode = fs.readFileSync(
    path.resolve(__dirname, '../apps/web/src/components/layout/AppSidebar.tsx'),
    'utf8'
  )
  if (!sidebarCode.includes("<ScIcon") || !sidebarCode.includes("import { ScIcon }")) {
    errors.push(
      "❌ CHARTE OFFICIELLE VIOLÉE DANS AppSidebar.tsx : Le logo officiel ScIcon doit être utilisé pour l'en-tête du menu latéral mobile."
    )
  } else {
    console.log('✅ AppSidebar.tsx conforme (logo officiel ScIcon balisé)')
  }

  // H. Vérifier la conformité de la route de révocation des Team Managers (Section 12 AGENTS.md)
  const revokeRoutePath = path.resolve(__dirname, '../apps/web/src/app/api/team/managers/revoke/route.ts')
  if (!fs.existsSync(revokeRoutePath)) {
    errors.push("❌ ROUTE MANQUANTE : /api/team/managers/revoke/route.ts doit exister.")
  } else {
    const revokeCode = fs.readFileSync(revokeRoutePath, 'utf8')
    if (!revokeCode.includes("orgRole !== 'senior_manager'")) {
      errors.push("❌ SÉCURITÉ VIOLÉE DANS managers/revoke : L'accès doit être réservé au Senior Manager.")
    }
    if (!revokeCode.includes("targetManagerUid === callerUid")) {
      errors.push("❌ SÉCURITÉ VIOLÉE DANS managers/revoke : L'auto-révocation du Senior Manager doit être formellement interdite.")
    }
    if (!revokeCode.includes("reassignPrivateProspectsForRevokedManager")) {
      errors.push("❌ INTÉGRITÉ VIOLÉE DANS managers/revoke : Les prospects Supabase doivent être réassignés au successeur.")
    }
    console.log('✅ Route /api/team/managers/revoke conforme (défense en profondeur et passation obligatoire)')
  }

  // I. Vérifier la conformité de la route de transfert individuel de commercial (Section 12 AGENTS.md)
  const transferMemberRoutePath = path.resolve(__dirname, '../apps/web/src/app/api/team/members/transfer/route.ts')
  if (!fs.existsSync(transferMemberRoutePath)) {
    errors.push("❌ ROUTE MANQUANTE : /api/team/members/transfer/route.ts doit exister.")
  } else {
    const transferCode = fs.readFileSync(transferMemberRoutePath, 'utf8')
    if (!transferCode.includes("orgRole !== 'senior_manager'")) {
      errors.push("❌ SÉCURITÉ VIOLÉE DANS members/transfer : L'accès doit être réservé au Senior Manager.")
    }
    if (!transferCode.includes("managerUid: targetManagerUid")) {
      errors.push("❌ INTÉGRITÉ VIOLÉE DANS members/transfer : managerUid doit être mis à jour sur targetManagerUid.")
    }
    console.log('✅ Route /api/team/members/transfer conforme (contrôle Senior Manager et transfert atomique)')
  }

  // J. Vérifier la gouvernance de révocation des Senior Managers (Section 12 AGENTS.md)
  if (fs.existsSync(revokeRoutePath)) {
    const revokeCode = fs.readFileSync(revokeRoutePath, 'utf8')
    if (!revokeCode.includes("targetData.orgRole === 'senior_manager'")) {
      errors.push("❌ GOUVERNANCE VIOLÉE : La révocation directe d'un Senior Manager doit être interdite dans /api/team/managers/revoke.")
    } else {
      console.log('✅ Révocation directe de Senior Manager formellement verrouillée dans /api/team/managers/revoke')
    }
  }

  const smRevokeRoutePath = path.resolve(__dirname, '../apps/web/src/app/api/support/sm-revocation/route.ts')
  if (!fs.existsSync(smRevokeRoutePath)) {
    errors.push("❌ ROUTE MANQUANTE : /api/support/sm-revocation/route.ts doit exister pour l'arbitrage Support.")
  } else {
    const smRevokeCode = fs.readFileSync(smRevokeRoutePath, 'utf8')
    if (!smRevokeCode.includes("targetSmUid === callerUid")) {
      errors.push("❌ SÉCURITÉ VIOLÉE DANS support/sm-revocation : L'auto-demande de révocation doit être interdite.")
    }
    if (!smRevokeCode.includes("support_threads")) {
      errors.push("❌ INTÉGRITÉ VIOLÉE DANS support/sm-revocation : Un ticket dans support_threads doit être créé.")
    }
    console.log('✅ Route /api/support/sm-revocation conforme (arbitrage Support et ticket de gouvernance)')
  }

  // 10. Vérifier la configuration des CRONs de production dans vercel.json
  const vercelJsonPath = path.resolve(__dirname, '../vercel.json')
  if (!fs.existsSync(vercelJsonPath)) {
    errors.push('❌ CONFIGURATION MANQUANTE : vercel.json doit exister à la racine.')
  } else {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'))
    const crons = vercelConfig.crons || []
    const paths = crons.map((c) => c.path)
    if (!paths.includes('/api/cron/check-subscriptions')) {
      errors.push('❌ CRON MANQUANT : /api/cron/check-subscriptions doit être configuré dans vercel.json.')
    }
    if (!paths.includes('/api/cron/archive-pipeline-clients')) {
      errors.push('❌ CRON MANQUANT : /api/cron/archive-pipeline-clients doit être configuré dans vercel.json.')
    }
    console.log('✅ vercel.json conforme (tous les crons d\'arrière-plan sont planifiés)')
  }

  // 11. Vérifier le verrouillage de CRON_SECRET sur archive-pipeline-clients
  const archiveCronPath = path.resolve(__dirname, '../apps/web/src/app/api/cron/archive-pipeline-clients/route.ts')
  if (fs.existsSync(archiveCronPath)) {
    const archiveCronCode = fs.readFileSync(archiveCronPath, 'utf8')
    if (!archiveCronCode.includes('!cronSecret') || !archiveCronCode.includes('503')) {
      errors.push('❌ SÉCURITÉ CRON VIOLÉE : /api/cron/archive-pipeline-clients doit exiger CRON_SECRET et renvoyer 503 en cas d\'absence.')
    } else if (archiveCronCode.includes("searchParams.get('key')")) {
      errors.push('❌ SÉCURITÉ CRON VIOLÉE : /api/cron/archive-pipeline-clients ne doit JAMAIS accepter le secret dans l\'URL (?key=).')
    } else {
      console.log('✅ Route /api/cron/archive-pipeline-clients conforme (sécurisée par CRON_SECRET obligatoire via en-têtes uniquement)')
    }
  }

  // 12. Vérifier la protection anti-perte de données et transaction atomique pour l'archivage
  const archiveServicePath = path.resolve(__dirname, '../apps/web/src/server/services/monthly-cycle-archive.service.ts')
  const clientsSyncPath = path.resolve(__dirname, '../apps/web/src/lib/clients-sync.ts')
  if (fs.existsSync(archiveServicePath) && fs.existsSync(clientsSyncPath)) {
    const archiveServiceCode = fs.readFileSync(archiveServicePath, 'utf8')
    const clientsSyncCode = fs.readFileSync(clientsSyncPath, 'utf8')

    if (!archiveServiceCode.includes('archivePipelineDealAtomically')) {
      errors.push('❌ PROTECTION DONNÉES VIOLÉE : monthly-cycle-archive.service.ts doit utiliser archivePipelineDealAtomically pour garantir une transaction atomique.')
    } else if (archiveServiceCode.includes('doc.ref.delete()')) {
      errors.push('❌ SÉCURITÉ DONNÉES VIOLÉE : monthly-cycle-archive.service.ts ne doit JAMAIS appeler doc.ref.delete() hors transaction atomique.')
    } else if (!clientsSyncCode.includes('runTransaction') || !clientsSyncCode.includes('transaction.delete')) {
      errors.push('❌ INTÉGRITÉ TRANSACTIONNELLE VIOLÉE : clients-sync.ts doit effectuer la suppression pipeline dans un commit atomique runTransaction.')
    } else {
      console.log('✅ monthly-cycle-archive.service.ts et clients-sync.ts conformes (archivage transactionnel atomique anti-perte de données)')
    }
  }

  // 13. Balisage et Interdiction absolue de fuite d'UID dans l'interface utilisateur (Noms TM / Commerciaux)
  const managerProspectsListPath = path.resolve(
    __dirname,
    '../apps/web/src/features/imports/components/ManagerProspectsList.tsx'
  )
  const importsRoutePath = path.resolve(
    __dirname,
    '../apps/web/src/app/api/imports/route.ts'
  )

  if (fs.existsSync(managerProspectsListPath) && fs.existsSync(importsRoutePath)) {
    const mplCode = fs.readFileSync(managerProspectsListPath, 'utf8')
    const importsRouteCode = fs.readFileSync(importsRoutePath, 'utf8')

    // Contrôle 1 : ManagerProspectsList ne doit JAMAIS faire de fallback direct sur 'uid'
    if (mplCode.includes('return tm?.name ?? tm?.email ?? uid') || mplCode.includes('return m?.name ?? m?.email ?? uid')) {
      errors.push(
        "❌ RÉGRESSION UI CRITIQUE : ManagerProspectsList.tsx retourne directement un UID brut au lieu d'un libellé humain qualifié."
      )
    }

    if (mplCode.includes('|| selectedTargetTmUid') || mplCode.includes('|| targetTmUid')) {
      errors.push(
        "❌ RÉGRESSION UI CRITIQUE : ManagerProspectsList.tsx utilise un UID brut en fallback pour le nom de TM cible."
      )
    }

    // Contrôle 2 : La route /api/imports doit obligatoirement inclure la résolution par lot des noms d'utilisateurs
    if (!importsRouteCode.includes('userNamesMap') || !importsRouteCode.includes('userIdsToResolve')) {
      errors.push(
        "❌ INTÉGRITÉ DONNÉES VIOLÉE : /api/imports/route.ts doit résoudre par lot les noms d'utilisateurs (userNamesMap) pour garantir transferredToManagerName."
      )
    }

    console.log("✅ Règle anti-fuite d'UID conforme (résolution automatique serveur + garde-fous UI hermétiques)")
  }
} catch (e) {
  errors.push(`❌ Erreur lors du contrôle des règles de calcul de pipeline : ${e.message}`)
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
