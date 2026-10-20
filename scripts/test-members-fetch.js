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

async function testFetch() {
  const orgCode = 'SC-CM-GE9GQ'
  const seniorUid = 's1Jp6S7JRfcmp6ZCeuOle9WOlDj2'

  console.log('Testing unified members fetch for org:', orgCode)

  const managersSnap = await db.collection('users')
    .where('orgCode', '==', orgCode)
    .where('role', '==', 'manager')
    .get()

  const orgManagerUids = Array.from(new Set([seniorUid, ...managersSnap.docs.map(d => d.id)]))
  console.log('Org managers:', orgManagerUids)

  const queryPromises = [
    db.collection('team_accesses').where('orgCode', '==', orgCode).get(),
    db.collection('team_accesses').where('managerUid', 'in', orgManagerUids).get()
  ]

  const results = await Promise.all(queryPromises)
  const byKey = new Map()

  for (const snap of results) {
    for (const doc of snap.docs) {
      const data = doc.data()
      if (data.role === 'manager' || data.orgRole === 'team_manager' || data.orgRole === 'senior_manager') continue

      const key = (data.firebaseUid || data.email || doc.id).toLowerCase()
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: doc.id,
          ...data,
          firebaseUid: data.firebaseUid || data.activatedUid || null
        })
      } else {
        const existing = byKey.get(key)
        byKey.set(key, { ...existing, ...data })
      }
    }
  }

  const members = Array.from(byKey.values())
  console.log('\nTotal unified members found:', members.length)

  const grouped = {}
  for (const m of members) {
    const mUid = m.managerUid || 'unknown'
    if (!grouped[mUid]) grouped[mUid] = []
    grouped[mUid].push(m)
  }

  for (const [mUid, list] of Object.entries(grouped)) {
    console.log(`\nManager ${mUid} has ${list.length} member(s):`)
    for (const m of list) {
      console.log(`  - ${m.firstname} ${m.lastname} (${m.email}) [role: ${m.role || 'member'}] [status: ${m.status}]`)
    }
  }
}

testFetch().catch(console.error)
