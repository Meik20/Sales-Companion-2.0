export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
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

    const data = doc.data()
    if (data?.userId !== userId && data?.managerUid !== userId) {
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
    companyPhone: z.string().optional(),
    companyEmail: z.string().optional(),
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

    const data = doc.data()
    if (data?.userId !== userId && data?.managerUid !== userId) {
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

    const cleanData = parseResult.data
    await doc.ref.update({ ...cleanData, updatedAt: new Date() })

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

    const data = doc.data()
    if (data?.userId !== userId && data?.managerUid !== userId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    await doc.ref.delete()
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[pipeline/[id]/DELETE] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
