const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '../.env.local')
const raw = fs.readFileSync(envPath, 'utf8')
const env = {}
const regex = /^([A-Z0-9_]+)=("[\s\S]*?(?<!\\)"|[^\n]*)/gm
let match
while ((match = regex.exec(raw)) !== null) {
  let val = match[2].trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  env[match[1]] = val
}

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const privateKey = env['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n')
const clientEmail = env['FIREBASE_CLIENT_EMAIL']
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']

const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) })
const db = getFirestore(app)

async function heal() {
  console.log('=== DÉMARRAGE DU BACKFILL & RÉPARATION DE L\'ÉQUIPE ===')

  // 1. Récupérer toutes les organisations
  const orgsSnap = await db.collection('organisations').get()
  console.log(`Organisations trouvées : ${orgsSnap.size}`)

  for (const orgDoc of orgsSnap.docs) {
    const orgCode = orgDoc.id
    console.log(`\n── Organisation : ${orgCode} (${orgDoc.data().companyName || 'Sans nom'}) ──`)

    // Managers rattachés à cette org
    const managersSnap = await db.collection('users')
      .where('orgCode', '==', orgCode)
      .where('role', '==', 'manager')
      .get()

    const managerUids = managersSnap.docs.map(d => d.id)
    console.log(`Managers (${managerUids.length}) :`, managerUids)

    if (managerUids.length === 0) continue

    // 2. Parcourir chaque manager et réparer ses team_accesses et users
    for (const mUid of managerUids) {
      const mData = managersSnap.docs.find(d => d.id === mUid)?.data() || {}
      console.log(`  Manager ${mData.email || mUid} (${mData.orgRole})`)

      // A. team_accesses
      const accessSnap = await db.collection('team_accesses').where('managerUid', '==', mUid).get()
      console.log(`    team_accesses trouvés : ${accessSnap.size}`)
      for (const aDoc of accessSnap.docs) {
        const aData = aDoc.data()
        const updates = {}
        if (!aData.orgCode) updates.orgCode = orgCode
        if (!aData.managerEmail && mData.email) updates.managerEmail = mData.email
        if (Object.keys(updates).length > 0) {
          console.log(`      -> Mise à jour team_access ${aDoc.id} (${aData.email || aData.firstname}):`, updates)
          await aDoc.ref.update(updates)
        }
      }

      // B. users (commerciaux rattachés)
      const usersSnap = await db.collection('users').where('managerUid', '==', mUid).get()
      console.log(`    users trouvés : ${usersSnap.size}`)
      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data()
        const updates = {}
        if (!uData.orgCode) updates.orgCode = orgCode
        if (Object.keys(updates).length > 0) {
          console.log(`      -> Mise à jour user ${uDoc.id} (${uData.email}):`, updates)
          await uDoc.ref.update(updates)
        }
      }
    }
  }

  console.log('\n=== RÉPARATION TERMINÉE AVEC SUCCÈS ===')
}

heal().catch(console.error)
