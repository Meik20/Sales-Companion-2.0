export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/team/targets
 * Retourne les objectifs (Volume + Valeur) définis par le manager pour chaque membre.
 *
 * Query params:
 *  - memberId?: string  — filtre sur un membre précis
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

    const managerDoc = await adminDb.collection('users').doc(managerUid).get()
    if (!hasActivePaidManagerAccess(managerDoc.data())) {
      return NextResponse.json({ message: 'Un abonnement Manager actif et vérifié est requis.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId') || null

    let query = adminDb
      .collection('teamTargets')
      .where('managerUid', '==', managerUid) as FirebaseFirestore.Query

    if (memberId) {
      query = query.where('memberId', '==', memberId)
    }

    const snap = await query.get()
    const targets = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({ targets }, { status: 200 })
  } catch (error) {
    console.error('[team/targets GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/team/targets
 * Crée ou met à jour les objectifs d'un membre.
 *
 * Body JSON:
 * {
 *   memberId: string
 *   memberName?: string
 *   targetVolume: number   // objectif en nombre de prospects
 *   targetValue: number    // objectif en montant (FCFA)
 *   period?: string        // ex : "2026-Q1", "2026-S1", "2026-12"
 * }
 */
export async function POST(request: NextRequest) {
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

    // ── Contrôle de rôle : seul un manager ou un admin peut définir des objectifs ──
    const callerDoc = await adminDb.collection('users').doc(managerUid).get()
    const callerRole = callerDoc.data()?.role as string | undefined

    if (callerRole !== 'admin' && !hasActivePaidManagerAccess(callerDoc.data())) {
      return NextResponse.json(
        { message: 'Accès refusé. Seul un manager peut définir des objectifs.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberId, memberName, targetVolume, targetValue, period } = body

    if (!memberId) {
      return NextResponse.json({ message: 'memberId requis' }, { status: 400 })
    }

    // Upsert : on crée un doc dont l'id est unique par managerUid + memberId + period
    const docId = `${managerUid}_${memberId}${period ? `_${period}` : ''}`
    const docRef = adminDb.collection('teamTargets').doc(docId)

    await docRef.set(
      {
        managerUid,
        memberId,
        memberName: memberName ?? null,
        targetVolume: typeof targetVolume === 'number' ? targetVolume : null,
        targetValue: typeof targetValue === 'number' ? targetValue : null,
        period: period ?? null,
        updatedAt: new Date()
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, id: docId }, { status: 200 })
  } catch (error) {
    console.error('[team/targets POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
