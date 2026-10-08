export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/pipeline/add
 * Ajoute une entreprise au pipeline de l'utilisateur (via Firebase Admin SDK).
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    // Auth check
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const callerDoc = await adminDb.collection('users').doc(userId).get()
    const callerData = callerDoc.data()
    if (
      !callerData ||
      callerData.active !== true ||
      callerData.activated !== true ||
      callerData.emailVerified !== true
    ) {
      return NextResponse.json(
        { message: 'Un compte actif et vérifié est requis.' },
        { status: 403 }
      )
    }
    if (callerData.role === 'manager' && !hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif est requis.' },
        { status: 403 }
      )
    }
    if (!['manager', 'independent', 'member'].includes(callerData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })
    }

    const {
      companyId,
      companyName,
      companySector,
      companyCity,
      companyPhone,
      companyEmail,
      googlePlaceId
    } = body as {
      companyId?: string
      companyName?: string
      companySector?: string
      companyCity?: string
      companyPhone?: string
      companyEmail?: string
      googlePlaceId?: string | null
    }

    const isManagerRole = callerData.role === 'manager'
    const managerUid = isManagerRole ? userId : (callerData.managerUid as string | null | undefined)
    const assignedTo = isManagerRole ? null : userId
    const memberName = isManagerRole ? null : (callerData.name ?? callerData.displayName ?? null)
    const memberAccessId = isManagerRole ? null : (callerData.accessId ?? null)

    if (!companyName) {
      return NextResponse.json({ message: 'companyName requis' }, { status: 400 })
    }

    let finalPhone = companyPhone
    let finalWebsite = null

    // ── Fetch Google Place Details si googlePlaceId est présent ──
    if (googlePlaceId) {
      const googleApiKey =
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
      if (googleApiKey) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=formatted_phone_number,website&key=${googleApiKey}`
          const gRes = await fetch(url)
          const gData = await gRes.json()
          if (gData.result) {
            if (gData.result.formatted_phone_number && !finalPhone)
              finalPhone = gData.result.formatted_phone_number
            if (gData.result.website) finalWebsite = gData.result.website
          }
        } catch (err) {
          console.error('[pipeline/add] Google Place Details Error:', err)
        }
      }
    }

    const callerOrgCode = (callerData.orgCode as string) || null

    // ── Step: Find previous assignees (Strictement isolé par Organisation / Manager) ──
    const prevAssigneesMap = new Map<
      string,
      { userId: string; memberName: string; assignedAt: string }
    >()
    if (companyId || companyName) {
      try {
        let query = adminDb.collection('pipeline') as FirebaseFirestore.Query
        if (companyId) {
          query = query.where('companyId', '==', companyId)
        } else {
          query = query.where('companyName', '==', companyName)
        }

        if (callerOrgCode) {
          query = query.where('orgCode', '==', callerOrgCode)
        } else if (managerUid) {
          query = query.where('managerUid', '==', managerUid)
        } else {
          query = query.where('userId', '==', userId)
        }

        const snap = await query.get()
        snap.docs.forEach((doc) => {
          const d = doc.data()
          const isManager =
            d.userId === managerUid || d.assignedTo === managerUid || d.role === 'manager'
          if (d.userId && d.userId !== userId && !isManager) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) {
        console.error('[pipeline/add] Error fetching previousAssignees', err)
      }
    }
    const previousAssignees = Array.from(prevAssigneesMap.values())

    // Un manager qui ajoute un prospect depuis la recherche:
    //   - userId = managerUid (il est le propriétaire)
    //   - assignedTo = null (pas encore assigné à un membre)
    //   - memberName = null
    // Un member qui ajoute son propre prospect:
    //   - userId = memberId
    //   - assignedTo = memberId (lui-même)
    //   - memberName = son propre nom
    const finalAssignedTo = assignedTo
    const finalMemberName = memberName

    const now = new Date()
    const docRef = await adminDb.collection('pipeline').add({
      userId,
      managerUid: managerUid ?? null,
      orgCode: callerData.orgCode ?? null,
      assignedTo: finalAssignedTo,
      memberName: finalMemberName,
      memberAccessId: isManagerRole ? null : (memberAccessId ?? null),
      companyId: companyId ?? null,
      companyName: companyName,
      companySector: companySector ?? null,
      companyCity: companyCity ?? null,
      companyPhone: finalPhone ?? null,
      companyEmail: companyEmail ?? null,
      companyWebsite: finalWebsite ?? null,
      status: 'prospection',
      nextDate: null,
      note: '',
      previousAssignees,
      enteredAt: now.toISOString(),
      assignedAt: finalAssignedTo ? now.toISOString() : null,
      createdAt: now,
      updatedAt: now
    })

    return NextResponse.json({ success: true, id: docRef.id })
  } catch (error) {
    console.error('[pipeline/add] Error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
