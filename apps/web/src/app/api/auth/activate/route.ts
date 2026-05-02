import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessId, password } = body as { accessId?: string; password?: string }

    if (!accessId || !password) {
      return NextResponse.json({ message: 'accessId et password sont requis' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Le mot de passe doit comporter au moins 6 caractères' }, { status: 400 })
    }

    // ── 1. Fetch the access doc from Firestore ──
    let snap = await adminDb.collection('teamAccesses').doc(accessId).get()
    let collection = 'teamAccesses'
    if (!snap.exists) {
      snap = await adminDb.collection('accesses').doc(accessId).get()
      collection = 'accesses'
    }

    if (!snap.exists) {
      return NextResponse.json(
        { message: 'Lien d\'activation invalide ou expiré. Vérifiez le code fourni par votre manager.' },
        { status: 404 }
      )
    }

    const data = snap.data()!

    if (data.status === 'activated') {
      return NextResponse.json(
        { message: 'Ce compte a déjà été activé. Connectez-vous directement avec votre email et mot de passe.' },
        { status: 409 }
      )
    }

    const email: string = data.email
    if (!email) {
      return NextResponse.json(
        { message: 'Aucun email associé à cet accès. Contactez votre manager.' },
        { status: 422 }
      )
    }

    // ── 2. Create or update the Firebase Auth user ──
    let uid: string
    try {
      const existingUser = await adminAuth.getUserByEmail(email)
      // User exists — update password
      await adminAuth.updateUser(existingUser.uid, { password })
      uid = existingUser.uid
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string })?.code
      if (code === 'auth/user-not-found') {
        // Create the user
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName: `${data.firstname ?? data.firstName ?? ''} ${data.lastname ?? data.lastName ?? ''}`.trim() || undefined,
        })
        uid = newUser.uid
      } else {
        throw authErr
      }
    }

    // ── 3. Create/update Firestore user doc ──
    await adminDb.collection('users').doc(uid).set({
      uid,
      email,
      name: `${data.firstname ?? data.firstName ?? ''} ${data.lastname ?? data.lastName ?? ''}`.trim() || null,
      role: data.role ?? 'member',
      plan: data.plan ?? 'free',
      active: true,
      company: data.company ?? null,
      sector: data.sector ?? null,
      region: data.region ?? null,
      managerId: data.managerId ?? null,
      dailyUsed: 0,
      dailyLimit: data.dailyLimit ?? 10,
      createdAt: new Date(),
    }, { merge: true })

    // ── 4. Mark the access as activated ──
    await adminDb.collection(collection).doc(accessId).update({
      status: 'activated',
      activatedAt: new Date(),
      activatedUid: uid,
    })

    return NextResponse.json({ success: true, uid })
  } catch (error) {
    console.error('Activate error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ message: `Activation impossible : ${msg}` }, { status: 500 })
  }
}
