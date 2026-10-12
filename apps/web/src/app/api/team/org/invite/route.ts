import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/team/org/invite?token=XXXXX
 *
 * Endpoint PUBLIC vérifiant et renvoyant les détails d'un token d'invitation.
 * Retourne type, orgCode, companyName, segment, seniorManagerName.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit(`org-invite-verify:${ip}`, {
    limit: 15,
    windowMs: 5 * 60 * 1000
  })

  if (!rl.success) {
    return NextResponse.json(
      { valid: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')?.trim()

    if (!token || token.length < 8) {
      return NextResponse.json(
        { valid: false, error: "Jeton d'invitation manquant ou invalide" },
        { status: 400 }
      )
    }

    const { adminDb } = await getAdmin()
    const inviteDoc = await adminDb.collection('orgInvites').doc(token).get()

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { valid: false, error: "Lien d'invitation introuvable ou expiré." },
        { status: 404 }
      )
    }

    const data = inviteDoc.data()!

    if (data.used === true) {
      return NextResponse.json(
        { valid: false, error: "Ce lien d'invitation a déjà été utilisé." },
        { status: 410 }
      )
    }

    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "Ce lien d'invitation a expiré (validité 7 jours)." },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      token,
      type: data.type || 'team_manager', // 'senior_manager' | 'team_manager'
      orgCode: data.orgCode,
      companyName: data.companyName,
      segment: data.segment || null,
      seniorManagerName: data.createdByName || null,
      seniorManagerUid: data.seniorManagerUid || data.createdByUid || null
    })
  } catch (error: any) {
    console.error('[GET /api/team/org/invite] error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/team/org/invite
 *
 * Endpoint authentifié réservé aux managers.
 * - Senior Manager peut générer :
 *   1) Un lien Team Manager avec son segment encodé
 *   2) Un lien Senior Manager (pour ouvrir un nouveau segment dans l'organisation)
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const authHeader = request.headers.get('authorization')?.split(' ')[1]
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(authHeader)
    const callerUid = decoded.uid

    const userDocRef = adminDb.collection('users').doc(callerUid)
    const userDoc = await userDocRef.get()
    const userData = userDoc.data()

    if (!userDoc.exists || !userData) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (userData.role !== 'manager') {
      return NextResponse.json({ error: 'Accès réservé aux managers' }, { status: 403 })
    }

    const orgCode = userData.orgCode
    if (!orgCode) {
      return NextResponse.json(
        { error: 'Aucun code organisation associé à votre compte' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const inviteType: 'team_manager' | 'senior_manager' =
      body.type === 'senior_manager' ? 'senior_manager' : 'team_manager'

    // Seul un Senior Manager peut inviter un autre Senior Manager
    if (inviteType === 'senior_manager' && userData.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { error: 'Seul un Senior Manager peut inviter un autre Senior Manager.' },
        { status: 403 }
      )
    }

    // Récupérer le nom de l'entreprise
    let companyName = userData.companyName || userData.company || 'Organisation'
    const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
    if (orgDoc.exists && orgDoc.data()?.companyName) {
      companyName = orgDoc.data()!.companyName
    }

    // Déterminer le segment
    // Pour un TM : hérité du créateur (ou spécifié dans le body si le manager le modifie)
    // Pour un SM : null (l'invité choisira son propre segment dans son formulaire)
    let assignedSegment: string | null = null
    if (inviteType === 'team_manager') {
      assignedSegment = body.segment?.trim() || userData.segment || 'Principal'
    }

    // Générer un token sécurisé
    const token = `inv_${crypto.randomBytes(20).toString('hex')}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

    const inviteData = {
      token,
      type: inviteType,
      orgCode,
      companyName,
      createdByUid: callerUid,
      createdByName: userData.displayName || userData.name || userData.email || 'Senior Manager',
      seniorManagerUid:
        userData.orgRole === 'senior_manager' ? callerUid : userData.seniorManagerUid || callerUid,
      segment: assignedSegment,
      used: false,
      usedByUid: null,
      createdAt: new Date(),
      expiresAt
    }

    await adminDb.collection('orgInvites').doc(token).set(inviteData)

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'https://salescompanion2-0.com'
    const inviteUrl = `${baseUrl}/register?inviteType=${inviteType}&token=${token}`

    return NextResponse.json({
      success: true,
      token,
      inviteType,
      inviteUrl,
      segment: assignedSegment,
      orgCode,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error: any) {
    console.error('[POST /api/team/org/invite] error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
