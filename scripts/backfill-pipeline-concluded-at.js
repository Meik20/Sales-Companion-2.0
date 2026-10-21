const fs = require('fs')
const path = require('path')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

function getAdminDb() {
  if (getApps().length > 0) {
    return getFirestore(getApps()[0])
  }
  const envPath = path.join(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️ Aucun fichier .env.local trouvé.')
    return null
  }
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  const regex = /^([A-Z0-9_]+)=("[\s\S]*?(?<!\\)"|[^\n]*)/gm
  let match
  while ((match = regex.exec(raw)) !== null) {
    let val = match[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1)
    }
    env[match[1]] = val
  }

  const privateKey = (env['FIREBASE_PRIVATE_KEY'] || process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  const clientEmail = env['FIREBASE_CLIENT_EMAIL'] || process.env.FIREBASE_CLIENT_EMAIL
  const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!privateKey || !clientEmail || !projectId) {
    console.warn('⚠️ Identifiants Firebase incomplets dans .env.local.')
    return null
  }

  const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }), projectId })
  const db = getFirestore(app)
  db.projectId = projectId
  return db
}

async function backfillPipelineConcludedAt(isDryRun = false, customDb = null) {
  const adminDb = customDb || getAdminDb()
  if (!adminDb) {
    const errorMsg = '❌ ERREUR FATALE : adminDb non initialisé. Vérifiez que .env.local ou les variables d\'environnement FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL et NEXT_PUBLIC_FIREBASE_PROJECT_ID sont définies.'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  const projectId = adminDb.projectId || adminDb.app?.options?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'inconnu'
  console.log(`\n🔍 Début du diagnostic des fiches conclues sans concludedAt (mode ${isDryRun ? 'DRY-RUN' : 'LIVE'})...`)
  console.log(`🎯 Projet Firebase ciblé : ${projectId}`)

  const snapshot = await adminDb
    .collection('pipeline')
    .where('status', 'in', ['conclue', 'conclusion'])
    .get()

  console.log(`📊 Total fiches conclues trouvées dans le pipeline : ${snapshot.docs.length}`)

  let withConcludedAt = 0
  let missingConcludedAt = 0
  let migrated = 0
  let unresolvable = 0
  const unresolvableDocs = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.concludedAt) {
      withConcludedAt++
    } else {
      missingConcludedAt++
      let effectiveDate = data.updatedAt?.toDate
        ? data.updatedAt.toDate()
        : data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.updatedAt
            ? new Date(data.updatedAt)
            : data.createdAt
              ? new Date(data.createdAt)
              : null

      // Repli sur les métadonnées natives du document Firestore
      if (!effectiveDate && doc.createTime) {
        effectiveDate = doc.createTime.toDate ? doc.createTime.toDate() : new Date(doc.createTime)
      }

      if (!effectiveDate || isNaN(effectiveDate.getTime())) {
        console.warn(`  ⚠️ Fiche ${doc.id} (${data.companyName || 'Sans nom'}) : aucune date exploitable trouvée ! Préservée sans modification pour revue.`)
        unresolvable++
        unresolvableDocs.push({ id: doc.id, companyName: data.companyName })
        continue
      }

      console.log(`  - Fiche ${doc.id} (${data.companyName || 'Sans nom'}) : concludedAt absent -> résolu à ${effectiveDate.toISOString()}`)

      if (!isDryRun) {
        await doc.ref.update({
          concludedAt: effectiveDate,
          backfilledAt: new Date()
        })
        migrated++
      }
    }
  }

  console.log('\n📋 Bilan du diagnostic :')
  console.log(`  🎯 Projet : ${projectId}`)
  console.log(`  ✅ Fiches conformes avec concludedAt : ${withConcludedAt}`)
  console.log(`  ⚠️ Fiches historiques sans concludedAt : ${missingConcludedAt}`)
  console.log(`  ❓ Fiches sans aucune date exploitable : ${unresolvable}`)
  if (!isDryRun) {
    console.log(`  ✨ Fiches migrées avec succès : ${migrated}`)
  } else {
    console.log(`  ℹ️ Mode DRY-RUN : aucune écriture effectuée.`)
  }

  return {
    projectId,
    total: snapshot.docs.length,
    withConcludedAt,
    missingConcludedAt,
    migrated,
    unresolvable,
    unresolvableDocs
  }
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run')
  backfillPipelineConcludedAt(isDryRun)
    .then((result) => {
      if (result && result.unresolvable > 0) {
        console.warn(`\n⚠️ ATTENTION : ${result.unresolvable} fiche(s) sans date exploitable nécessite(nt) un arbitrage.`)
      }
      process.exit(0)
    })
    .catch((err) => {
      console.error('\n❌ Échec de la migration / diagnostic :', err.message || err)
      process.exit(1)
    })
}

module.exports = { backfillPipelineConcludedAt }
