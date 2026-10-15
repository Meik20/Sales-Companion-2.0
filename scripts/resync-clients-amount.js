/**
 * Script de re-synchronisation ponctuelle des documents "clients" dont le montant est null.
 *
 * CONTEXTE :
 * Un bug de race condition dans l'ancienne version de clients-sync.ts pouvait entraîner
 * la sauvegarde d'un client avec amount=null même si la fiche pipeline avait un montant défini.
 *
 * Ce script :
 * 1. Parcourt tous les documents de la collection "clients" avec amount=null
 * 2. Pour chaque client, retrouve la fiche pipeline source via pipelineItemId
 * 3. Si la fiche pipeline a un montant valide, met à jour le client avec ce montant
 *
 * Usage : node scripts/resync-clients-amount.js
 * AGENTS.md : Ce script agit sur le rôle (status) et les données financières globalement,
 * pas sur un compte test spécifique.
 */

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
  console.log('══════════════════════════════════════════════════')
  console.log('  RE-SYNC CLIENTS — Correction des montants nuls')
  console.log('══════════════════════════════════════════════════\n')

  // 1. Récupérer tous les clients avec amount null ou 0
  const clientsSnap = await db.collection('clients').get()
  const toFix = []

  for (const doc of clientsSnap.docs) {
    const d = doc.data()
    if (d.amount == null || d.amount === 0) {
      toFix.push({ id: doc.id, data: d })
    }
  }

  console.log(`Clients à vérifier (amount=null ou 0) : ${toFix.length}`)

  if (toFix.length === 0) {
    console.log('Aucun client à corriger. Base de données saine.')
    return
  }

  let fixed = 0
  let skipped = 0
  let pipelineNotFound = 0

  for (const { id, data: clientData } of toFix) {
    const pipelineItemId = clientData.pipelineItemId

    if (!pipelineItemId) {
      console.log(`  [SKIP] ${id} — pas de pipelineItemId`)
      skipped++
      continue
    }

    // 2. Retrouver la fiche pipeline source
    const pipeSnap = await db.collection('pipeline').doc(pipelineItemId).get()

    if (!pipeSnap.exists) {
      console.log(`  [PIPELINE INTROUVABLE] ${id} — pipeline/${pipelineItemId} n'existe plus`)
      pipelineNotFound++
      continue
    }

    const pipeData = pipeSnap.data() || {}
    let dealAmount = null

    if (pipeData.amount != null && pipeData.amount !== '') {
      dealAmount = Number(pipeData.amount)
    } else if (pipeData.estimatedDeal != null && pipeData.estimatedDeal !== '') {
      dealAmount = Number(pipeData.estimatedDeal)
    }

    if (dealAmount == null || isNaN(dealAmount)) {
      console.log(`  [SKIP] ${id} — pipeline/${pipelineItemId} n'a pas non plus de montant valide`)
      skipped++
      continue
    }

    // 3. Mettre à jour le client avec le montant correct
    const currency = pipeData.currency || clientData.currency || 'XAF'
    await db.collection('clients').doc(id).update({
      amount: dealAmount,
      currency,
      updatedAt: new Date()
    })

    console.log(`  [FIXÉ] ${id} (${clientData.companyName}) → amount=${dealAmount} ${currency}`)
    fixed++
  }

  console.log('\n══════════════════════════════════════════════════')
  console.log(`  Résultats :`)
  console.log(`  - Corrigés       : ${fixed}`)
  console.log(`  - Ignorés        : ${skipped}`)
  console.log(`  - Pipeline perdu : ${pipelineNotFound}`)
  console.log('══════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('[resync-clients-amount] Erreur fatale :', err)
  process.exit(1)
})
