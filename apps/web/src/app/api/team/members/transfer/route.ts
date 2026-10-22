import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/members/transfer
 * Transfert individuel d'un commercial terrain ('member') entre deux Team Managers par le Senior Manager.
 *
 * RÈGLES D'OR ARCHITECTURALES (AGENTS.md §12) :
 * 1. Seul le Senior Manager titulaire de l'organisation peut arbitrer et transférer des commerciaux.
 * 2. PORTEFEUILLE ACTIF UNIQUEMENT : Seules les opportunités au statut 'prospection' ou 'negociation'
 *    suivent le commercial vers le nouveau Team Manager. Les affaires 'conclue' (closed/won) restent
 *    définitivement dans la base clients (collection 'clients') de l'ANCIEN Team Manager. La collection
 *    'clients' n'est JAMAIS modifiée lors d'un transfert de commercial.
 * 3. Cohérence atomique : users/{memberUid}, team_accesses, pipeline actif et team_assignments
 *    sont synchronisés simultanément dans un batch Firestore.
 */

/** Statuts considérés comme « actifs » (portefeuille en cours de traitement). */
const ACTIVE_PIPELINE_STATUSES = ['prospection', 'negociation']
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

    // ── 2. Vérification des droits Senior Manager ─────────────────────────
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
        { message: 'Aucun code organisation associé à votre compte' },
        { status: 400 }
      )
    }

    // ── 3. Validation du corps de requête ─────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { memberUid, targetManagerUid } = body as {
      memberUid?: string
      targetManagerUid?: string
    }

    if (!memberUid || !targetManagerUid) {
      return NextResponse.json(
        { message: 'Le commercial (memberUid) et le Team Manager cible (targetManagerUid) sont requis' },
        { status: 400 }
      )
    }

    // Récupérer le profil du commercial
    const memberDoc = await adminDb.collection('users').doc(memberUid).get()
    const memberData = memberDoc.data()
    if (!memberDoc.exists || !memberData) {
      return NextResponse.json({ message: 'Commercial introuvable' }, { status: 404 })
    }

    if (memberData.orgCode !== orgCode) {
      return NextResponse.json(
        { message: "Le commercial n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    const memberName = memberData.displayName || memberData.name || memberData.email || 'Commercial'
    const sourceManagerUid = (memberData.managerUid as string) || null

    if (sourceManagerUid === targetManagerUid) {
      return NextResponse.json(
        { message: 'Le commercial est déjà rattaché à ce Team Manager' },
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
        { message: "Le Team Manager cible n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    const targetManagerName =
      targetData.displayName || targetData.name || targetData.email || 'Team Manager'
    const targetManagerEmail = targetData.email || ''

    // Récupérer l'ancien Team Manager s'il existe
    let sourceManagerName = 'Ancien Manager'
    if (sourceManagerUid) {
      const srcDoc = await adminDb.collection('users').doc(sourceManagerUid).get()
      if (srcDoc.exists) {
        const sd = srcDoc.data()
        sourceManagerName = sd?.displayName || sd?.name || sd?.email || 'Ancien Manager'
      }
    }

    const now = new Date()

    // ── 4. Récupérer les documents liés au commercial ─────────────────────
    const [
      pipelineUserSnap,
      pipelineAssignedSnap,
      assignmentsSnap,
      accessesSnap,
      crmAssignedSnap,
      crmOwnerSnap
    ] = await Promise.all([
      // Fiches de pipeline créées par ce commercial
      adminDb.collection('pipeline').where('userId', '==', memberUid).get(),
      // Fiches de pipeline assignées à ce commercial
      adminDb.collection('pipeline').where('assignedTo', '==', memberUid).get(),
      // Assignations actives de ce commercial
      adminDb.collection('team_assignments').where('memberId', '==', memberUid).get(),
      // Fiche d'accès team_accesses du commercial
      adminDb.collection('team_accesses').where('orgCode', '==', orgCode).get(),
      // Fiches CRM dédiées assignées ou créées par ce commercial
      adminDb.collection('crm_clients').where('assignedTo', '==', memberUid).get(),
      adminDb.collection('crm_clients').where('owner', '==', memberUid).get()
      // ⚠️ RÈGLE MÉTIER INVARIANTE : La collection 'clients' (base clients conclues) n'est JAMAIS
      // récupérée ici. Les affaires conclues restent définitivement sous la supervision de l'ANCIEN
      // Team Manager — elles constituent son bilan commercial et ne suivent pas le commercial.
    ])

    // ── PORTEFEUILLE ACTIF UNIQUEMENT ────────────────────────────────────────
    // Agréger et dédoublonner toutes les fiches pipeline du commercial,
    // EN EXCLUANT STRICTEMENT les affaires conclues (statut 'conclue').
    // Les conclues sont clôturées et restent dans le bilan de l'ancien TM.
    const pipelineDocsMap = new Map<string, any>()
    for (const d of [...pipelineUserSnap.docs, ...pipelineAssignedSnap.docs]) {
      const data = d.data()
      // Multi-tenant isolation : si orgCode est renseigné, il doit matcher
      if (!data.orgCode || data.orgCode === orgCode) {
        // 🔒 FILTRE ACTIF : exclure toute affaire conclue (won/closed)
        if (ACTIVE_PIPELINE_STATUSES.includes(data.status)) {
          pipelineDocsMap.set(d.id, d)
        }
      }
    }

    // Récupérer les fiches pointées par les assignations actives (si non encore dans la map)
    const activeAssignmentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []
    for (const aDoc of assignmentsSnap.docs) {
      const pEntryId = aDoc.data()?.pipelineEntryId
      if (pEntryId) {
        if (!pipelineDocsMap.has(pEntryId)) {
          try {
            const pDoc = await adminDb.collection('pipeline').doc(pEntryId).get()
            if (pDoc.exists) {
              const pData = pDoc.data()
              if ((!pData?.orgCode || pData?.orgCode === orgCode) && ACTIVE_PIPELINE_STATUSES.includes(pData?.status)) {
                pipelineDocsMap.set(pDoc.id, pDoc)
                activeAssignmentDocs.push(aDoc)
              }
            }
          } catch (err) {
            console.warn('[POST /api/team/members/transfer] pipelineEntryId fetch error:', err)
          }
        } else {
          // La fiche de pipeline est déjà dans la map (active) — inclure l'assignation
          activeAssignmentDocs.push(aDoc)
        }
      }
    }

    // Trouver les accès correspondant à ce commercial
    const matchingAccessDocs = accessesSnap.docs.filter((d) => {
      const ad = d.data()
      return (
        ad.firebaseUid === memberUid ||
        ad.memberId === memberUid ||
        (memberData.accessId && d.id.toLowerCase() === String(memberData.accessId).toLowerCase()) ||
        (memberData.email && ad.email && String(ad.email).toLowerCase() === String(memberData.email).toLowerCase())
      )
    })

    // ── 5. Exécution du batch atomique Firestore ──────────────────────────
    let batch = adminDb.batch()
    let opCount = 0

    const commitBatchIfFull = async () => {
      if (opCount >= 400) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    // A. Mettre à jour le document utilisateur du commercial
    batch.update(memberDoc.ref, {
      managerUid: targetManagerUid,
      previousManagerUid: sourceManagerUid,
      transferredAt: now,
      transferredByUid: callerUid,
      updatedAt: now
    })
    opCount++
    await commitBatchIfFull()

    // B. Mettre à jour les accès d'équipe
    for (const d of matchingAccessDocs) {
      batch.update(d.ref, {
        managerUid: targetManagerUid,
        managerName: targetManagerName,
        managerEmail: targetManagerEmail,
        previousManagerUid: sourceManagerUid,
        transferredAt: now,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // C. Transférer UNIQUEMENT les opportunités actives (prospection + négociation)
    // ⚠️ INVARIANT MÉTIER : les affaires 'conclue' ne sont JAMAIS transférées.
    // Elles restent dans la base clients (collection 'clients') de l'ancien TM.
    let transferredPipelineCount = 0
    for (const d of pipelineDocsMap.values()) {
      // Double-vérification défensive du statut (le filtre amont est déjà appliqué)
      const pData = d.data()
      if (!ACTIVE_PIPELINE_STATUSES.includes(pData?.status)) {
        console.warn(
          `[POST /api/team/members/transfer] Fiche ${d.id} ignorée (statut non actif: ${pData?.status})`
        )
        continue
      }
      batch.update(d.ref, {
        managerUid: targetManagerUid,
        managerName: targetManagerName,
        previousManagerUid: sourceManagerUid,
        orgCode: orgCode,
        assignedTo: memberUid,
        updatedAt: now
      })
      transferredPipelineCount++
      opCount++
      await commitBatchIfFull()
    }

    // D. Mettre à jour uniquement les assignations liées aux opportunités actives transférées
    for (const d of activeAssignmentDocs) {
      batch.update(d.ref, {
        managerUid: targetManagerUid,
        managerName: targetManagerName,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // E. Base Clients (collection 'clients') — INTOUCHABLE
    // ⛔ Les fiches conclues (clients) de la collection 'clients' restent DÉFINITIVEMENT
    //    attachées à l'ancien Team Manager. Elles ne sont PAS modifiées lors du transfert
    //    du commercial. C'est une règle métier fondamentale de gouvernance commerciale.

    // F. Mettre à jour les fiches CRM actives ("crm_clients")
    // Seules les fiches CRM en cours (non conclues) sont transférées avec le commercial.
    const crmDocsMap = new Map<string, any>()
    for (const d of [...crmAssignedSnap.docs, ...crmOwnerSnap.docs]) {
      const crmData = d.data()
      // Exclure les fiches CRM de type 'client converti' (statut conclue) — elles restent à l'ancien TM
      if (crmData?.status === 'conclue' || crmData?.type === 'client') continue
      crmDocsMap.set(d.id, d)
    }
    for (const d of crmDocsMap.values()) {
      batch.update(d.ref, {
        managerUid: targetManagerUid,
        previousManagerUid: sourceManagerUid,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Valider le batch restant
    if (opCount > 0) {
      await batch.commit()
    }

    // ── 6. Heartbeat organisation en temps réel ───────────────────────────
    try {
      await adminDb.collection('organisations').doc(orgCode).update({
        lastPipelineUpdate: now.toISOString(),
        lastTeamUpdate: now.toISOString(),
        updatedAt: now
      })
    } catch (orgErr) {
      console.warn('[POST /api/team/members/transfer] org heartbeat failed:', orgErr)
    }

    // ── 7. Notifications In-App ──────────────────────────────────────────
    try {
      const { createUserNotification } = await import('@/lib/user-notifications')
      const callerName = callerData.displayName || callerData.name || 'Senior Manager'

      // Notification pour le commercial
      await createUserNotification({
        userId: memberUid,
        type: 'general',
        title: 'Changement de Team Manager',
        message: `Votre affectation d'équipe a été mise à jour par le Senior Manager (${callerName}). Votre nouveau Team Manager est désormais ${targetManagerName}. Vos opportunités en cours restent actives dans votre pipeline.`,
        link: '/pipeline'
      })

      // Notification pour le nouveau Team Manager
      await createUserNotification({
        userId: targetManagerUid,
        type: 'general',
        title: 'Nouveau commercial dans votre équipe',
        message: `Le commercial ${memberName} a été transféré dans votre équipe par le Senior Manager (${callerName}), avec ${transferredPipelineCount} opportunité(s) active(s) transférée(s). Les affaires conclues restent enregistrées dans la base clients de l'ancien Team Manager.`,
        link: '/team'
      })

      // Notification pour l'ancien Team Manager s'il existe
      if (sourceManagerUid) {
        await createUserNotification({
          userId: sourceManagerUid,
          type: 'general',
          title: 'Réaffectation d’un commercial',
          message: `Le commercial ${memberName} a été réaffecté vers l'équipe de ${targetManagerName} par le Senior Manager (${callerName}). Vos affaires conclues avec ce commercial restent intégralement dans votre base clients.`,
          link: '/team'
        })
      }
    } catch (notifErr) {
      console.warn('[POST /api/team/members/transfer] Notification error:', notifErr)
    }

    return NextResponse.json({
      success: true,
      member: {
        uid: memberUid,
        name: memberName
      },
      sourceManager: {
        uid: sourceManagerUid,
        name: sourceManagerName
      },
      targetManager: {
        uid: targetManagerUid,
        name: targetManagerName
      },
      // Nombre d'opportunités ACTIVES transférées (conclues exclues — restent à l'ancien TM)
      transferredActivePipelineCount: transferredPipelineCount
    })
  } catch (error: any) {
    console.error('[POST /api/team/members/transfer] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Erreur interne lors du transfert du commercial' },
      { status: 500 }
    )
  }
}
