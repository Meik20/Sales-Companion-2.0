export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function verifyAdmin(token: string | null) {
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const doc = await adminDb.collection('users').doc(decoded.uid).get()
  if (doc.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { uid } = await params
    const body = await request.json()

    // Strip fields that should not be mutated directly
    const { uid: _uid, email: _email, ...safeFields } = body

    const userDocRef = adminDb.collection('users').doc(uid)
    const oldSnap = await userDocRef.get()
    const oldData = oldSnap.data()

    await userDocRef.update({
      ...safeFields,
      updatedAt: new Date(),
    })

    // ── Plan & Limit Propagation ──
    // If a manager's plan or limit is updated, propagate to all their members
    if ((safeFields.plan || safeFields.dailyLimit !== undefined) && oldData?.role === 'manager') {
      const membersSnap = await adminDb
        .collection('users')
        .where('managerUid', '==', uid)
        .where('role', '==', 'member')
        .get()

      const batch = adminDb.batch()
      membersSnap.docs.forEach((doc) => {
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        }
        if (safeFields.plan) updateData.plan = safeFields.plan
        if (safeFields.dailyLimit !== undefined) updateData.dailyLimit = safeFields.dailyLimit
        
        batch.update(doc.ref, updateData)
      })
      await batch.commit()
    }

    // If role change is included, update custom claims too
    if (safeFields.role) {
      await adminAuth.setCustomUserClaims(uid, { role: safeFields.role })
    }

    const updated = await adminDb.collection('users').doc(uid).get()
    return NextResponse.json({ uid, ...updated.data() })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { uid } = await params

    // Delete from Firebase Auth and Firestore in parallel
    await Promise.all([
      adminAuth.deleteUser(uid),
      adminDb.collection('users').doc(uid).delete(),
    ])

    return NextResponse.json({ success: true, uid })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
