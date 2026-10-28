import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestUser, getFirebaseAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/team/members
 *
 * Retourne les membres COMMERCIAUX (role: 'member') rattachés à un Team Manager.
 *
 * INVARIANT MÉTIER : les support_agents (role: 'support_agent') sont
 * FORMELLEMENT EXCLUS de cette réponse. Un Agent Support appartient à l'espace
 * CRM / SAV du Team Manager, pas à l'équipe commerciale terrain. Cette route
 * est consommée par la vue "Supervised Sales Reps" du Senior Manager — mélanger
 * les deux rôles induirait des erreurs de calcul de métriques commerciales.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRequestUser(request)
    if ('error' in auth) return auth.error

    const { adminDb } = await getFirebaseAdmin()
    const { searchParams } = new URL(request.url)
    const requestedManagerUid = searchParams.get('managerUid')
    const allOrg = searchParams.get('all') === 'true'

    const callerDoc = await adminDb.collection('users').doc(auth.user.uid).get()
    const callerData = callerDoc.data()
    const isSenior = callerData?.orgRole === 'senior_manager'
    const orgCode = callerData?.orgCode as string | undefined

    let query: FirebaseFirestore.Query = adminDb.collection('team_accesses')

    if (isSenior && orgCode && (allOrg || requestedManagerUid)) {
      if (requestedManagerUid) {
        query = query.where('managerUid', '==', requestedManagerUid)
      } else {
        query = query.where('orgCode', '==', orgCode)
      }
    } else {
      query = query.where('managerUid', '==', auth.user.uid)
    }

    const snap = await query.get()

    const candidateDocs = snap.docs.filter((doc) => {
      const data = doc.data()
      // EXCLUSION FORMELLE : les support_agents ne font pas partie de l'équipe commerciale
      if (data.role === 'support_agent') return false
      // EXCLUSION FORMELLE : accès inactifs, révoqués ou déjà promus
      if (['promoted', 'revoked', 'inactive', 'cancelled'].includes(data.status)) return false
      return true
    })

    // Récupérer les UIDs pour vérifier leur rôle actuel dans `users`
    const uidsToCheck = Array.from(
      new Set(
        candidateDocs
          .map((d) => d.data().firebaseUid || d.data().activatedUid || d.data().memberId)
          .filter(Boolean)
      )
    ) as string[]

    const nonMemberUidSet = new Set<string>()
    if (uidsToCheck.length > 0) {
      const CHUNK_SIZE = 30
      for (let i = 0; i < uidsToCheck.length; i += CHUNK_SIZE) {
        const chunk = uidsToCheck.slice(i, i + CHUNK_SIZE)
        const refs = chunk.map((uid) => adminDb.collection('users').doc(uid))
        const userSnaps = await adminDb.getAll(...refs)
        userSnaps.forEach((s) => {
          if (s.exists) {
            const ud = s.data()
            // Si l'utilisateur est maintenant un manager, admin ou support, il n'est plus un commercial
            if (ud?.role === 'manager' || ud?.role === 'admin' || ud?.role === 'support_agent') {
              nonMemberUidSet.add(s.id)
            }
          }
        })
      }
    }

    const members = candidateDocs
      .filter((doc) => {
        const data = doc.data()
        const uid = data.firebaseUid || data.activatedUid || data.memberId
        if (uid && nonMemberUidSet.has(uid)) return false
        return true
      })
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          firebaseUid: data.firebaseUid || data.activatedUid || data.memberId || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null
        }
      })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Team members error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
