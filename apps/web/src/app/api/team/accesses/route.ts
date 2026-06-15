import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

function normalizeText(text: string) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid
    
    // Vérification du rôle manager
    const managerDoc = await adminDb.collection('users').doc(managerUid).get()
    const managerData = managerDoc.data()
    
    if (managerData?.role !== 'manager') {
       return NextResponse.json({ error: 'Accès refusé. Seul un manager peut créer des accès.' }, { status: 403 })
    }

    const { firstname, lastname, company, email, permissions } = await request.json()

    if (!firstname || !lastname || !company) {
      return NextResponse.json({ error: 'Informations manquantes' }, { status: 400 })
    }

    const first = normalizeText(firstname)
    const last = normalizeText(lastname)
    const comp = normalizeText(company)
    const accessId = `${first}${last}@${comp}`

    // Vérifier si l'accessId existe déjà
    const query = await adminDb.collection('team_accesses').where('accessId', '==', accessId).get()
    if (!query.empty) {
       return NextResponse.json({ error: 'Cet identifiant existe déjà (ou le membre a déjà été invité)' }, { status: 400 })
    }

    // Permissions par défaut
    const perms = permissions || {
      canExport: false,
      canDelete: false,
      canAssign: false
    }

    // Génération d'un code magique pour l'activation simplifiée (Magic Link)
    const magicCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const defaultLimits: Record<string, number> = { free: 10, starter: 50, pro: 200, enterprise: 1000 }
    const managerPlan = managerData?.plan || 'free'

    const newAccess = {
      managerUid,
      managerEmail: managerData?.email || null,
      accessId,
      firstname,
      lastname,
      company,
      email: email || null,
      status: email ? 'pending_email' : 'pending',
      activated: false,
      permissions: perms,
      plan: managerPlan,
      dailyLimit: managerData?.dailyLimit || defaultLimits[managerPlan] || 10,
      magicCode,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = await adminDb.collection('team_accesses').add(newAccess)

    // TODO: Brancher SendGrid ou Brevo ici pour envoyer l'email si "email" est fourni.

    return NextResponse.json({ 
      success: true, 
      accessId, 
      id: docRef.id,
      magicCode,
      magicLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'}/activate?code=${magicCode}`
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('[team/accesses] ERREUR:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}