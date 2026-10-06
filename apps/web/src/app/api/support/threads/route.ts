import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestUser, getFirebaseAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRequestUser(request)
    if ('error' in auth) return auth.error

    const { adminDb, adminAuth } = await getFirebaseAdmin()

    // Vérifier si l'utilisateur est admin
    let isAdmin = false
    try {
      const userRecord = await adminAuth.getUser(auth.user.uid)
      isAdmin = userRecord.customClaims?.role === 'admin'
      if (!isAdmin) {
        const userDoc = await adminDb.collection('users').doc(auth.user.uid).get()
        isAdmin = userDoc.data()?.role === 'admin'
      }
    } catch {
      isAdmin = false
    }

    const threadsRef = adminDb.collection('support_threads')
    const query = isAdmin
      ? threadsRef.orderBy('updatedAt', 'desc').limit(100)
      : threadsRef.where('userId', '==', auth.user.uid).orderBy('updatedAt', 'desc').limit(100)

    const snap = await query.get()
    const threads = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null
      }
    })

    return NextResponse.json(threads)
  } catch (error) {
    console.error('Support threads error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
