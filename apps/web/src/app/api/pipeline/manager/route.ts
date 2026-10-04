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

    // Merge & deduplicate:
    // If a company is already assigned to a team member in teamSnap,
    // the manager's initial unassigned copy is an obsolete duplicate.
    const seen = new Set<string>()
    const assignedCompanies = new Set<string>()
    const items: Record<string, unknown>[] = []

    // 1. Process items assigned to members
    teamSnap.docs.forEach((doc) => {
      seen.add(doc.id)
      const data = doc.data()
      const compName = String(data.companyName || data.name || '').trim().toLowerCase()
      if (compName) {
        assignedCompanies.add(compName)
      }
      items.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null
      })
    })

    // 2. Process manager's own items
    for (const doc of ownSnap.docs) {
      if (!seen.has(doc.id)) {
        const data = doc.data()
        const compName = String(data.companyName || data.name || '').trim().toLowerCase()

        // Si l'entreprise est déjà assignée à un membre de l'équipe et que cette fiche manager n'est pas assignée,
        // c'est un doublon résiduel : on la supprime en arrière-plan et on ne l'affiche pas.
        if (compName && assignedCompanies.has(compName) && !data.assignedTo) {
          doc.ref.delete().catch(() => {})
          continue
        }

        seen.add(doc.id)
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null
        })
      }
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
