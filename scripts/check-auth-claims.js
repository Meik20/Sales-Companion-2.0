// Vérification des Custom Claims Firebase Auth pour le Senior Manager et les Team Managers
// Usage : node scripts/check-auth-claims.js
const fs = require('fs')
const path = require('path')

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
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

const privateKey = env['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n')
const clientEmail = env['FIREBASE_CLIENT_EMAIL']
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']

const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) })
const authAdmin = getAuth(app)
const db = getFirestore(app)

// UIDs à vérifier (Senior + Team Managers de SC-CM-GE9GQ)
const UIDS = [
  's1Jp6S7JRfcmp6ZCeuOle9WOlDj2',   // Senior Manager
  '8oL20QAFAVhZD6PBDiKjkTf56Bi2',   // Team Manager 1
  'kYp9ihtDKLUFgFesHRfRl6qvoen2'    // Team Manager 2
]

async function run() {
  console.log('\n════════════════════════════════════════════')
  console.log('  VÉRIFICATION CUSTOM CLAIMS FIREBASE AUTH')
  console.log('════════════════════════════════════════════\n')

  for (const uid of UIDS) {
    const authUser = await authAdmin.getUser(uid)
    const claims = authUser.customClaims || {}
    const firestoreDoc = await db.collection('users').doc(uid).get()
    const fsData = firestoreDoc.data() || {}

    console.log(`UID: ${uid}`)
    console.log(`  email       : ${authUser.email}`)
    console.log(`  ── Auth Custom Claims ──`)
    console.log(`  role        : ${claims.role || '(non défini)'}`)
    console.log(`  orgRole     : ${claims.orgRole || '(non défini)'}`)
    console.log(`  orgCode     : ${claims.orgCode || '(non défini)'}`)
    console.log(`  plan        : ${claims.plan || '(non défini)'}`)
    console.log(`  ── Firestore users/{uid} ──`)
    console.log(`  role        : ${fsData.role || '(non défini)'}`)
    console.log(`  orgRole     : ${fsData.orgRole || '(non défini)'}`)
    console.log(`  orgCode     : ${fsData.orgCode || '(non défini)'}`)
    console.log(`  ── Cohérence ──`)

    const roleOk = claims.role === fsData.role
    const orgRoleOk = claims.orgRole === fsData.orgRole
    const orgCodeOk = claims.orgCode === fsData.orgCode

    console.log(`  role match  : ${roleOk ? '✅' : '❌  DÉSYNCHRONISÉ'} (Auth: "${claims.role}" / FS: "${fsData.role}")`)
    console.log(`  orgRole match: ${orgRoleOk ? '✅' : '❌  DÉSYNCHRONISÉ'} (Auth: "${claims.orgRole}" / FS: "${fsData.orgRole}")`)
    console.log(`  orgCode match: ${orgCodeOk ? '✅' : '❌  DÉSYNCHRONISÉ'} (Auth: "${claims.orgCode}" / FS: "${fsData.orgCode}")`)

    // Identifier les corrections nécessaires
    const fixes = []
    if (!roleOk) fixes.push(`role: "${fsData.role}"`)
    if (!orgRoleOk) fixes.push(`orgRole: "${fsData.orgRole}"`)
    if (!orgCodeOk) fixes.push(`orgCode: "${fsData.orgCode}"`)

    if (fixes.length > 0) {
      console.log(`\n  ⚠️  CORRECTION NÉCESSAIRE pour ${uid}:`)
      console.log(`  → setCustomUserClaims(uid, { ${fixes.join(', ')} })`)
    }
    console.log()
  }

  // Proposer et appliquer les corrections automatiquement
  console.log('\n════ APPLICATION DES CORRECTIONS ════\n')
  for (const uid of UIDS) {
    const authUser = await authAdmin.getUser(uid)
    const claims = authUser.customClaims || {}
    const firestoreDoc = await db.collection('users').doc(uid).get()
    const fsData = firestoreDoc.data() || {}

    const needsUpdate =
      claims.role !== fsData.role ||
      claims.orgRole !== fsData.orgRole ||
      claims.orgCode !== fsData.orgCode

    if (needsUpdate) {
      const newClaims = {
        ...claims,
        role: fsData.role || claims.role,
        orgRole: fsData.orgRole || claims.orgRole || null,
        orgCode: fsData.orgCode || claims.orgCode || null
      }
      await authAdmin.setCustomUserClaims(uid, newClaims)
      console.log(`✅ Corrigé : ${authUser.email}`)
      console.log(`   Nouveaux claims: role="${newClaims.role}", orgRole="${newClaims.orgRole}", orgCode="${newClaims.orgCode}"`)
    } else {
      console.log(`✅ OK (pas de correction nécessaire): ${authUser.email}`)
    }
  }

  process.exit(0)
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
