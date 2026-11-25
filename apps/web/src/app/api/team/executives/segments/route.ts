import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * PATCH /api/team/executives/segments
 * Permet au SM1 (initiateur principal de l'organisation) de modifier ou élargir
 * les segments d'observation d'un Manager Exécutif existant.
 * Body: { executiveUid: string, segments: string[] | 'ALL' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)
    const callerUid = decoded.uid

    const callerSnap = await adminDb.collection('users').doc(callerUid).get()
    if (!callerSnap.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    const callerData = callerSnap.data()!
    const orgCode = callerData.orgCode as string | undefined

    if (callerData.role !== 'manager' || callerData.orgRole !== 'senior_manager' || !orgCode) {
      return NextResponse.json(
        { error: 'Seul le Coordinateur principal (SM1) peut modifier les segments des Exécutifs.' },
        { status: 403 }
      )
    }

    const orgSnap = await adminDb.collection('organisations').doc(orgCode).get()
    const orgData = orgSnap.data()
    if (orgData?.seniorManagerUid && orgData.seniorManagerUid !== callerUid) {
      return NextResponse.json(
        { error: 'Seul le Coordinateur principal (SM1) peut modifier les segments des Exécutifs.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const executiveUid = typeof body.executiveUid === 'string' ? body.executiveUid.trim() : ''
    if (!executiveUid) {
      return NextResponse.json({ error: 'executiveUid requis' }, { status: 400 })
    }

    const execRef = adminDb.collection('users').doc(executiveUid)
    const execSnap = await execRef.get()
    if (!execSnap.exists) {
      return NextResponse.json({ error: 'Responsable Exécutif introuvable' }, { status: 404 })
    }
    const execData = execSnap.data()!

    if (execData.orgCode !== orgCode || execData.orgRole !== 'executive') {
      return NextResponse.json(
        { error: "Cet utilisateur n'est pas un Responsable Exécutif de votre organisation." },
        { status: 403 }
      )
    }

    let nextSegments: string[] = []
    let nextSegment: string | null = 'ALL'

    if (body.segments !== 'ALL' && Array.isArray(body.segments)) {
      const cleaned: string[] = Array.from(
        new Set<string>(
          body.segments
            .map((s: unknown) => String(s).trim().toUpperCase())
            .filter(Boolean)
        )
      )
      if (cleaned.length > 0) {
        nextSegments = cleaned
        nextSegment = cleaned.length === 1 ? (cleaned[0] ?? null) : null
      }
    }

    await execRef.update({
      segments: nextSegments,
      segment: nextSegment,
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({
      success: true,
      executiveUid,
      segments: nextSegments,
      segment: nextSegment
    })
  } catch (err: any) {
    console.error('[PATCH /api/team/executives/segments] error:', err)
    return NextResponse.json(
      { error: err?.message || 'Erreur serveur lors de la mise à jour des segments.' },
      { status: 500 }
    )
  }
}
