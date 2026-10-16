/**
 * backfill-senior-manager-uid.js
 * 
 * Rétro-migration : propage `seniorManagerUid` sur tous les Team Managers
 * rattachés à une organisation via joinOrgCode qui n'ont pas encore ce champ.
 * 
 * Ce champ est requis pour que le pipeline consolidé du Senior Manager
 * soit stable même après un changement de segment.
 * 
 * Usage : node scripts/backfill-senior-manager-uid.js
 */

const admin = require('firebase-admin')
const path = require('path')

// Charger les credentials service account
const serviceAccountPath = path.resolve(__dirname, '../service-account.json')
let serviceAccount
try {
  serviceAccount = require(serviceAccountPath)
} catch {
  console.error('❌ service-account.json introuvable dans la racine du projet.')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function run() {
  console.log('\n🔍 Recherche des Team Managers sans seniorManagerUid...\n')

  // Récupérer tous les managers de type team_manager
  const tmSnap = await db
    .collection('users')
    .where('role', '==', 'manager')
    .where('orgRole', '==', 'team_manager')
    .get()

  if (tmSnap.empty) {
    console.log('✅ Aucun Team Manager trouvé.')
    return
  }

  // Grouper par orgCode
  const byOrg = new Map()
  tmSnap.docs.forEach((doc) => {
    const data = doc.data()
    if (!data.orgCode) return
    if (data.seniorManagerUid) return // déjà renseigné, skip
    if (!byOrg.has(data.orgCode)) byOrg.set(data.orgCode, [])
    byOrg.get(data.orgCode).push({ id: doc.id, ref: doc.ref, data })
  })

  if (byOrg.size === 0) {
    console.log('✅ Tous les Team Managers ont déjà un seniorManagerUid.')
    return
  }

  console.log(`📋 ${byOrg.size} organisation(s) à traiter...\n`)

  let totalFixed = 0
  let totalSkipped = 0

  for (const [orgCode, tms] of byOrg.entries()) {
    // Récupérer le document organisation pour obtenir le seniorManagerUid
    const orgDoc = await db.collection('organisations').doc(orgCode).get()
    if (!orgDoc.exists) {
      console.warn(`  ⚠️  [${orgCode}] Document organisation introuvable — skip (${tms.length} TM(s))`)
      totalSkipped += tms.length
      continue
    }

    const seniorManagerUid = orgDoc.data()?.seniorManagerUid || null
    if (!seniorManagerUid) {
      console.warn(`  ⚠️  [${orgCode}] seniorManagerUid absent du document organisation — skip (${tms.length} TM(s))`)
      totalSkipped += tms.length
      continue
    }

    // Batch update par chunks de 400
    const CHUNK_SIZE = 400
    for (let i = 0; i < tms.length; i += CHUNK_SIZE) {
      const chunk = tms.slice(i, i + CHUNK_SIZE)
      const batch = db.batch()
      chunk.forEach(({ ref }) => {
        batch.update(ref, {
          seniorManagerUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      })
      await batch.commit()
    }

    console.log(`  ✅ [${orgCode}] seniorManagerUid=${seniorManagerUid} propagé sur ${tms.length} TM(s)`)
    totalFixed += tms.length
  }

  console.log(`\n✅ Migration terminée : ${totalFixed} TM(s) mis à jour, ${totalSkipped} ignoré(s).\n`)
}

run().catch((err) => {
  console.error('❌ Erreur fatale :', err)
  process.exit(1)
})
