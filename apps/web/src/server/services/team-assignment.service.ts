// apps/web/src/server/services/team-assignment.service.ts
// Service métier d'assignation des prospects au sein d'une équipe ou d'une organisation.
// Garantit l'isolation multi-tenant stricte, la préservation des invariants Firestore et le snapshot Supabase.

import { FieldValue } from 'firebase-admin/firestore'
import { getSupabaseCompanyById, supabaseCompanyToAppRecord } from '@/lib/supabase-companies'
import type { ServerSession } from '@/server/guards/auth.guard'

export class AssignmentBusinessError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AssignmentBusinessError'
    this.status = status
  }
}

export interface AssignmentItem {
  id: string
  managerUid: string
  managerName: string
  memberId: string
  memberName: string
  memberEmail: string
  pipelineItemId: string
  pipelineEntryId: string
  companyName: string
  status: 'active' | 'done'
  createdAt: string
  updatedAt: string
}

export interface CreateAssignmentParams {
  pipelineItemId: string
  memberId: string
  companyName?: string
}

export interface CreateAssignmentResult {
  success: boolean
  message?: string
  assignmentId: string
  pipelineEntryId: string
}

export const TeamAssignmentService = {
  /**
   * Récupère toutes les assignations créées par un manager (actives et legacy).
   */
  async getAssignmentsByManager(managerUid: string): Promise<AssignmentItem[]> {
    const { adminDb } = await import('@/lib/firebase-admin')

    const [teamSnap, legacySnap] = await Promise.all([
      adminDb.collection('team_assignments').where('managerUid', '==', managerUid).get(),
      adminDb.collection('assignments').where('managerUid', '==', managerUid).get()
    ])

    const teamItems: AssignmentItem[] = teamSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        managerUid: data.managerUid ?? managerUid,
        managerName: data.managerName ?? '',
        memberId: data.memberId ?? '',
        memberName: data.memberName ?? '',
        memberEmail: data.memberEmail ?? '',
        pipelineItemId: data.pipelineItemId ?? '',
        pipelineEntryId: data.pipelineEntryId ?? '',
        companyName: data.companyName ?? '',
        status: (data.status as 'active' | 'done') ?? 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString()
      }
    })

    const legacyItemsRaw = legacySnap.docs.filter((doc) => doc.data().status !== 'done')

    const legacyItems: AssignmentItem[] = await Promise.all(
      legacyItemsRaw.map(async (doc) => {
        const data = doc.data()
        const prospectIds: string[] = Array.isArray(data.prospectIds) ? data.prospectIds : []
        const firstProspectId = prospectIds[0] ?? ''
        const count = prospectIds.length

        let companyName = count > 1 ? `${count} prospects` : firstProspectId
        if (firstProspectId) {
          try {
            const pDoc = await adminDb.collection('pipeline').doc(firstProspectId).get()
            if (pDoc.exists) {
              const pd = pDoc.data() || {}
              companyName = pd.companyName ?? pd.name ?? companyName
            } else {
              const mDoc = await adminDb.collection('manager_prospects').doc(firstProspectId).get()
              if (mDoc.exists) {
                const md = mDoc.data() || {}
                companyName = md.name ?? md.companyName ?? companyName
              } else {
                const iDoc = await adminDb.collection('imported_prospects').doc(firstProspectId).get()
                if (iDoc.exists) {
                  const id = iDoc.data() || {}
                  companyName = id.name ?? id.companyName ?? companyName
                }
              }
            }
          } catch {
            /* ignore */
          }
        }

        const assigneeId: string = data.assigneeId ?? ''
        let memberName = ''
        let memberEmail = ''
        let memberUid = data.assigneeUid ?? ''
        if (assigneeId) {
          try {
            const aDoc = await adminDb
              .collection('team_accesses')
              .doc(assigneeId.trim().toLowerCase())
              .get()
            if (aDoc.exists) {
              const ad = aDoc.data() || {}
              memberName = `${ad.firstname ?? ''} ${ad.lastname ?? ''}`.trim()
              memberEmail = ad.email ?? ''
              memberUid = ad.firebaseUid ?? memberUid
            }
          } catch {
            /* ignore */
          }
        }

        return {
          id: doc.id,
          managerUid: data.managerUid ?? managerUid,
          managerName: data.managerName ?? '',
          memberId: memberUid || assigneeId,
          memberName,
          memberEmail,
          pipelineItemId: firstProspectId,
          pipelineEntryId: '',
          companyName,
          status: 'active' as const,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString()
        }
      })
    )

    return [...teamItems, ...legacyItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  /**
   * Assigne un prospect à un commercial membre d'équipe ou agent support.
   */
  async createAssignment(
    session: ServerSession,
    params: CreateAssignmentParams
  ): Promise<CreateAssignmentResult> {
    const { adminDb } = await import('@/lib/firebase-admin')
    const { pipelineItemId, memberId, companyName: providedName } = params

    if (!pipelineItemId || !memberId) {
      throw new AssignmentBusinessError('pipelineItemId et memberId requis', 400)
    }

    const managerUid = session.uid
    const managerData = session.userData
    const managerName = managerData.name ?? managerData.email ?? ''

    // 1. Résolution des détails du prospect (pipeline -> Supabase -> manager_prospects -> legacy)
    let companyName = providedName || pipelineItemId
    let prospectData: Record<string, unknown> = {}

    if (!providedName) {
      const pipelineDoc = await adminDb.collection('pipeline').doc(pipelineItemId).get()
      if (pipelineDoc.exists) {
        const d = pipelineDoc.data() || {}
        companyName = d.companyName || d.name || pipelineItemId
        prospectData = d
      } else {
        const companyRecord = await getSupabaseCompanyById(pipelineItemId)
        if (companyRecord) {
          const d = supabaseCompanyToAppRecord(companyRecord)
          const resolvedName = d.raisonSociale || d.name
          companyName = typeof resolvedName === 'string' ? resolvedName : pipelineItemId
          prospectData = d
        } else {
          const managerProspectDoc = await adminDb
            .collection('manager_prospects')
            .doc(pipelineItemId)
            .get()
          if (managerProspectDoc.exists) {
            const d = managerProspectDoc.data() || {}
            companyName = d.name || d.companyName || d.raisonSociale || pipelineItemId
            prospectData = d
          } else {
            const importedDoc = await adminDb
              .collection('imported_prospects')
              .doc(pipelineItemId)
              .get()
            if (importedDoc.exists) {
              const d = importedDoc.data() || {}
              companyName = d.name || d.companyName || pipelineItemId
              prospectData = d
            }
          }
        }
      }
    } else {
      const pDoc = await adminDb.collection('pipeline').doc(pipelineItemId).get()
      const companyRecord = !pDoc.exists ? await getSupabaseCompanyById(pipelineItemId) : null
      const mDoc =
        !pDoc.exists && !companyRecord
          ? await adminDb.collection('manager_prospects').doc(pipelineItemId).get()
          : null
      const iDoc =
        !pDoc.exists && !companyRecord && !mDoc?.exists
          ? await adminDb.collection('imported_prospects').doc(pipelineItemId).get()
          : null

      if (pDoc.exists) prospectData = pDoc.data() || {}
      else if (companyRecord) prospectData = supabaseCompanyToAppRecord(companyRecord)
      else if (mDoc?.exists) prospectData = mDoc.data() || {}
      else if (iDoc?.exists) prospectData = iDoc.data() || {}
    }

    // 2. Contrôle d'isolation sur le prospect source
    const prospectManagerUid = (prospectData.managerUid || prospectData.userId) as string | undefined
    const prospectOrgCode = prospectData.orgCode as string | undefined
    if (prospectManagerUid && prospectManagerUid !== managerUid) {
      const isOrgMatch = Boolean(
        managerData.orgCode && prospectOrgCode && prospectOrgCode === managerData.orgCode
      )
      if (!isOrgMatch) {
        throw new AssignmentBusinessError("Vous n'avez pas l'autorisation d'assigner ce prospect.", 403)
      }
    }

    // 3. Récupération et vérification du membre cible
    const memberDoc = await adminDb.collection('users').doc(memberId).get()
    if (!memberDoc.exists) {
      throw new AssignmentBusinessError('Membre introuvable', 404)
    }
    const memberData = memberDoc.data() || {}

    // Contrôle d'isolation multi-tenant du membre
    const isSameManager = memberData.managerUid === managerUid
    const isSameOrg = Boolean(
      managerData.orgCode && memberData.orgCode && memberData.orgCode === managerData.orgCode
    )
    if (!isSameManager && !isSameOrg) {
      throw new AssignmentBusinessError(
        "Ce membre n'appartient pas à votre équipe ni à votre organisation.",
        403
      )
    }

    if (memberData.role !== 'member' && memberData.role !== 'support_agent') {
      throw new AssignmentBusinessError(
        "Seuls les membres d'équipe et agents support peuvent recevoir des prospects.",
        400
      )
    }

    let memberName: string = memberData.name ?? ''
    const memberEmail: string = memberData.email ?? ''
    const memberAccessId: string | null = memberData.accessId ?? null

    if (!memberName) {
      const accessKey = memberAccessId || memberId
      try {
        const accessDoc = await adminDb
          .collection('team_accesses')
          .doc(accessKey.trim().toLowerCase())
          .get()
        if (accessDoc.exists) {
          const ad = accessDoc.data() || {}
          memberName = `${ad.firstname ?? ''} ${ad.lastname ?? ''}`.trim()
        }
      } catch {
        /* ignore */
      }
    }
    if (!memberName) {
      memberName = memberEmail || ''
    }

    // 4. Historique des assignations précédentes
    const prevAssigneesMap = new Map<
      string,
      { userId: string; memberName: string; assignedAt: string }
    >()
    if (pipelineItemId) {
      try {
        const bySource = await adminDb
          .collection('pipeline')
          .where('sourceProspectId', '==', pipelineItemId)
          .get()
        bySource.docs.forEach((doc) => {
          const d = doc.data()
          const isManager =
            d.userId === managerUid || d.assignedTo === managerUid || d.role === 'manager'
          if (d.userId && d.userId !== memberId && !isManager) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) {
        console.error('Error fetching by sourceProspectId', err)
      }
    }
    if (companyName) {
      try {
        const byName = await adminDb
          .collection('pipeline')
          .where('companyName', '==', companyName)
          .get()
        byName.docs.forEach((doc) => {
          const d = doc.data()
          const isManager =
            d.userId === managerUid || d.assignedTo === managerUid || d.role === 'manager'
          if (d.userId && d.userId !== memberId && !isManager) {
            prevAssigneesMap.set(d.userId, {
              userId: d.userId,
              memberName: d.memberName || d.userId,
              assignedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            })
          }
        })
      } catch (err) {
        console.error('Error fetching by companyName', err)
      }
    }
    const previousAssignees = Array.from(prevAssigneesMap.values())

    // 5. Anti-doublon d'assignation
    const existingSnap = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .where('memberId', '==', memberId)
      .where('pipelineItemId', '==', pipelineItemId)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return {
        success: true,
        message: 'Déjà assigné',
        assignmentId: existingSnap.docs[0]!.id,
        pipelineEntryId: existingSnap.docs[0]!.data().pipelineEntryId
      }
    }

    // 6. Création de la fiche pipeline assignée au MEMBRE
    const pipelineRef = adminDb.collection('pipeline').doc()
    await pipelineRef.set({
      ...Object.fromEntries(
        Object.entries(prospectData).filter(
          ([k]) =>
            ![
              'userId',
              'managerUid',
              'createdAt',
              'updatedAt',
              'status',
              'assignedTo',
              'memberName',
              'memberAccessId',
              'assignedBy',
              'assignedByName',
              'id',
              'sourceProspectId',
              'previousAssignees'
            ].includes(k)
        )
      ),
      companyPhone:
        prospectData.companyPhone ||
        prospectData.telephone ||
        prospectData.phone ||
        prospectData.tel ||
        null,
      companyEmail: prospectData.companyEmail || prospectData.email || prospectData.mail || null,
      companySector:
        prospectData.companySector ||
        prospectData.sector ||
        prospectData.secteur ||
        prospectData.activite ||
        null,
      companyCity:
        prospectData.companyCity ||
        prospectData.city ||
        prospectData.ville ||
        prospectData.region ||
        null,
      userId: memberId,
      assignedTo: memberId,
      memberName: memberName,
      memberAccessId: memberAccessId ? memberAccessId.toLowerCase() : null,
      managerUid,
      orgCode: managerData.orgCode || (prospectData.orgCode as string) || null,
      seniorManagerUid:
        managerData.seniorManagerUid ||
        (managerData.orgRole === 'senior_manager' ? managerUid : null),
      originSource:
        (prospectData.originSource as string) ||
        (pipelineItemId.startsWith('comp_') ? 'supabase_directory' : 'pipeline'),
      externalDirectoryId:
        (prospectData.externalDirectoryId as string) || (prospectData.companyId as string) || null,
      companyName,
      name: companyName,
      status: 'prospection',
      assignedBy: managerUid,
      assignedByName: managerName,
      sourceProspectId: pipelineItemId,
      previousAssignees,
      enteredAt: new Date().toISOString(),
      assignedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 7. Nettoyage de la copie d'origine non assignée du manager
    try {
      if (pipelineItemId) {
        const origDoc = await adminDb.collection('pipeline').doc(pipelineItemId).get()
        if (
          origDoc.exists &&
          (origDoc.data()?.userId === managerUid || origDoc.data()?.managerUid === managerUid) &&
          (!origDoc.data()?.assignedTo || origDoc.data()?.assignedTo === managerUid)
        ) {
          await origDoc.ref.delete()
        }
      }

      if (companyName) {
        const ownDupes = await adminDb
          .collection('pipeline')
          .where('userId', '==', managerUid)
          .where('companyName', '==', companyName)
          .get()
        for (const d of ownDupes.docs) {
          if (
            d.id !== pipelineRef.id &&
            (!d.data().assignedTo || d.data().assignedTo === managerUid)
          ) {
            await d.ref.delete()
          }
        }
      }
    } catch (cleanupErr) {
      console.warn('[TeamAssignmentService] Clean up manager copy error:', cleanupErr)
    }

    // 8. Création du document d'assignation
    const assignmentRef = adminDb.collection('team_assignments').doc()
    await assignmentRef.set({
      managerUid,
      managerName,
      memberId,
      memberName,
      memberEmail,
      pipelineItemId,
      pipelineEntryId: pipelineRef.id,
      companyName,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return {
      success: true,
      assignmentId: assignmentRef.id,
      pipelineEntryId: pipelineRef.id
    }
  }
}
