export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'

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
      managerUid,
      assignedTo,
      memberName,
      memberAccessId,
      googlePlaceId,
    } = body as {
      companyId?: string
      companyName?: string
      companySector?: string
      companyCity?: string
      companyPhone?: string
      companyEmail?: string
      managerUid?: string | null
      assignedTo?: string | null
      memberName?: string | null
      memberAccessId?: string | null
      googlePlaceId?: string | null
    }

    if (!companyName) {
      return NextResponse.json({ message: 'companyName requis' }, { status: 400 })
    }

    let finalPhone = companyPhone
    let finalWebsite = null

    // ── Fetch Google Place Details si googlePlaceId est présent ──
    if (googlePlaceId) {
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
      if (googleApiKey) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=formatted_phone_number,website&key=${googleApiKey}`
          const gRes = await fetch(url)
          const gData = await gRes.json()
          if (gData.result) {
            if (gData.result.formatted_phone_number && !finalPhone) finalPhone = gData.result.formatted_phone_number
            if (gData.result.website) finalWebsite = gData.result.website
          }
        } catch (err) {
          console.error('[pipeline/add] Google Place Details Error:', err)
        }
      }
    }

    // ── Step: Find previous assignees ──────────────────────────────────
    const prevAssigneesMap = new Map<string, { userId: string, memberName: string, assignedAt: string }>()
    if (companyId) {
      try {
        const byCompanyId = await adminDb.collection('pipeline').where('companyId', '==', companyId).get()
        byCompanyId.docs.forEach(doc => {
          const d = doc.data()
          if (d.userId && d.userId !== userId) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) { console.error('Error fetching by companyId', err) }
    }
    if (companyName) {
      try {
        const byName = await adminDb.collection('pipeline').where('companyName', '==', companyName).get()
        byName.docs.forEach(doc => {
          const d = doc.data()
          if (d.userId && d.userId !== userId) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) { console.error('Error fetching by companyName', err) }
    }
    const previousAssignees = Array.from(prevAssigneesMap.values())

    const now = new Date()
    const docRef = await adminDb.collection('pipeline').add({
      userId,
      managerUid:    managerUid ?? null,
      assignedTo:    assignedTo ?? userId,   // UID du membre qui a ajouté
      memberName:    memberName ?? null,      // Nom du membre
      memberAccessId: memberAccessId ?? null, // Access ID du membre (ex: "prenomnom@entreprise")
      companyId:     companyId ?? null,
      companyName:   companyName,
      companySector: companySector ?? null,
      companyCity:   companyCity ?? null,
      companyPhone:  finalPhone ?? null,
      companyEmail:  companyEmail ?? null,
      companyWebsite: finalWebsite ?? null,
      status:        'prospection',
      nextDate:      null,
      note:          '',
      previousAssignees,
      createdAt:     now,
      updatedAt:     now,
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
