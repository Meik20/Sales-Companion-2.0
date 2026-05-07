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
    }

    if (!companyName) {
      return NextResponse.json({ message: 'companyName requis' }, { status: 400 })
    }

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
      companyPhone:  companyPhone ?? null,
      companyEmail:  companyEmail ?? null,
      status:        'prospection',
      nextDate:      null,
      note:          '',
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
