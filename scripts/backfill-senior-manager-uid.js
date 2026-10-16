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

const fs = require('fs')
const path = require('path')

// Lecture manuelle du .env.local avec support des valeurs multi-lignes entre guillemets
const envPath = path.join(__dirname, '../.env.local')
const raw = fs.readFileSync(envPath, 'utf8')
const env = {}
const regex = /^([A-Z0-9_]+)=("[\s\S]*?(?<!\\)"|[^\n]*)/gm
let m
while ((m = regex.exec(raw)) !== null) {
  let v = m[2].trim()
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
  env[m[1]] = v
}

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const privateKey = env['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n')
const clientEmail = env['FIREBASE_CLIENT_EMAIL']
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']

const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) })
const db = getFirestore(app)

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
          updatedAt: new Date()
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
