export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { isTargetPeriodExpired } from '@/lib/monthly-cycle'

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
      return NextResponse.json(
        { message: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId') || null
    const reqManagerUid = searchParams.get('managerUid') || null

    const userData = managerDoc.data() || {}
    const isSeniorManager = userData.orgRole === 'senior_manager' && Boolean(userData.orgCode)
    const isIndependent = userData.role === 'independent'

    // Helper pour récupérer les identifiants des commerciaux sous contrat actif pour chaque manager
    async function getActiveMemberIdsByManager(uids: string[]): Promise<Record<string, Set<string>>> {
      const map: Record<string, Set<string>> = {}
      for (const u of uids) {
        map[u] = new Set<string>()
      }
      if (isIndependent && managerUid) {
        map[managerUid]?.add(managerUid)
      }
      for (let i = 0; i < uids.length; i += 30) {
        const chunk = uids.slice(i, i + 30)
        const teamAccessesSnap = await adminDb
          .collection('team_accesses')
          .where('managerUid', 'in', chunk)
          .get()

        for (const d of teamAccessesSnap.docs) {
          const data = d.data()
          if (data.role === 'support_agent' || data.status === 'promoted') continue
          const mUid = data.managerUid
          if (mUid && map[mUid]) {
            map[mUid].add(d.id)
            if (data.firebaseUid) map[mUid].add(data.firebaseUid)
            if (data.activatedUid) map[mUid].add(data.activatedUid)
            if (data.memberId) map[mUid].add(data.memberId)
          }
        }
      }
      return map
    }

    let targets: Array<{ id: string; [key: string]: any }> = []

    if (isSeniorManager) {
      // ── Vue consolidée Senior Manager : récupérer les objectifs des managers de l'organisation ──
      const orgManagersSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', userData.orgCode)
        .where('role', '==', 'manager')
        .get()

      const allowedManagerUids = orgManagersSnap.docs.map((d) => d.id)
      if (!allowedManagerUids.includes(managerUid)) {
        allowedManagerUids.push(managerUid)
      }

      let targetManagerUids: string[] = []
      if (reqManagerUid) {
        if (!allowedManagerUids.includes(reqManagerUid)) {
          return NextResponse.json(
            { message: 'Accès non autorisé aux données de ce manager' },
            { status: 403 }
          )
        }
        targetManagerUids = [reqManagerUid]
      } else {
        targetManagerUids = allowedManagerUids
      }

      if (targetManagerUids.length === 0) {
        return NextResponse.json({ targets: [] }, { status: 200 })
      }

      // Traitement par lots de 30 (limite Firestore de la clause 'in')
      const chunks: string[][] = []
      for (let i = 0; i < targetManagerUids.length; i += 30) {
        chunks.push(targetManagerUids.slice(i, i + 30))
      }

      const snaps = await Promise.all(
        chunks.map((chunk) => {
          let q = adminDb.collection('teamTargets').where('managerUid', 'in', chunk) as FirebaseFirestore.Query
          if (memberId) {
            q = q.where('memberId', '==', memberId)
          }
          return q.get()
        })
      )

      targets = snaps.flatMap((snap) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

      // Source de vérité : filtrer strictement par les membres actifs sous contrat de chaque Team Manager
      const activeMembersMap = await getActiveMemberIdsByManager(targetManagerUids)
      targets = targets.filter((t) => {
        if (!t.managerUid || !t.memberId) return false
        const activeSet = activeMembersMap[t.managerUid]
        return Boolean(activeSet && activeSet.has(t.memberId))
      })
    } else {
      let query = adminDb
        .collection('teamTargets')
        .where('managerUid', '==', managerUid) as FirebaseFirestore.Query

      if (memberId) {
        query = query.where('memberId', '==', memberId)
      }

      const snap = await query.get()
      targets = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Source de vérité : filtrer strictement par les membres actifs de l'équipe (élimine les orphelins)
      const activeMembersMap = await getActiveMemberIdsByManager([managerUid])
      const activeSet = activeMembersMap[managerUid] ?? new Set()
      targets = targets.filter((t) => t.memberId && activeSet.has(t.memberId))
    }

    // Réinitialisation automatique à 00 des objectifs sans période ou dont la période mensuelle est échue
    const now = new Date()
    const sanitizedTargets = targets.map((t) => {
      if (!t.period || isTargetPeriodExpired(t.period, now)) {
        return { ...t, targetVolume: 0, targetValue: 0 }
      }
      return t
    })

    return NextResponse.json({ targets: sanitizedTargets }, { status: 200 })
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

    // Garantir une période mensuelle valide par défaut (mois civil en cours YYYY-MM)
    const currentMonthPeriod = new Date().toISOString().slice(0, 7)
    const activePeriod = period || currentMonthPeriod

    // Upsert : on crée un doc dont l'id est unique par managerUid + memberId + period
    const docId = `${managerUid}_${memberId}_${activePeriod}`
    const docRef = adminDb.collection('teamTargets').doc(docId)

    await docRef.set(
      {
        managerUid,
        orgCode: callerDoc.data()?.orgCode || null,
        memberId,
        memberName: memberName ?? null,
        targetVolume: typeof targetVolume === 'number' ? targetVolume : null,
        targetValue: typeof targetValue === 'number' ? targetValue : null,
        period: activePeriod,
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
