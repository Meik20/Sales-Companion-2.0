export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/pipeline
 * Returns the pipeline items for the authenticated user (member or manager).
 * For members: items where userId === uid
 * Sorted in memory to avoid composite index requirement.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Fetch owned items plus any explicitly assigned items.
    const ownedSnap = await adminDb.collection('pipeline').where('userId', '==', userId).get()

    const assignedSnap = await adminDb
      .collection('pipeline')
      .where('assignedTo', '==', userId)
      .get()

    const seen = new Set<string>()
    const items = [] as Array<Record<string, unknown>>

    for (const snap of [ownedSnap, assignedSnap]) {
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
    console.error('[pipeline GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/pipeline
 * Adds a company to the authenticated user's own pipeline.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const companyName = (body.companyName ?? body.name ?? '') as string
    const status =
      typeof body.status === 'string'
        ? body.status === 'prospect'
          ? 'prospection'
          : body.status === 'negotiation'
            ? 'negociation'
            : body.status === 'conclusion'
              ? 'conclue'
              : body.status
        : 'prospection'

    if (!companyName) {
      return NextResponse.json({ message: 'companyName requis' }, { status: 400 })
    }

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data() || {}
    const isManagerUser = userData.role === 'manager'
    const orgCode = (userData.orgCode as string) || null
    // Multi-tenant guard : le managerUid est EXCLUSIVEMENT déduit du profil serveur
    const managerUid = isManagerUser ? userId : (userData.managerUid as string | null) || null

    // ── Find previous assignees (Strictement isolé par Organisation / Manager) ──
    const prevAssigneesMap = new Map<
      string,
      { userId: string; memberName: string; assignedAt: string }
    >()
    if (companyName) {
      try {
        let query = adminDb.collection('pipeline').where('companyName', '==', companyName)
        if (orgCode) {
          query = query.where('orgCode', '==', orgCode)
        } else if (managerUid) {
          query = query.where('managerUid', '==', managerUid)
        } else {
          query = query.where('userId', '==', userId)
        }

        const byName = await query.get()
        byName.docs.forEach((doc) => {
          const d = doc.data()
          const isManager =
            d.role === 'manager' ||
            d.isManager === true ||
            (d.managerUid && d.userId === d.managerUid)
          if (d.userId && d.userId !== userId && !isManager) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) {
        console.error('Error fetching previousAssignees by companyName', err)
      }
    }
    const previousAssignees = Array.from(prevAssigneesMap.values())

    const ref = adminDb.collection('pipeline').doc()
    await ref.set({
      userId,
      managerUid,
      orgCode,
      companyName,
      name: companyName,
      status,
      ...Object.fromEntries(
        Object.entries(body).filter(
          ([k]) =>
            ![
              'userId',
              'managerUid',
              'orgCode',
              'createdAt',
              'updatedAt',
              'status',
              'previousAssignees'
            ].includes(k)
        )
      ),
      previousAssignees,
      enteredAt: new Date().toISOString(),
      assignedAt: body.assignedTo ? new Date().toISOString() : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (error) {
    console.error('[pipeline POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
