// Diagnostic direct Firestore — lecture des managers liés à l'organisation
// Usage : node scripts/diag-org-managers.js
const fs = require('fs')
const path = require('path')

// Lecture manuelle du .env.local avec support des valeurs multi-lignes entre guillemets
const envPath = path.join(__dirname, '../.env.local')
const raw = fs.readFileSync(envPath, 'utf8')
const env = {}

// Parser robuste : gère les valeurs entre guillemets doubles, potentiellement multi-lignes
const regex = /^([A-Z0-9_]+)=("[\s\S]*?(?<!\\)"|[^\n]*)/gm
let match
while ((match = regex.exec(raw)) !== null) {
  let val = match[2].trim()
  // Retirer les guillemets englobants si présents
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1)
  }
  env[match[1]] = val
}

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const privateKey = env['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n')
const clientEmail = env['FIREBASE_CLIENT_EMAIL']
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']

console.log('ProjectId:', projectId)
console.log('ClientEmail:', clientEmail)
console.log('PK length:', privateKey.length)

const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) })
const db = getFirestore(app)

async function run() {
  console.log('\n════ MANAGERS (role="manager") ════')
  const snap = await db.collection('users').where('role', '==', 'manager').get()
  console.log('Count:', snap.size)
  for (const d of snap.docs) {
    const x = d.data()
    console.log('---')
    console.log('UID:', d.id)
    console.log('email:', x.email)
    console.log('role:', x.role)
    console.log('orgRole:', x.orgRole || '(undefined)')
    console.log('orgCode:', x.orgCode || '(undefined)')
    console.log('active:', x.active, '| activated:', x.activated)
  }

  console.log('\n════ USERS avec orgRole="team_manager" ════')
  const snap2 = await db.collection('users').where('orgRole', '==', 'team_manager').get()
  console.log('Count:', snap2.size)
  for (const d of snap2.docs) {
    const x = d.data()
    console.log('UID:', d.id, '| email:', x.email, '| role:', x.role, '| orgCode:', x.orgCode)
  }

  console.log('\n════ USERS avec role="team_manager" (valeur incorrecte) ════')
  const snap3 = await db.collection('users').where('role', '==', 'team_manager').get()
  console.log('Count:', snap3.size)
  for (const d of snap3.docs) {
    const x = d.data()
    console.log('UID:', d.id, '| email:', x.email, '| orgRole:', x.orgRole, '| orgCode:', x.orgCode)
  }

  // Grouper les managers par orgCode
  console.log('\n════ GROUPEMENT PAR orgCode ════')
  const byOrg = {}
  for (const d of snap.docs) {
    const x = d.data()
    const code = x.orgCode || '(aucun)'
    if (!byOrg[code]) byOrg[code] = []
    byOrg[code].push({ uid: d.id, email: x.email, orgRole: x.orgRole })
  }
  for (const [code, members] of Object.entries(byOrg)) {
    const senior = members.find(m => m.orgRole === 'senior_manager')
    const teams = members.filter(m => m.orgRole !== 'senior_manager')
    console.log(`orgCode: ${code}`)
    console.log(`  Senior  : ${senior ? senior.email : '⚠️ AUCUN'}`)
    console.log(`  Teams   : ${teams.length > 0 ? teams.map(t => t.email).join(', ') : '⚠️ AUCUN (0)'}`)
  }

  // Test exact de la query de l'API
  console.log('\n════ TEST QUERY EXACTE DE /api/team/org ════')
  for (const [code] of Object.entries(byOrg)) {
    if (code === '(aucun)') continue
    console.log(`\nQuery: users where orgCode="${code}" AND role="manager"`)
    try {
      const test = await db.collection('users')
        .where('orgCode', '==', code)
        .where('role', '==', 'manager')
        .get()
      console.log(`  → Résultat: ${test.size} doc(s)`)
      for (const d of test.docs) {
        const x = d.data()
        console.log(`    ✅ ${x.email} | orgRole: ${x.orgRole}`)
      }
    } catch (err) {
      console.log(`  ❌ ERREUR:`, err.message)
    }
  }

  process.exit(0)
}

run().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
