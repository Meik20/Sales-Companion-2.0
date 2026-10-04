import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdminModules() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

// ── GET /api/imports — Liste les prospects du manager ──────────────────
export async function GET(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')
    const assignedTo = searchParams.get('assignedTo') // optionnel

    if (!managerId) {
      return NextResponse.json({ message: 'managerId requis' }, { status: 400 })
    }

    // Query simplifiée : where seulement (pas d'orderBy pour éviter les composite indexes)
    const q = adminDb
      .collection('manager_prospects')
      .where('managerId', '==', managerId)
      .limit(3000)

    const snap = await q.get()

    // Tri et filtrage côté app
    let prospects = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      }
    })

    // Trier par createdAt (descendant)
    prospects.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return bTime - aTime
    })

    // Filtrage optionnel par assigné
    const filtered = assignedTo
      ? prospects.filter((p: Record<string, unknown>) => p.assignedTo === assignedTo)
      : prospects

    return NextResponse.json({ prospects: filtered })
  } catch (error) {
    console.error('[imports GET] Error fetching prospects:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    console.error('[imports GET] Error details:', { message: msg, error })
    return NextResponse.json({ message: 'Erreur serveur', details: msg }, { status: 500 })
  }
}

// ── POST /api/imports — Importer des prospects depuis un CSV parsé ────
export async function POST(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()

    // ── Authentification obligatoire ───────────────────────────────────────
    const { adminAuth } = await import('@/lib/firebase-admin')
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Vérifier le rôle : seul manager ou support_agent peut importer
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()
    const callerRole = callerData?.role as string | undefined

    if (!['manager', 'support_agent'].includes(callerRole ?? '')) {
      return NextResponse.json(
        { message: 'Accès refusé. Seul un manager ou un agent support peut importer des prospects.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })
    }

    const { managerId, prospects } = body as {
      managerId?: string
      prospects?: Array<{
        name?: string
        phone?: string
        email?: string
        city?: string
        sector?: string
        notes?: string
        assignedTo?: string
      }>
    }

    if (!managerId || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json(
        { message: 'managerId et une liste de prospects sont requis' },
        { status: 400 }
      )
    }

    // Sécurité : un support_agent peut importer sous son propre UID ou sous un manager lié
    if (callerRole === 'support_agent') {
      const linkedManagerUids: string[] = callerData?.linkedManagerUids ?? []
      const allowedIds = [callerUid, ...linkedManagerUids]
      if (!allowedIds.includes(managerId)) {
        return NextResponse.json(
          { message: 'Accès refusé. Vous ne pouvez importer que pour votre propre compte ou votre manager lié.' },
          { status: 403 }
        )
      }
    }

    // Sécurité : un manager ne peut importer que sous son propre uid
    if (callerRole === 'manager' && managerId !== callerUid) {
      return NextResponse.json(
        { message: 'Accès refusé. Vous ne pouvez importer que pour votre propre compte.' },
        { status: 403 }
      )
    }

    if (prospects.length > 3000) {
      return NextResponse.json({ message: 'Maximum 3000 prospects par import' }, { status: 400 })
    }

    // Écriture en multi-batch Firestore (limite Firestore = 500 writes par batch)
    let importedCount = 0
    let currentBatch = adminDb.batch()
    let batchOps = 0
    const colRef = adminDb.collection('manager_prospects')
    const now = new Date()

    const flush = async () => {
      if (batchOps > 0) {
        await currentBatch.commit()
        currentBatch = adminDb.batch()
        batchOps = 0
      }
    }

    for (const p of prospects) {
      const ref = colRef.doc()
      currentBatch.set(ref, {
        managerId,
        name: (p.name ?? '').trim(),
        phone: (p.phone ?? '').trim(),
        email: (p.email ?? '').trim(),
        city: (p.city ?? '').trim(),
        sector: (p.sector ?? '').trim(),
        notes: (p.notes ?? '').trim(),
        assignedTo: p.assignedTo ?? null,
        importedBy: callerUid,      // traçabilité : qui a fait l'import
        importedByRole: callerRole, // traçabilité : quel rôle
        status: 'new',
        createdAt: now,
        updatedAt: now
      })
      batchOps++
      importedCount++
      if (batchOps >= 499) await flush()
    }
    await flush()

    return NextResponse.json({ success: true, count: importedCount })
  } catch (error) {
    console.error('[imports POST] Error importing prospects:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    console.error('[imports POST] Error details:', { message: msg, error })
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

// ── PATCH /api/imports — Assigner un prospect à un membre ────────────
// Cette route met à jour manager_prospects ET propage l'assignation dans
// le pipeline (entrée membre) et dans team_assignments, exactement comme
// POST /api/team/assignments.
export async function PATCH(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
    const { adminAuth } = await import('@/lib/firebase-admin')

    // ── Auth ─────────────────────────────────────────────────────────────
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    let managerName = ''
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
      const managerDoc = await adminDb.collection('users').doc(managerUid).get()
      managerName = managerDoc.data()?.name ?? managerDoc.data()?.email ?? ''
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })

    const { prospectId, assignedTo, managerId } = body as {
      prospectId?: string
      assignedTo?: string | null
      managerId?: string
    }

    if (!prospectId || !managerId) {
      return NextResponse.json({ message: 'prospectId et managerId requis' }, { status: 400 })
    }

    // Sécurité : seul le manager propriétaire peut assigner
    if (managerUid !== managerId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    // ── Charger le prospect importé ───────────────────────────────────────
    const prospectRef = adminDb.collection('manager_prospects').doc(prospectId)
    const prospectSnap = await prospectRef.get()

    if (!prospectSnap.exists || prospectSnap.data()?.managerId !== managerId) {
      return NextResponse.json({ message: 'Prospect non trouvé ou accès refusé' }, { status: 403 })
    }

    const prospectData = prospectSnap.data()!
    const previousAssignedTo: string | null = prospectData.assignedTo ?? null
    const companyName: string = prospectData.name || prospectData.companyName || prospectId

    // ── Cas 1 : DÉSASSIGNATION (assignedTo = null / vide) ─────────────────
    if (!assignedTo) {
      // Mettre à jour le prospect importé
      await prospectRef.update({ assignedTo: null, updatedAt: new Date() })

      // Supprimer l'entrée pipeline du membre précédent (si elle existe)
      if (previousAssignedTo) {
        try {
          // Chercher par sourceProspectId = prospectId
          const pipeSnap = await adminDb
            .collection('pipeline')
            .where('sourceProspectId', '==', prospectId)
            .where('userId', '==', previousAssignedTo)
            .get()
          const batch = adminDb.batch()
          pipeSnap.docs.forEach((d) => batch.delete(d.ref))

          // Supprimer le(s) team_assignment(s) correspondant(s)
          const taSnap = await adminDb
            .collection('team_assignments')
            .where('managerUid', '==', managerUid)
            .where('pipelineItemId', '==', prospectId)
            .get()
          taSnap.docs.forEach((d) => batch.delete(d.ref))

          await batch.commit()
        } catch (cleanupErr) {
          console.warn('[imports PATCH] cleanup error', cleanupErr)
        }
      }

      return NextResponse.json({ success: true, action: 'unassigned' })
    }

    // ── Cas 2 : ASSIGNATION / RÉASSIGNATION ──────────────────────────────

    // Résoudre les infos du membre destinataire
    const memberDoc = await adminDb.collection('users').doc(assignedTo).get()
    const memberData = memberDoc.data() || {}
    let memberName: string = memberData.name ?? ''
    const memberEmail: string = memberData.email ?? ''
    const memberAccessId: string | null = memberData.accessId ?? null

    if (!memberName) {
      // Fallback : chercher dans team_accesses
      const accessKey = memberAccessId || assignedTo
      try {
        const accessDoc = await adminDb
          .collection('team_accesses')
          .doc(accessKey.trim().toLowerCase())
          .get()
        if (accessDoc.exists) {
          const ad = accessDoc.data()!
          memberName = `${ad.firstname ?? ''} ${ad.lastname ?? ''}`.trim()
        }
      } catch { /* ignore */ }
    }
    if (!memberName) memberName = memberEmail || ''

    // Si c'était déjà assigné à quelqu'un d'autre → désassigner l'ancien d'abord
    if (previousAssignedTo && previousAssignedTo !== assignedTo) {
      try {
        const oldPipeSnap = await adminDb
          .collection('pipeline')
          .where('sourceProspectId', '==', prospectId)
          .where('userId', '==', previousAssignedTo)
          .get()
        const batch = adminDb.batch()
        oldPipeSnap.docs.forEach((d) => batch.delete(d.ref))

        const oldTaSnap = await adminDb
          .collection('team_assignments')
          .where('managerUid', '==', managerUid)
          .where('pipelineItemId', '==', prospectId)
          .where('memberId', '==', previousAssignedTo)
          .get()
        oldTaSnap.docs.forEach((d) => batch.delete(d.ref))
        await batch.commit()
      } catch (cleanupErr) {
        console.warn('[imports PATCH] old assignment cleanup error', cleanupErr)
      }
    }

    // Vérifier si l'assignation existe déjà pour éviter les doublons
    const existingTa = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .where('memberId', '==', assignedTo)
      .where('pipelineItemId', '==', prospectId)
      .limit(1)
      .get()

    let pipelineEntryId: string

    if (existingTa.empty) {
      // ── Créer l'entrée pipeline pour le membre ────────────────────────
      const pipelineRef = adminDb.collection('pipeline').doc()
      pipelineEntryId = pipelineRef.id

      await pipelineRef.set({
        userId: assignedTo,           // le membre voit dans son pipeline
        assignedTo: assignedTo,
        memberName,
        memberEmail,
        memberAccessId: memberAccessId ? memberAccessId.toLowerCase() : null,
        managerUid,                   // le manager voit via /api/pipeline/manager
        companyName,
        name: companyName,
        companySector: prospectData.sector ?? prospectData.companySector ?? null,
        companyCity: prospectData.city ?? prospectData.companyCity ?? null,
        companyPhone: prospectData.phone ?? prospectData.companyPhone ?? null,
        companyEmail: prospectData.email ?? prospectData.companyEmail ?? null,
        status: 'prospection',
        sourceProspectId: prospectId, // référence vers le prospect importé
        assignedBy: managerUid,
        assignedByName: managerName,
        note: prospectData.notes ?? '',
        previousAssignees: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })

      // ── Créer l'entrée team_assignment ────────────────────────────────
      const assignmentRef = adminDb.collection('team_assignments').doc()
      await assignmentRef.set({
        managerUid,
        managerName,
        memberId: assignedTo,
        memberName,
        memberEmail,
        pipelineItemId: prospectId,      // référence au prospect importé
        pipelineEntryId,                  // nouvelle entrée pipeline du membre
        companyName,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    } else {
      pipelineEntryId = existingTa.docs[0]!.data().pipelineEntryId ?? ''
    }

    // ── Mettre à jour le prospect importé ─────────────────────────────────
    await prospectRef.update({
      assignedTo,
      assignedMemberName: memberName,
      pipelineEntryId,
      updatedAt: new Date()
    })

    return NextResponse.json({ success: true, action: 'assigned', pipelineEntryId })
  } catch (error) {
    console.error('[imports PATCH] Error updating prospect:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}


// ── DELETE /api/imports — Supprimer des prospects ou vider la liste ───
export async function DELETE(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
    const { adminAuth } = await import('@/lib/firebase-admin')

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()
    const callerRole = callerData?.role as string | undefined

    if (!['manager', 'support_agent', 'admin'].includes(callerRole ?? '')) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)

    const managerId = (body.managerId || searchParams.get('managerId')) as string | undefined
    const prospectId = (body.prospectId || searchParams.get('prospectId')) as string | undefined
    const prospectIds = body.prospectIds as string[] | undefined
    const clearAll = body.clearAll === true || searchParams.get('clearAll') === 'true'

    if (!managerId) {
      return NextResponse.json({ message: 'managerId requis' }, { status: 400 })
    }

    // Sécurité permissions
    if (callerRole === 'manager' && managerId !== callerUid) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }
    if (callerRole === 'support_agent') {
      const linkedManagerUids: string[] = callerData?.linkedManagerUids ?? []
      const allowed = [callerUid, ...linkedManagerUids]
      if (!allowed.includes(managerId)) {
        return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
      }
    }

    // 1. Vider toute la liste pour ce managerId
    if (clearAll) {
      const snap = await adminDb
        .collection('manager_prospects')
        .where('managerId', '==', managerId)
        .limit(3000)
        .get()

      if (snap.empty) {
        return NextResponse.json({ success: true, count: 0 })
      }

      let deletedCount = 0
      let batch = adminDb.batch()
      let ops = 0

      for (const doc of snap.docs) {
        batch.delete(doc.ref)
        ops++
        deletedCount++
        if (ops >= 499) {
          await batch.commit()
          batch = adminDb.batch()
          ops = 0
        }
      }
      if (ops > 0) {
        await batch.commit()
      }

      return NextResponse.json({ success: true, count: deletedCount })
    }

    // 2. Suppression multiple (prospectIds)
    if (Array.isArray(prospectIds) && prospectIds.length > 0) {
      let deletedCount = 0
      let batch = adminDb.batch()
      let ops = 0

      for (const id of prospectIds) {
        const ref = adminDb.collection('manager_prospects').doc(id)
        batch.delete(ref)
        ops++
        deletedCount++
        if (ops >= 499) {
          await batch.commit()
          batch = adminDb.batch()
          ops = 0
        }
      }
      if (ops > 0) {
        await batch.commit()
      }

      return NextResponse.json({ success: true, count: deletedCount })
    }

    // 3. Suppression individuelle (prospectId)
    if (prospectId) {
      const ref = adminDb.collection('manager_prospects').doc(prospectId)
      const snap = await ref.get()
      if (!snap.exists) {
        return NextResponse.json({ success: true, count: 0 })
      }
      const data = snap.data()
      if (data?.managerId !== managerId && callerRole !== 'admin') {
        return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
      }
      await ref.delete()
      return NextResponse.json({ success: true, count: 1 })
    }

    return NextResponse.json({ message: 'Action de suppression non spécifiée' }, { status: 400 })
  } catch (error) {
    console.error('[imports DELETE] Error deleting prospects:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}

