import { NextRequest, NextResponse } from 'next/server'

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

    // Check if user is manager — get team stats
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const isManager = userData?.role === 'manager'

    let docs: Array<import('firebase-admin').firestore.QueryDocumentSnapshot> = []

    if (isManager) {
      const managerSnapshot = await adminDb.collection('pipeline').where('managerUid', '==', userId).get()
      docs = managerSnapshot.docs
    } else {
      const ownedSnapshot = await adminDb.collection('pipeline').where('userId', '==', userId).get()
      const assignedSnapshot = await adminDb.collection('pipeline').where('assignedTo', '==', userId).get()
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

    const stats = {
      total: docs.length,
      prospection: 0,
      negotiation: 0,
      conclusion: 0,
      lost: 0,
      conversionRate: 0,
    }

    docs.forEach((doc) => {
      const status = doc.data().status as string
      if (status === 'prospection' || status === 'prospect') stats.prospection++
      else if (status === 'negociation' || status === 'negotiation') stats.negotiation++
      else if (status === 'conclue' || status === 'conclusion') stats.conclusion++
      else if (status === 'lost') stats.lost++
    })

    stats.conversionRate =
      stats.total > 0 ? Math.round((stats.conclusion / stats.total) * 100) : 0

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[pipeline/stats] Error:', error)
    return NextResponse.json({ total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0 })
  }
}
