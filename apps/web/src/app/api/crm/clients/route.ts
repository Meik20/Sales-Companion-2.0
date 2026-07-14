export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/crm/clients
 *
 * Retourne tous les prospects au statut "conclue/conclusion" pour l'agent support.
 * Agrège les clients de tous les managers liés à l'agent (managerUid + linkedManagerUids).
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Récupérer le profil de l'agent
    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()

    if (!agentData) {
      return NextResponse.json({ message: 'Profil agent introuvable' }, { status: 404 })
    }

    // Autoriser managers ET support_agents
    if (!['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    // Construire la liste des managerUids accessibles
    let managerUids: string[] = []

    if (agentData.role === 'support_agent') {
      managerUids = [
        agentData.managerUid,
        ...(agentData.linkedManagerUids ?? [])
      ].filter(Boolean) as string[]
    } else if (agentData.role === 'manager') {
      // Un manager peut aussi accéder à cette API pour voir ses clients conclus
      managerUids = [agentUid]
    } else if (agentData.role === 'admin') {
      // Admin voit tout — pas de filtre par manager
      const allSnap = await adminDb
        .collection('pipeline')
        .where('status', 'in', ['conclue', 'conclusion'])
        .get()

      const clients = allSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
        nextFollowUp: doc.data().nextFollowUp?.toDate?.()?.toISOString() ?? doc.data().nextFollowUp ?? null
      }))
      return NextResponse.json(clients)
    }

    if (managerUids.length === 0) {
      return NextResponse.json([])
    }

    // Requêtes parallèles par managerUid (Firestore ne supporte pas WHERE IN sur 2 champs)
    const snapshots = await Promise.all(
      managerUids.map(uid =>
        adminDb
          .collection('pipeline')
          .where('managerUid', '==', uid)
          .where('status', 'in', ['conclue', 'conclusion'])
          .get()
      )
    )

    // Fusionner et dédupliquer
    const seen = new Set<string>()
    const clients: Record<string, unknown>[] = []

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          clients.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
            nextFollowUp: doc.data().nextFollowUp?.toDate?.()?.toISOString() ?? doc.data().nextFollowUp ?? null
          })
        }
      }
    }

    // Trier par date de mise à jour décroissante
    clients.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0
      const tb = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('[crm/clients GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
