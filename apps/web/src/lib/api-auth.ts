import { NextResponse } from 'next/server'

export type VerifiedUser = {
  uid: string
  email?: string
}

export async function getFirebaseAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/** Verify Firebase Bearer token from API route request. */
export async function verifyRequestUser(
  request: Request
): Promise<{ user: VerifiedUser } | { error: NextResponse }> {
  const { adminAuth } = await getFirebaseAdmin()
  const token = request.headers.get('authorization')?.split(' ')[1]

  if (!token) {
    return { error: NextResponse.json({ message: 'Non authentifié' }, { status: 401 }) }
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return { user: { uid: decoded.uid, email: decoded.email } }
  } catch {
    return { error: NextResponse.json({ message: 'Token invalide' }, { status: 401 }) }
  }
}
