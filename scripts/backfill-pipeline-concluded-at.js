/**
 * scripts/backfill-pipeline-concluded-at.js
 * Script d'audit et de migration des opportunités conclues historiques sans concludedAt.
 *
 * Utilisation :
 *   node scripts/backfill-pipeline-concluded-at.js [--dry-run]
 */

const { adminDb } = require('./lib/firebase-admin-cjs')

async function backfillPipelineConcludedAt(isDryRun = false) {
  console.log(`\n🔍 Début du diagnostic des fiches conclues sans concludedAt (mode ${isDryRun ? 'DRY-RUN' : 'LIVE'})...`)

  if (!adminDb) {
    console.warn('⚠️ adminDb non initialisé (vérifier les identifiants Firebase). Abandon.')
    return
  }

  const snapshot = await adminDb
    .collection('pipeline')
    .where('status', 'in', ['conclue', 'conclusion'])
    .get()

  console.log(`📊 Total fiches conclues trouvées dans le pipeline : ${snapshot.docs.length}`)

  let withConcludedAt = 0
  let missingConcludedAt = 0
  let migrated = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.concludedAt) {
      withConcludedAt++
    } else {
      missingConcludedAt++
      const effectiveDate = data.updatedAt?.toDate
        ? data.updatedAt.toDate()
        : data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.updatedAt
            ? new Date(data.updatedAt)
            : data.createdAt
              ? new Date(data.createdAt)
              : new Date()

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
  console.log(`  ✅ Fiches conformes avec concludedAt : ${withConcludedAt}`)
  console.log(`  ⚠️ Fiches historiques sans concludedAt : ${missingConcludedAt}`)
  if (!isDryRun) {
    console.log(`  ✨ Fiches migrées avec succès : ${migrated}`)
  } else {
    console.log(`  ℹ️ Mode DRY-RUN : aucune écriture effectuée.`)
  }
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run')
  backfillPipelineConcludedAt(isDryRun)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erreur lors du diagnostic :', err)
      process.exit(1)
    })
}

module.exports = { backfillPipelineConcludedAt }
