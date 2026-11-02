/**
 * scripts/sanitize-team-targets.js
 * Assainit et audite l'ensemble de la collection `teamTargets` dans Firestore :
 * 1. Détecte et régularise les documents sans champ `period` (docs legacy).
 * 2. Réinitialise à 0 les objectifs échus ou non datés.
 * 3. Affiche un état clair de tous les objectifs par manager et période.
 */

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
const { getFirestore, Timestamp } = require('firebase-admin/firestore')

const privateKey = env['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n')
const clientEmail = env['FIREBASE_CLIENT_EMAIL']
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']

const app = initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) })
const db = getFirestore(app)

function isTargetPeriodExpired(periodStr, now = new Date()) {
  if (!periodStr) return true
  const m = periodStr.match(/^(\d{4})-(\d{2})$/)
  if (!m || !m[1] || !m[2]) return true
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  if (nowYear > year) return true
  if (nowYear < year) return false
  return nowMonth > month
}

async function runSanitization() {
  console.log('=== AUDIT & ASSAINISSEMENT DE LA COLLECTION teamTargets ===\n')

  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  console.log(`Période courante du système : ${currentMonth}`)

  const snap = await db.collection('teamTargets').get()
  console.log(`Total documents trouvés dans teamTargets : ${snap.size}\n`)

  let withoutPeriodCount = 0
  let expiredUpdatedCount = 0
  let currentMonthCount = 0
  let corruptCount = 0

  const batch = db.batch()
  let ops = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    const docId = doc.id
    const period = data.period
    const vol = data.targetVolume ?? 0
    const val = data.targetValue ?? 0

    // Vérification cohérence de base
    if (!data.managerUid || !data.memberId) {
      console.warn(`[CORRUPT] Doc ${docId} sans managerUid ou memberId -> suppression recommandée`)
      corruptCount++
      continue
    }

    // Cas 1 : Aucun champ period
    if (!period) {
      withoutPeriodCount++
      console.log(`[SANS PÉRIODE] Doc: ${docId} | Manager: ${data.managerUid} | Membre: ${data.memberName || data.memberId} | Vol: ${vol} | Val: ${val}`)
      
      // Déterminer la date d'origine
      let effectivePeriod = '2026-10' // par défaut mois précédent
      if (data.updatedAt) {
        const d = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        if (!isNaN(d.getTime())) {
          effectivePeriod = d.toISOString().slice(0, 7)
        }
      }

      const expired = isTargetPeriodExpired(effectivePeriod, now)
      batch.update(doc.ref, {
        period: effectivePeriod,
        targetVolume: expired ? 0 : vol,
        targetValue: expired ? 0 : val,
        sanitizedAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      })
      ops++
      expiredUpdatedCount++
    } else {
      // Cas 2 : Période présente
      const expired = isTargetPeriodExpired(period, now)
      if (period === currentMonth) {
        currentMonthCount++
        console.log(`[MOIS COURANT ${period}] Doc: ${docId} | Manager: ${data.managerUid} | Membre: ${data.memberName || data.memberId} | Vol: ${vol} | Val: ${val}`)
      } else if (expired && (vol > 0 || val > 0)) {
        console.log(`[HISTORIQUE/EXPIRÉ ${period}] Doc: ${docId} | Vol: ${vol} | Val: ${val} (Conservé pour historique)`)
      }
    }
  }

  if (ops > 0) {
    await batch.commit()
    console.log(`\n✅ ${ops} document(s) legacy sans période ont été assainis et tagués avec leur période réelle.`)
  } else {
    console.log('\nAucun document legacy sans période à régulariser.')
  }

  console.log(`\nSynthèse :`)
  console.log(`- Documents sans période régularisés : ${withoutPeriodCount}`)
  console.log(`- Documents actifs mois courant (${currentMonth}) : ${currentMonthCount}`)
  console.log(`- Documents corrompus : ${corruptCount}`)
  console.log('\n=== FIN DE L\'ASSAINISSEMENT ===')
}

runSanitization().catch(console.error)

