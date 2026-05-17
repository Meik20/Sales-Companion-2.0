export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/pipeline/manager
 *
 * Returns the consolidated pipeline for the manager:
 * ALL pipeline items where managerUid === currentUser.uid
 * (includes items assigned to members via team assignments).
 *
 * Sorted in memory — no composite index needed.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Items assigned TO the team (managerUid set by team assignments route)
    const teamSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .get()

    // Items in the manager's own pipeline (userId = managerUid)
    const ownSnap = await adminDb.collection('pipeline').where('userId', '==', managerUid).get()

    // Merge & deduplicate by doc id
    const seen = new Set<string>()
    const items: Record<string, unknown>[] = []

    for (const snap of [teamSnap, ownSnap]) {
      snap.docs.forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          items.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null
          })
        }
      })
    }

    items.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('[pipeline/manager GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
