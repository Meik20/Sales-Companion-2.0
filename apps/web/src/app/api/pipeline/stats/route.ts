import { calculatePipelineStats } from '@/lib/pipeline-metrics'

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/pipeline/stats
 * Récupère les statistiques du pipeline de l'utilisateur connecté.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0 })
    }

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0 })
    }

    // Vérification du rôle utilisateur pour le calcul des statistiques
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const role = userData?.role || 'member'
    const orgRole = userData?.orgRole || null
    const orgCode = userData?.orgCode || null

    const { runOpportunisticAutoArchive } = await import('@/server/services/monthly-cycle-archive.service')
    await runOpportunisticAutoArchive(adminDb)

    let docs: Array<import('firebase-admin/firestore').QueryDocumentSnapshot> = []

    if (role === 'manager' && orgRole === 'senior_manager' && orgCode) {
      // 1. Senior Manager : agrégation consolidée de tous les managers de l'organisation
      const orgManagersSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .where('role', '==', 'manager')
        .get()

      const managerUids = orgManagersSnap.docs.map((d) => d.id)
      if (!managerUids.includes(userId)) managerUids.push(userId)

      const CHUNK_SIZE = 30
      const seen = new Set<string>()
      docs = []

      for (let i = 0; i < managerUids.length; i += CHUNK_SIZE) {
        const chunk = managerUids.slice(i, i + CHUNK_SIZE)
        const snap = await adminDb
          .collection('pipeline')
          .where('managerUid', 'in', chunk)
          .get()

        snap.docs.forEach((doc) => {
          if (!seen.has(doc.id)) {
            seen.add(doc.id)
            docs.push(doc)
          }
        })
      }
    } else if (role === 'manager') {
      // 2. Team Manager : opportunités pilotées sous son managerUid
      const managerSnapshot = await adminDb
        .collection('pipeline')
        .where('managerUid', '==', userId)
        .get()
      docs = managerSnapshot.docs
    } else {
      // 3. Commercial terrain ou indépendant : opportunités assignées ou créées
      const ownedSnapshot = await adminDb.collection('pipeline').where('userId', '==', userId).get()
      const assignedSnapshot = await adminDb
        .collection('pipeline')
        .where('assignedTo', '==', userId)
        .get()
      const seen = new Set<string>()
      docs = []
      for (const snap of [ownedSnapshot, assignedSnapshot]) {
        snap.docs.forEach((doc) => {
          if (!seen.has(doc.id)) {
            seen.add(doc.id)
            docs.push(doc)
          }
        })
      }
    }

    // Exclure les leads archivés des statistiques du pipeline actif
    docs = docs.filter((doc) => doc.data().archived !== true)

    // Résolution des bornes de la période mensuelle pour le calcul exact des affaires conclues
    const { searchParams } = new URL(request.url)
    const reqPeriod = searchParams.get('period')
    const activePeriod = reqPeriod || new Date().toISOString().slice(0, 7)
    const [pYear, pMonth] = activePeriod.split('-').map(Number)
    const periodBounds =
      pYear && pMonth
        ? {
          start: new Date(pYear, pMonth - 1, 1, 0, 0, 0, 0),
          end: new Date(pYear, pMonth, 0, 23, 59, 59, 999)
        }
        : null

    const isConcludedInPeriod = (data: any): boolean => {
      if (!periodBounds) return true
      let d: Date | null = null
      if (data.concludedAt) {
        d = data.concludedAt.toDate ? data.concludedAt.toDate() : new Date(data.concludedAt)
      } else if (data.updatedAt) {
        d = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
      } else if (data.createdAt) {
        d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      }
      if (!data.concludedAt && !data.updatedAt && !data.createdAt) return true
      if (!d || isNaN(d.getTime())) return false
      return d >= periodBounds.start && d <= periodBounds.end
    }

    let prospectionCount = 0
    let prospectionAmount = 0
    let negociationCount = 0
    let negociationAmount = 0
    let conclueCount = 0
    let concludedAmount = 0
    let lostCount = 0

    for (const doc of docs) {
      const data = doc.data()
      const st = String(data.status || '').toLowerCase().trim()
      const amt = typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0

      if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st)) {
        prospectionCount++
        prospectionAmount += amt
      } else if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) {
        negociationCount++
        negociationAmount += amt
      } else if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) {
        if (isConcludedInPeriod(data)) {
          conclueCount++
          concludedAmount += amt
        }
      } else if (st === 'lost' || st === 'perdu' || st === 'perdue') {
        lostCount++
      }
    }

    // RÈGLE §7A : Portefeuille Actif = prospection + négociation (+ conclues du mois actif)
    // Les conclues hors-période (en sursis J+3) ne comptent pas dans le total
    const totalCount = prospectionCount + negociationCount + conclueCount
    const conversionRate = totalCount > 0 ? Math.round((conclueCount / totalCount) * 100) : 0

    const stats = {
      total: totalCount,
      prospection: prospectionCount,
      negotiation: negociationCount,
      conclusion: conclueCount,
      lost: lostCount,
      conversionRate,
      prospectionAmount,
      negotiationAmount: negociationAmount,
      conclusionAmount: concludedAmount
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[pipeline/stats] Error:', error)
    return NextResponse.json({
      total: 0,
      prospection: 0,
      negotiation: 0,
      conclusion: 0,
      lost: 0,
      conversionRate: 0,
      prospectionAmount: 0,
      negotiationAmount: 0,
      conclusionAmount: 0
    })
  }
}
