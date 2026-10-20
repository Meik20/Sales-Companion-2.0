import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestUser, getFirebaseAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

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

    const members = snap.docs.map((doc) => {
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

