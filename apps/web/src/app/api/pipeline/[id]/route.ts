export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const doc = await adminDb.collection('pipeline').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const data = doc.data() || {}

    if (!(await canAccessPipelineItem(userId, data, userData, adminDb))) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({ id: doc.id, ...data })
  } catch (error) {
    console.error('[pipeline/[id]/GET] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

import { pipelineStatuses } from '@sales-companion/shared'
import { z } from 'zod'

const pipelineUpdateSchema = z
  .object({
    status: z.enum(pipelineStatuses).optional(),
    companyName: z.string().min(1).optional(),
    companySector: z.string().optional(),
    companyCity: z.string().optional(),
    companyRegion: z.string().optional(),
    companyQuarter: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().optional(),
    region: z.string().optional(),
    quarter: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    note: z.string().optional(),
    notes: z.string().optional(),
    nextAction: z.string().optional(),
    nextDate: z.string().nullable().optional(),
    estimatedDeal: z.number().nullable().optional(),
    probability: z.number().min(0).max(100).nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    stage: z.number().nullable().optional(),
    tags: z.array(z.string()).optional()
  })
  .strict()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const doc = await adminDb.collection('pipeline').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const data = doc.data() || {}

    if (!(await canAccessPipelineItem(userId, data, userData, adminDb))) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const rawBody = await request.json().catch(() => ({}))
    const parseResult = pipelineUpdateSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: 'Données invalides ou champs non autorisés',
          errors: parseResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const cleanData: Record<string, any> = { ...parseResult.data }
    const isConcluded = cleanData.status === 'conclue' || cleanData.status === 'conclusion'
    if (isConcluded && !data.concludedAt) {
      cleanData.concludedAt = new Date()
    }

    await doc.ref.update({ ...cleanData, updatedAt: new Date() })

    // Propagation temps réel vers le Senior Manager :
    // on met à jour lastPipelineUpdate sur le document organisation.
    const orgCode = (data.orgCode || userData?.orgCode) as string | undefined
    if (orgCode) {
      adminDb
        .collection('organisations')
        .doc(orgCode)
        .update({ lastPipelineUpdate: new Date().toISOString() })
        .catch((orgErr: unknown) => {
          console.warn('[pipeline/[id]/PUT] lastPipelineUpdate write failed:', orgErr)
        })
    }

    if (isConcluded) {
      try {
        const { syncPipelineItemToClient } = await import('@/lib/clients-sync')
        await syncPipelineItemToClient(adminDb, id, { ...data, ...cleanData })
      } catch (err) {
        console.error('[pipeline/[id]/PUT] Erreur lors de la synchronisation client:', err)
      }
    }

    const updated = await doc.ref.get()
    return NextResponse.json({ id: updated.id, ...updated.data() })
  } catch (error) {
    console.error('[pipeline/[id]/PUT] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
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

    const doc = await adminDb.collection('pipeline').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const data = doc.data() || {}

    if (!(await canAccessPipelineItem(userId, data, userData, adminDb))) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    await doc.ref.delete()

    // Propagation temps réel vers l'organisation si orgCode présent
    const orgCode = (data?.orgCode || userData?.orgCode) as string | undefined
    if (orgCode) {
      adminDb
        .collection('organisations')
        .doc(orgCode)
        .update({ lastPipelineUpdate: new Date().toISOString() })
        .catch(() => {})
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[pipeline/[id]/DELETE] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

