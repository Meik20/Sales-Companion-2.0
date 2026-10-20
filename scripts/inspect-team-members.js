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

async function inspect() {
  const tmUid = '8oL20QAFAVhZD6PBDiKjkTf56Bi2'
  console.log('=== INSPECTING FOR TM UID:', tmUid, '===')

  // 1. team_accesses where managerUid == tmUid
  console.log('\n--- team_accesses where managerUid == tmUid ---')
  const snap1 = await db.collection('team_accesses').where('managerUid', '==', tmUid).get()
  console.log('Count:', snap1.size)
  for (const doc of snap1.docs) {
    console.log('team_access id:', doc.id, doc.data())
  }

  // 2. team_accesses where orgCode == 'SC-CM-GE9GQ'
  console.log('\n--- team_accesses where orgCode == "SC-CM-GE9GQ" ---')
  const snap2 = await db.collection('team_accesses').where('orgCode', '==', 'SC-CM-GE9GQ').get()
  console.log('Count:', snap2.size)
  for (const doc of snap2.docs) {
    console.log('team_access id:', doc.id, 'managerUid:', doc.data().managerUid, 'email:', doc.data().email, 'firstname:', doc.data().firstname)
  }

  // 3. all team_accesses (just in case)
  console.log('\n--- all team_accesses count ---')
  const snap3 = await db.collection('team_accesses').get()
  console.log('Total team_accesses:', snap3.size)
  for (const doc of snap3.docs) {
    const d = doc.data()
    console.log('id:', doc.id, '| managerUid:', d.managerUid, '| orgCode:', d.orgCode, '| email:', d.email, '| name:', d.firstname, d.lastname)
  }

  // 4. users where managerUid == tmUid
  console.log('\n--- users where managerUid == tmUid ---')
  const snap4 = await db.collection('users').where('managerUid', '==', tmUid).get()
  console.log('Count:', snap4.size)
  for (const doc of snap4.docs) {
    console.log('user id:', doc.id, doc.data().email, doc.data().role, doc.data().orgCode)
  }

  // 5. users where orgCode == 'SC-CM-GE9GQ'
  console.log('\n--- users where orgCode == "SC-CM-GE9GQ" ---')
  const snap5 = await db.collection('users').where('orgCode', '==', 'SC-CM-GE9GQ').get()
  console.log('Count:', snap5.size)
  for (const doc of snap5.docs) {
    const d = doc.data()
    console.log('user id:', doc.id, '| email:', d.email, '| role:', d.role, '| orgRole:', d.orgRole, '| managerUid:', d.managerUid)
  }
}

inspect().catch(console.error)
