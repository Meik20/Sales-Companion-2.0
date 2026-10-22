import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/managers/revoke
 * Révocation d'un Team Manager par le Senior Manager avec passation de service obligatoire.
 *
 * RÈGLES D'OR ARCHITECTURALES (AGENTS.md §12) :
 * 1. Tout Senior Manager peut révoquer un Team Manager de son segment respectif avec passation obligatoire.
 *    (Aucun Senior Manager n'est « titulaire » ou « propriétaire » de l'organisation — celle-ci appartient à la personne morale.
 *    Le seul privilège du SM1 est l'émission d'invitations pour les autres SM. Sur le plan opérationnel, tous les SM sont égaux).
 * 2. L'auto-révocation d'un Senior Manager est STRICTEMENT INTERDITE.
 * 3. Continuité d'activité garantie : Toutes les opportunités de pipeline, les prospects importés,
 *    les commerciaux terrain et les assignations sont atomiquement transférés au Team Manager
 *    repreneur désigné du même segment (ou au Senior Manager par défaut si aucun autre TM n'est disponible).
 * 4. Le TM révoqué est détaché de l'organisation (orgCode=null, orgRole=null, seniorManagerUid=null).
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // ── 1. Authentification ────────────────────────────────────────────────
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Session expirée ou token invalide' }, { status: 401 })
    }

    // ── 2. Vérification des droits du Senior Manager ───────────────────────
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()
    if (!hasActivePaidManagerAccess(callerData) || callerData?.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'Action strictement réservée au Senior Manager avec abonnement actif' },
        { status: 403 }
      )
    }

    const orgCode = callerData.orgCode as string | undefined
    if (!orgCode) {
      return NextResponse.json(
        { message: 'Aucun code organisation valide associé à votre compte' },
        { status: 400 }
      )
    }

    // ── 3. Lecture et validation du corps de requête ──────────────────────
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { targetManagerUid, successorManagerUid } = body as {
      targetManagerUid?: string
      successorManagerUid?: string
    }

    if (!targetManagerUid) {
      return NextResponse.json({ message: 'Le manager cible est requis' }, { status: 400 })
    }

    // Garde-fou P0 : interdiction formelle d'auto-révocation
    if (targetManagerUid === callerUid) {
      return NextResponse.json(
        { message: 'Le Senior Manager ne peut pas se révoquer lui-même de son organisation' },
        { status: 400 }
      )
    }

    // Récupérer le Team Manager cible
    const targetDoc = await adminDb.collection('users').doc(targetManagerUid).get()
    const targetData = targetDoc.data()
    if (!targetDoc.exists || !targetData) {
      return NextResponse.json({ message: 'Team Manager cible introuvable' }, { status: 404 })
    }

    if (targetData.orgCode !== orgCode || targetData.role !== 'manager') {
      return NextResponse.json(
        { message: "Le manager cible n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    if (targetData.orgRole === 'senior_manager') {
      return NextResponse.json(
        { message: 'Impossible de révoquer un Senior Manager' },
        { status: 400 }
      )
    }

    // Vérifier l'appartenance au segment du Senior Manager appelant
    const callerSegment = (callerData.segment as string | undefined)?.trim()
    if (callerSegment && targetData.segment && (targetData.segment as string).trim().toLowerCase() !== callerSegment.toLowerCase()) {
      return NextResponse.json(
        { message: `Ce Team Manager appartient au segment "${targetData.segment}", distinct de votre segment ("${callerSegment}"). Chaque Senior Manager gouverne son segment respectif.` },
        { status: 403 }
      )
    }

    const targetManagerName =
      targetData.displayName || targetData.name || targetData.email || 'Team Manager'

    // ── 4. Déterminer et valider le Team Manager repreneur (Successeur) ───
    // Chercher tous les autres managers actifs de l'organisation
    const otherManagersSnap = await adminDb
      .collection('users')
      .where('orgCode', '==', orgCode)
      .where('role', '==', 'manager')
      .get()

    // Filtrer les TM du même segment que le SM appelant
    const otherTms = otherManagersSnap.docs.filter((d) => {
      if (d.id === targetManagerUid || d.id === callerUid) return false
      const mData = d.data()
      if (mData.orgRole === 'senior_manager') return false
      if (callerSegment && mData.segment && (mData.segment as string).trim().toLowerCase() !== callerSegment.toLowerCase()) {
        return false
      }
      return true
    })

    let effectiveSuccessorUid: string
    if (successorManagerUid) {
      if (successorManagerUid === targetManagerUid) {
        return NextResponse.json(
          { message: 'Le manager repreneur doit être distinct du manager révoqué' },
          { status: 400 }
        )
      }
      const sDoc = await adminDb.collection('users').doc(successorManagerUid).get()
      const sData = sDoc.data()
      if (!sDoc.exists || !sData || sData.orgCode !== orgCode || sData.role !== 'manager') {
        return NextResponse.json(
          { message: "Le manager repreneur n'appartient pas à cette organisation" },
          { status: 400 }
        )
      }
      if (callerSegment && sData.segment && (sData.segment as string).trim().toLowerCase() !== callerSegment.toLowerCase()) {
        return NextResponse.json(
          { message: `Le Team Manager repreneur doit appartenir à votre segment ("${callerSegment}").` },
          { status: 400 }
        )
      }
      effectiveSuccessorUid = successorManagerUid
    } else if (otherTms.length === 1) {
      // S'il n'y a exactement qu'un seul autre TM dans le segment, il est désigné automatiquement
      effectiveSuccessorUid = otherTms[0]!.id
    } else if (otherTms.length === 0) {
      // Aucun autre TM dans le segment : le Senior Manager reprend par intérim
      effectiveSuccessorUid = callerUid
    } else {
      // Plusieurs autres TM existent dans le segment : le Senior Manager doit en choisir un explicitement
      return NextResponse.json(
        { message: 'Veuillez sélectionner le Team Manager de votre segment qui reprendra les dossiers' },
        { status: 400 }
      )
    }

    const successorDoc = await adminDb.collection('users').doc(effectiveSuccessorUid).get()
    const successorData = successorDoc.data() || {}
    const successorName =
      successorData.displayName || successorData.name || successorData.email || (effectiveSuccessorUid === callerUid ? 'Senior Manager' : 'Team Manager')
    const successorEmail = successorData.email || ''

    const now = new Date()

    // ── 5. Récupérer les données à transférer ──────────────────────────────
    const [
      pipelineSnap,
      managerProspectsSnap,
      teamAccessesSnap,
      memberUsersSnap,
      assignmentsSnap
    ] = await Promise.all([
      // Fiches de pipeline sous la supervision de ce TM
      adminDb.collection('pipeline').where('managerUid', '==', targetManagerUid).get(),
      // Prospects importés par ce TM ou à lui transférés
      adminDb.collection('manager_prospects').where('managerId', '==', targetManagerUid).get(),
      // Accès des commerciaux terrain rattachés à ce TM
      adminDb.collection('team_accesses').where('managerUid', '==', targetManagerUid).get(),
      // Comptes utilisateurs 'member' rattachés à ce TM
      adminDb
        .collection('users')
        .where('managerUid', '==', targetManagerUid)
        .where('role', '==', 'member')
        .get(),
      // Assignations actives de ce TM
      adminDb.collection('team_assignments').where('managerUid', '==', targetManagerUid).get()
    ])

    // ── 6. Exécution des mises à jour atomiques par lot Firestore ─────────
    let batch = adminDb.batch()
    let opCount = 0

    const commitBatchIfFull = async () => {
      if (opCount >= 400) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    // A. Détacher le Team Manager de l'organisation
    batch.update(targetDoc.ref, {
      orgCode: null,
      orgRole: null,
      seniorManagerUid: null,
      revokedFromOrgCode: orgCode,
      revokedAt: now,
      revokedByUid: callerUid,
      updatedAt: now
    })
    opCount++
    await commitBatchIfFull()

    // B. Réassigner les fiches de pipeline vers le successeur
    let transferredPipelineCount = 0
    for (const d of pipelineSnap.docs) {
      batch.update(d.ref, {
        managerUid: effectiveSuccessorUid,
        managerName: successorName,
        previousManagerUid: targetManagerUid,
        updatedAt: now
      })
      transferredPipelineCount++
      opCount++
      await commitBatchIfFull()
    }

    // C. Réassigner les prospects Firestore manager_prospects
    let transferredProspectsCount = 0
    for (const d of managerProspectsSnap.docs) {
      batch.update(d.ref, {
        managerId: effectiveSuccessorUid,
        transferredToManagerUid: effectiveSuccessorUid,
        transferredToManagerName: successorName,
        previousManagerId: targetManagerUid,
        updatedAt: now
      })
      transferredProspectsCount++
      opCount++
      await commitBatchIfFull()
    }

    // D. Réassigner les accès d'équipe team_accesses
    let transferredAccessesCount = 0
    for (const d of teamAccessesSnap.docs) {
      batch.update(d.ref, {
        managerUid: effectiveSuccessorUid,
        managerName: successorName,
        managerEmail: successorEmail,
        previousManagerUid: targetManagerUid,
        updatedAt: now
      })
      transferredAccessesCount++
      opCount++
      await commitBatchIfFull()
    }

    // E. Réassigner les comptes commerciaux users (role == 'member')
    let transferredMembersCount = 0
    for (const d of memberUsersSnap.docs) {
      batch.update(d.ref, {
        managerUid: effectiveSuccessorUid,
        previousManagerUid: targetManagerUid,
        updatedAt: now
      })
      transferredMembersCount++
      opCount++
      await commitBatchIfFull()
    }

    // F. Réassigner les assignations actives team_assignments
    for (const d of assignmentsSnap.docs) {
      batch.update(d.ref, {
        managerUid: effectiveSuccessorUid,
        managerName: successorName,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Valider le batch restant
    if (opCount > 0) {
      await batch.commit()
    }

    // ── 7. Réassigner les prospects privés Supabase private_prospects ─────
    try {
      const {
        isPrivateProspectsTableAvailable,
        reassignPrivateProspectsForRevokedManager
      } = await import('@/lib/supabase-private-prospects')

      if (await isPrivateProspectsTableAvailable()) {
        const sbRes = await reassignPrivateProspectsForRevokedManager({
          orgCode,
          revokedManagerUid: targetManagerUid,
          successorManagerUid: effectiveSuccessorUid
        })
        if (sbRes.success && sbRes.count > 0) {
          transferredProspectsCount += sbRes.count
        }
      }
    } catch (sbErr) {
      console.warn('[POST /api/team/managers/revoke] Supabase reassign error:', sbErr)
    }

    // ── 8. Heartbeat de l'organisation en temps réel ─────────────────────
    try {
      await adminDb.collection('organisations').doc(orgCode).update({
        lastPipelineUpdate: now.toISOString(),
        lastImportsUpdate: now.toISOString(),
        lastTeamUpdate: now.toISOString(),
        updatedAt: now
      })
    } catch (orgErr) {
      console.warn('[POST /api/team/managers/revoke] org heartbeat update failed:', orgErr)
    }

    // ── 9. Notifications In-App & Email ──────────────────────────────────
    try {
      const { createUserNotification } = await import('@/lib/user-notifications')
      const callerName = callerData.displayName || callerData.name || 'Senior Manager'

      // Notification pour le Team Manager révoqué
      await createUserNotification({
        userId: targetManagerUid,
        type: 'general',
        title: 'Fin de rattachement à votre organisation',
        message: `Votre rattachement à l'organisation ${callerData.companyName || orgCode} a pris fin. Vos opportunités et votre équipe ont été transmises à ${successorName}.`,
        link: '/profile'
      })

      // Notification pour le successeur
      await createUserNotification({
        userId: effectiveSuccessorUid,
        type: 'general',
        title: 'Passation de service effectuée',
        message: `Le Senior Manager (${callerName}) vous a confié les dossiers et l'équipe de ${targetManagerName} (${transferredPipelineCount} opportunités, ${transferredMembersCount} commerciaux).`,
        link: '/team'
      })
    } catch (notifErr) {
      console.warn('[POST /api/team/managers/revoke] Notification error:', notifErr)
    }

    return NextResponse.json({
      success: true,
      revokedManager: {
        uid: targetManagerUid,
        name: targetManagerName
      },
      successorManager: {
        uid: effectiveSuccessorUid,
        name: successorName
      },
      transferredSummary: {
        pipelineOpportunities: transferredPipelineCount,
        importedProspects: transferredProspectsCount,
        teamMembers: transferredMembersCount,
        accesses: transferredAccessesCount
      }
    })
  } catch (error: any) {
    console.error('[POST /api/team/managers/revoke] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Erreur interne lors de la révocation du Team Manager' },
      { status: 500 }
    )
  }
}
