import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { DEPLOYMENT_CONFIG } from '@/lib/deployment-config'

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
      type: data.type || 'team_manager', // 'senior_manager' | 'team_manager' | 'executive'
      orgCode: data.orgCode,
      companyName: data.companyName,
      segment: data.segment || null,
      seniorManagerName: data.createdByName || null,
      seniorManagerUid: data.seniorManagerUid || data.createdByUid || null,
      customRoleLabel: data.customRoleLabel || null
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
    const inviteType: 'team_manager' | 'senior_manager' | 'executive' =
      body.type === 'senior_manager'
        ? 'senior_manager'
        : body.type === 'executive'
          ? 'executive'
          : 'team_manager'

    // Récupérer le nom de l'entreprise et le propriétaire fondateur (SM1)
    let companyName = userData.companyName || userData.company || 'Organisation'
    const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
    const primarySmUid = orgDoc.exists ? orgDoc.data()?.seniorManagerUid : null
    const isPrimarySeniorManager =
      primarySmUid === callerUid || (!primarySmUid && userData.orgRole === 'senior_manager')

    if (orgDoc.exists && orgDoc.data()?.companyName) {
      companyName = orgDoc.data()!.companyName
    }

    // RÈGLE HIÉRARCHIQUE STRUCTURALE (AGENTS.md §1) :
    // Seul le Coordinateur principal (fondateur de l'organisation) peut initier
    // les invitations de Coordinateurs et de Responsables Exécutifs.
    if ((inviteType === 'senior_manager' || inviteType === 'executive') && !isPrimarySeniorManager) {
      return NextResponse.json(
        {
          error:
            "Seul le Coordinateur principal (fondateur de l'organisation) est habilité à inviter des Coordinateurs ou des Responsables Exécutifs."
        },
        { status: 403 }
      )
    }

    // Seul un Coordinateur peut inviter un autre Coordinateur
    if (inviteType === 'senior_manager' && userData.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { error: 'Seul un Coordinateur peut inviter un autre Coordinateur.' },
        { status: 403 }
      )
    }

    if (inviteType === 'executive') {
      const isEnt = userData.plan === 'enterprise' || DEPLOYMENT_CONFIG.isEnterprise
      if (!isEnt) {
        return NextResponse.json(
          { error: "L'invitation d'un Responsable Exécutif requiert le forfait ENTERPRISE." },
          { status: 403 }
        )
      }
      if (userData.orgRole !== 'senior_manager') {
        return NextResponse.json(
          { error: 'Seul un Coordinateur peut inviter un Responsable Exécutif.' },
          { status: 403 }
        )
      }
    }

    // Déterminer le segment rattaché
    // • Superviseur (team_manager) : hérité du créateur (ou spécifié dans le body)
    // • Responsable Exécutif (executive) : spécifié dans le body ou hérité du segment du Coordinateur
    // • Coordinateur (senior_manager) : défini dans le body par le SM1 (ex: COMMERCIAL, NORD, etc.)
    const fallbackSegment =
      userData.segment &&
      userData.segment.toLowerCase() !== 'direction' &&
      userData.segment.toLowerCase() !== 'direction générale'
        ? userData.segment
        : 'COMMERCIAL'

    let assignedSegment: string | null = null
    if (inviteType === 'team_manager') {
      assignedSegment = body.segment?.trim() || fallbackSegment
    } else if (inviteType === 'executive') {
      assignedSegment = body.segment?.trim() || fallbackSegment
    } else if (inviteType === 'senior_manager') {
      assignedSegment = body.segment?.trim() || null
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
      // Libellé personnalisé pour le rôle executive (ex: "Directeur Général", "PDG")
      customRoleLabel: inviteType === 'executive' ? (body.customRoleLabel?.trim() || null) : null,
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
