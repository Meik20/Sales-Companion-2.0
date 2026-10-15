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
const { getFirestore } = require('firebase-admin/firestore')

const privateKey = env['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n')
const clientEmail = env['FIREBASE_CLIENT_EMAIL']
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']

const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) })
const db = getFirestore(app)

async function main() {
  console.log('--- PIPELINE ITEMS (KOITA) ---')
  const pipeSnap = await db.collection('pipeline').get()
  for (const doc of pipeSnap.docs) {
    const d = doc.data()
    const name = d.companyName || d.name || ''
    if (name.toLowerCase().includes('koita')) {
      console.log(`Pipeline doc ${doc.id}:`, JSON.stringify(d, null, 2))
    }
  }

  console.log('\n--- CLIENTS ITEMS (KOITA) ---')
  const clientSnap = await db.collection('clients').get()
  for (const doc of clientSnap.docs) {
    const d = doc.data()
    const name = d.companyName || d.name || ''
    if (name.toLowerCase().includes('koita')) {
      console.log(`Client doc ${doc.id}:`, JSON.stringify(d, null, 2))
    }
  }

  console.log('\n--- ALL CLIENTS ---')
  console.log(`Total clients in collection 'clients': ${clientSnap.docs.length}`)
  for (const doc of clientSnap.docs) {
    const d = doc.data()
    console.log(`- ${doc.id}: companyName="${d.companyName}", amount=${d.amount}, currency=${d.currency}, managerUid=${d.managerUid}, assignedTo=${d.assignedTo}`)
  }
}

main().catch(console.error)
