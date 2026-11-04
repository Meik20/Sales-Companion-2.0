export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

async function canAccessPipelineItem(
  userId: string,
  itemData: any,
  userData?: any,
  adminDb?: any
): Promise<boolean> {
  if (!itemData) return false
  if (
    itemData.userId === userId ||
    itemData.managerUid === userId ||
    itemData.seniorManagerUid === userId ||
    itemData.assignedTo === userId
  ) {
    return true
  }
  if (userData?.role === 'admin') return true
  if (
    userData?.role === 'manager' &&
    userData?.orgRole === 'senior_manager' &&
    userData?.orgCode
  ) {
    if (itemData.orgCode && userData.orgCode === itemData.orgCode) {
      return true
    }
    if (itemData.seniorManagerUid === userId) {
      return true
    }
    if (adminDb && itemData.managerUid) {
      try {
        const mgrDoc = await adminDb.collection('users').doc(itemData.managerUid).get()
        if (mgrDoc.exists && mgrDoc.data()?.orgCode === userData.orgCode) {
          return true
        }
      } catch (e) {
        console.warn('[canAccessPipelineItem] manager check failed:', e)
      }
    }
  }
  return false
}

const activityCreateSchema = z.object({
  type: z.enum(['call', 'visit', 'whatsapp', 'email', 'note', 'status_change']),
  title: z.string().optional(),
  summary: z.string().min(1, 'Le compte-rendu ou résumé est requis'),
  outcome: z.string().optional().nullable(),
  nextFollowUpDate: z.string().optional().nullable(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional().nullable(),
      address: z.string().optional().nullable()
    })
    .optional()
    .nullable()
})

/**
 * GET /api/pipeline/[id]/activities
 * Récupère le journal d'activité / timeline d'une opportunité
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminDb, adminAuth } = await getAdminModules()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const itemDoc = await adminDb.collection('pipeline').doc(id).get()
    if (!itemDoc.exists) {
      return NextResponse.json({ message: 'Opportunité non trouvée' }, { status: 404 })
    }

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const itemData = itemDoc.data() || {}

    if (!(await canAccessPipelineItem(userId, itemData, userData, adminDb))) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const actSnap = await adminDb
      .collection('pipeline')
      .doc(id)
      .collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const activities = actSnap.docs.map((doc: any) => {
      const d = doc.data()
      return {
        id: doc.id,
        pipelineItemId: id,
        type: d.type ?? 'note',
        title: d.title ?? '',
        summary: d.summary ?? '',
        outcome: d.outcome ?? null,
        location: d.location ?? null,
        performedBy: d.performedBy ?? '',
        performedByName: d.performedByName ?? 'Collaborateur',
        performedByRole: d.performedByRole ?? null,
        nextFollowUpDate: d.nextFollowUpDate ?? null,
        createdAt:
          d.createdAt?.toDate?.()?.toISOString() ??
          (typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString())
      }
    })

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('[pipeline/[id]/activities/GET] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/pipeline/[id]/activities
 * Ajoute une interaction au journal d'activité de l'opportunité
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminDb, adminAuth } = await getAdminModules()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const itemRef = adminDb.collection('pipeline').doc(id)
    const itemDoc = await itemRef.get()
    if (!itemDoc.exists) {
      return NextResponse.json({ message: 'Opportunité non trouvée' }, { status: 404 })
    }

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data() || {}
    const itemData = itemDoc.data() || {}

    if (!(await canAccessPipelineItem(userId, itemData, userData, adminDb))) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = activityCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Données invalides', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, title, summary, outcome, nextFollowUpDate, location } = parsed.data
    const authorName =
      userData.name ||
      userData.displayName ||
      (userData.email ? userData.email.split('@')[0] : 'Commercial')
    const authorRole = userData.orgRole || userData.role || 'member'

    const now = new Date()
    const newActivity = {
      pipelineItemId: id,
      type,
      title: title || null,
      summary,
      outcome: outcome || null,
      location: location || null,
      performedBy: userId,
      performedByName: authorName,
      performedByRole: authorRole,
      nextFollowUpDate: nextFollowUpDate || null,
      createdAt: now
    }

    const docRef = await itemRef.collection('activities').add(newActivity)

    // Mise à jour de la fiche parente
    const parentUpdates: Record<string, any> = {
      updatedAt: now
    }
    // Si premier contact terrain sur cette opportunité, marquer firstActionAt
    if (!itemData.firstActionAt) {
      parentUpdates.firstActionAt = now.toISOString()
    }
    if (nextFollowUpDate) {
      parentUpdates.nextFollowUp = nextFollowUpDate
    }
    if (location) {
      parentUpdates.lastVisitLocation = {
        ...location,
        visitedAt: now.toISOString()
      }
    }

    await itemRef.update(parentUpdates)

    return NextResponse.json(
      {
        id: docRef.id,
        ...newActivity,
        createdAt: now.toISOString()
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[pipeline/[id]/activities/POST] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

