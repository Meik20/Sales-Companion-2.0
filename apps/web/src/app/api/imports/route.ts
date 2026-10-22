import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdminModules() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

// ── GET /api/imports — Liste les prospects du manager ──────────────────
export async function GET(request: NextRequest) {
  try {
    const { adminDb } = await getAdminModules()
    const { adminAuth } = await import('@/lib/firebase-admin')

    // ── Authentification obligatoire ──────────────────────────────────────
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
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

    if (callerRole === 'manager' && !hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')
    const assignedTo = searchParams.get('assignedTo') // optionnel

    if (!managerId) {
      return NextResponse.json({ message: 'managerId requis' }, { status: 400 })
    }

    // ── Contrôle d'accès strict ───────────────────────────────────────────
    if (callerRole === 'admin') {
      // Admin peut tout lire — pas de restriction supplémentaire
    } else if (callerRole === 'manager' || callerRole === 'independent') {
      // Un manager / indépendant ne peut lire que ses propres prospects
      if (managerId !== callerUid) {
        return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
      }
    } else if (callerRole === 'support_agent') {
      // Un support agent ne peut lire que les prospects de ses managers liés
      const linkedManagerUids: string[] = callerData?.linkedManagerUids ?? []
      const allowed = [callerUid, ...linkedManagerUids]
      if (!allowed.includes(managerId)) {
        return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    // ── Détection et interrogation Supabase private_prospects (Zéro quota Firestore) ──
    let supabaseProspects: any[] = []
    try {
      const { isPrivateProspectsTableAvailable, getPrivateProspects, supabasePrivateProspectToApp } =
        await import('@/lib/supabase-private-prospects')
      if (await isPrivateProspectsTableAvailable()) {
        const isSenior = callerData?.orgRole === 'senior_manager' && managerId === callerUid
        const sbRes = await getPrivateProspects({
          orgCode: callerData?.orgCode || undefined,
          seniorUid: isSenior ? callerUid : undefined,
          managerUid: isSenior ? undefined : managerId,
          userId: isSenior ? undefined : (callerData?.role === 'independent' ? callerUid : undefined),
          assignedTo: assignedTo || undefined,
          limit: 3000
        })
        supabaseProspects = sbRes.prospects.map(supabasePrivateProspectToApp)
      }
    } catch (sbErr) {
      console.warn('[imports GET] Supabase lookup error:', sbErr)
    }

    // Query Firestore (legacy / transition) : where seulement (pas d'orderBy pour éviter les composite indexes)
    let snapDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []

    if (callerData?.orgRole === 'senior_manager' && managerId === callerUid) {
      // Pour le Senior Manager, on récupère à la fois les prospects encore sous son managerId,
      // ET ceux qu'il a importés et transférés à des Team Managers
      const [byManagerSnap, byImportedSnap, byTransferredSnap] = await Promise.all([
        adminDb.collection('manager_prospects').where('managerId', '==', callerUid).limit(3000).get(),
        adminDb.collection('manager_prospects').where('importedBy', '==', callerUid).limit(3000).get(),
        adminDb.collection('manager_prospects').where('transferredFromSeniorUid', '==', callerUid).limit(3000).get()
      ])
      const seen = new Set<string>()
      for (const d of [...byManagerSnap.docs, ...byImportedSnap.docs, ...byTransferredSnap.docs]) {
        if (!seen.has(d.id)) {
          seen.add(d.id)
          snapDocs.push(d)
        }
      }
    } else {
      const q = adminDb
        .collection('manager_prospects')
        .where('managerId', '==', managerId)
        .limit(3000)
      const snap = await q.get()
      snapDocs = snap.docs
    }

    // Tri et filtrage côté app
    let prospects = snapDocs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      }
    })

    // Fusion dédoublonnée (Supabase prioritaire + Firestore legacy)
    const seen = new Set<string>()
    const mergedProspects: any[] = []

    for (const p of supabaseProspects) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        mergedProspects.push({
          ...p,
          createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt
        })
      }
    }

    for (const p of prospects) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        mergedProspects.push(p)
      }
    }

    // Trier par createdAt (descendant)
    mergedProspects.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return bTime - aTime
    })

    // ── Résolution par lot des noms d'utilisateurs (Anti-fuite d'UIDs) ──
    const userIdsToResolve = new Set<string>()
    for (const p of mergedProspects) {
      if (p.transferredToManagerUid && typeof p.transferredToManagerUid === 'string') {
        userIdsToResolve.add(p.transferredToManagerUid)
      }
      if (p.managerId && typeof p.managerId === 'string') {
        userIdsToResolve.add(p.managerId)
      }
      if (p.assignedTo && typeof p.assignedTo === 'string') {
        userIdsToResolve.add(p.assignedTo)
      }
    }

    if (userIdsToResolve.size > 0) {
      const userNamesMap = new Map<string, string>()
      try {
        const uids = Array.from(userIdsToResolve)
        const docRefs = uids.map((uid) => adminDb.collection('users').doc(uid))
        for (let i = 0; i < docRefs.length; i += 100) {
          const chunk = docRefs.slice(i, i + 100)
          const snaps = await adminDb.getAll(...chunk)
          for (const snap of snaps) {
            if (snap.exists) {
              const uData = snap.data()
              const name = uData?.name || uData?.displayName || uData?.email || null
              if (name) {
                userNamesMap.set(snap.id, name)
              }
            }
          }
        }
      } catch (errResolve) {
        console.warn('[imports GET] User names batch resolution error:', errResolve)
      }

      for (const p of mergedProspects) {
        const targetTmUid = (p.transferredToManagerUid || p.managerId) as string | undefined
        if (!p.transferredToManagerName && targetTmUid && userNamesMap.has(targetTmUid)) {
          p.transferredToManagerName = userNamesMap.get(targetTmUid)
        }
        if (targetTmUid && userNamesMap.has(targetTmUid)) {
          p.managerName = userNamesMap.get(targetTmUid)
        }
        if (!p.assignedMemberName && p.assignedTo && userNamesMap.has(p.assignedTo)) {
          p.assignedMemberName = userNamesMap.get(p.assignedTo)
        }
      }
    }

    const isSenior = callerData?.orgRole === 'senior_manager' && managerId === callerUid

    // 🔒 GARDE-FOU RÔLE SENIOR MANAGER :
    // Le Senior Manager ne doit voir que ses opportunités importées, gérées ou transférées par lui.
    // Les fiches importées par des agents support ou d'autres managers non déléguées sont exclues.
    const scopedProspects = isSenior
      ? mergedProspects.filter(
          (p) =>
            p.userId === callerUid ||
            p.managerId === callerUid ||
            p.transferredFromSeniorUid === callerUid
        )
      : mergedProspects

    // Filtrage optionnel par assigné
    const filtered = assignedTo
      ? scopedProspects.filter((p: Record<string, unknown>) => p.assignedTo === assignedTo)
      : scopedProspects

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

    if (!['manager', 'support_agent', 'independent'].includes(callerRole ?? '')) {
      return NextResponse.json(
        {
          message:
            'Accès refusé. Seul un manager, un indépendant ou un agent support peut importer des prospects.'
        },
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
          {
            message:
              'Accès refusé. Vous ne pouvez importer que pour votre propre compte ou votre manager lié.'
          },
          { status: 403 }
        )
      }
    }

    // Sécurité : un indépendant ne peut importer que sous son propre uid ET avec un plan payant actif
    if (callerRole === 'independent') {
      if (managerId !== callerUid) {
        return NextResponse.json(
          { message: 'Accès refusé. Vous ne pouvez importer que pour votre propre compte.' },
          { status: 403 }
        )
      }
      const plan = callerData?.plan ?? 'free'
      const isExpired = callerData?.subscriptionExpired === true
      if (plan === 'free' || isExpired) {
        return NextResponse.json(
          { message: 'L’import de prospects est réservé aux comptes avec un plan payant actif.' },
          { status: 403 }
        )
      }
    }

    // Sécurité : un manager ne peut importer que sous son propre uid et si son compte n'est pas expiré
    if (callerRole === 'manager') {
      if (!hasActivePaidManagerAccess(callerData)) {
        return NextResponse.json(
          { message: 'Un abonnement Manager actif et vérifié est requis pour importer.' },
          { status: 403 }
        )
      }
      if (managerId !== callerUid) {
        return NextResponse.json(
          { message: 'Accès refusé. Vous ne pouvez importer que pour votre propre compte.' },
          { status: 403 }
        )
      }
    }

    if (prospects.length > 3000) {
      return NextResponse.json({ message: 'Maximum 3000 prospects par import' }, { status: 400 })
    }

    const now = new Date()
    const targetCountry = ((callerData?.country as string) || 'CM').toUpperCase()
    const isIndependent = callerRole === 'independent'

    // ── Détection et écriture directe sur Supabase private_prospects (Délestage quotas) ──
    let useSupabase = false
    try {
      const { isPrivateProspectsTableAvailable } = await import('@/lib/supabase-private-prospects')
      useSupabase = await isPrivateProspectsTableAvailable()
    } catch {
      useSupabase = false
    }

    if (useSupabase) {
      const { bulkInsertPrivateProspects } = await import('@/lib/supabase-private-prospects')

      const supabaseRows = prospects.map((p, idx) => {
        const id = `imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 8)}`
        return {
          id,
          org_code: callerData?.orgCode ?? null,
          user_id: callerUid,
          manager_uid: managerId,
          assigned_to: p.assignedTo ?? null,
          assigned_member_name: null,
          company_name: (p.name ?? '').trim() || '—',
          country_code: targetCountry,
          sector: (p.sector ?? '').trim() || null,
          city: (p.city ?? '').trim() || null,
          quarter: null,
          region: null,
          phone: (p.phone ?? '').trim() || null,
          email: (p.email ?? '').trim() || null,
          notes: (p.notes ?? '').trim() || null,
          status: 'new',
          transfer_deadline: null,
          assignment_deadline: null,
          transferred_to_manager_uid: null,
          transferred_from_senior_uid: null,
          pipeline_entry_id: null
        }
      })

      await bulkInsertPrivateProspects(supabaseRows)

      // Pour un indépendant, insérer aussi dans son pipeline de prospection direct
      if (isIndependent) {
        let currentBatch = adminDb.batch()
        let batchOps = 0
        const pipeColRef = adminDb.collection('pipeline')
        for (let i = 0; i < prospects.length; i++) {
          const p = prospects[i]!
          const sbRow = supabaseRows[i]!
          const pipeRef = pipeColRef.doc()
          currentBatch.set(pipeRef, {
            userId: callerUid,
            managerUid: null,
            orgCode: null,
            assignedTo: null,
            memberName: callerData?.displayName || callerData?.name || null,
            companyName: (p.name ?? '').trim() || '—',
            companyPhone: (p.phone ?? '').trim() || null,
            companyEmail: (p.email ?? '').trim() || null,
            companyCity: (p.city ?? '').trim() || null,
            companySector: (p.sector ?? '').trim() || null,
            notes: (p.notes ?? '').trim() || null,
            status: 'prospection',
            source: 'import',
            originSource: 'import',
            sourceProspectId: sbRow.id,
            country: targetCountry,
            companyCountry: targetCountry,
            createdAt: now,
            updatedAt: now
          })
          batchOps++
          if (batchOps >= 490) {
            await currentBatch.commit()
            currentBatch = adminDb.batch()
            batchOps = 0
          }
        }
        if (batchOps > 0) {
          await currentBatch.commit()
        }
      }

      // Heartbeat temps réel de l'organisation : 1 seule écriture Firestore au lieu de 3000
      const orgCode = callerData?.orgCode as string | undefined
      if (orgCode) {
        try {
          await adminDb.collection('organisations').doc(orgCode).update({
            lastPipelineUpdate: now.toISOString(),
            lastImportsUpdate: now.toISOString()
          })
        } catch (orgErr) {
          console.warn('[imports POST] org heartbeat update failed:', orgErr)
        }
      }

      return NextResponse.json({ success: true, count: prospects.length, backend: 'supabase' })
    }

    // Écriture en multi-batch Firestore (fallback si Supabase private_prospects non déployé)
    let importedCount = 0
    let currentBatch = adminDb.batch()
    let batchOps = 0
    const colRef = adminDb.collection('manager_prospects')
    const pipeColRef = isIndependent ? adminDb.collection('pipeline') : null

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
        orgCode: callerData?.orgCode ?? null,
        name: (p.name ?? '').trim(),
        phone: (p.phone ?? '').trim(),
        email: (p.email ?? '').trim(),
        city: (p.city ?? '').trim(),
        sector: (p.sector ?? '').trim(),
        notes: (p.notes ?? '').trim(),
        assignedTo: p.assignedTo ?? null,
        importedBy: callerUid, // traçabilité : qui a fait l'import
        importedByRole: callerRole, // traçabilité : quel rôle
        status: 'new',
        createdAt: now,
        updatedAt: now
      })
      batchOps++
      importedCount++

      // Pour un indépendant, insérer aussi directement dans son pipeline
      if (isIndependent && pipeColRef) {
        const pipeRef = pipeColRef.doc()
        currentBatch.set(pipeRef, {
          userId: callerUid,
          managerUid: null,
          orgCode: null,
          assignedTo: null,
          memberName: callerData?.displayName || callerData?.name || null,
          companyName: (p.name ?? '').trim() || '—',
          companyPhone: (p.phone ?? '').trim() || null,
          companyEmail: (p.email ?? '').trim() || null,
          companyCity: (p.city ?? '').trim() || null,
          companySector: (p.sector ?? '').trim() || null,
          notes: (p.notes ?? '').trim() || null,
          status: 'prospection',
          source: 'import',
          originSource: 'import',
          sourceProspectId: ref.id,
          country: (callerData?.country || 'CM').toUpperCase(),
          companyCountry: (callerData?.country || 'CM').toUpperCase(),
          createdAt: now,
          updatedAt: now
        })
        batchOps++
      }

      if (batchOps >= 490) await flush()
    }
    await flush()

    return NextResponse.json({ success: true, count: importedCount, backend: 'firestore' })
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
    let managerOrgCode: string | undefined
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
      const managerDoc = await adminDb.collection('users').doc(managerUid).get()
      const mData = managerDoc.data()
      managerName = mData?.name ?? mData?.email ?? ''
      managerOrgCode = mData?.orgCode
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ message: 'Corps invalide' }, { status: 400 })

    const { prospectId, assignedTo, managerId, deadline } = body as {
      prospectId?: string
      assignedTo?: string | null
      managerId?: string
      deadline?: string | null
    }

    if (!prospectId || !managerId) {
      return NextResponse.json({ message: 'prospectId et managerId requis' }, { status: 400 })
    }

    // Sécurité : seul le manager propriétaire peut assigner
    if (managerUid !== managerId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    // ── Charger le prospect importé ───────────────────────────────────────
    let prospectData: any = null
    let isSupabaseProspect = false
    const prospectRef = adminDb.collection('manager_prospects').doc(prospectId)
    const prospectSnap = await prospectRef.get()

    if (prospectSnap.exists) {
      prospectData = prospectSnap.data()
    } else {
      try {
        const { getPrivateProspects } = await import('@/lib/supabase-private-prospects')
        const sbRes = await getPrivateProspects({
          id: prospectId,
          orgCode: managerOrgCode,
          managerUid,
          limit: 1
        })
        const found = sbRes.prospects[0]
        if (found) {
          prospectData = {
            name: found.company_name,
            companyName: found.company_name,
            managerId: found.manager_uid,
            orgCode: found.org_code,
            assignedTo: found.assigned_to,
            phone: found.phone,
            email: found.email,
            city: found.city,
            sector: found.sector,
            transferDeadline: found.transfer_deadline,
            assignmentDeadline: found.assignment_deadline
          }
          isSupabaseProspect = true
        }
      } catch (sbErr) {
        console.warn('[imports PATCH] Supabase lookup error:', sbErr)
      }
    }

    if (!prospectData || prospectData.managerId !== managerId) {
      return NextResponse.json({ message: 'Prospect non trouvé ou accès refusé' }, { status: 403 })
    }

    const previousAssignedTo: string | null = prospectData.assignedTo ?? null
    const companyName: string = prospectData.name || prospectData.companyName || prospectId

    // ── Cas 1 : DÉSASSIGNATION (assignedTo = null / vide) ─────────────────
    if (!assignedTo) {
      // Mettre à jour le prospect importé
      if (isSupabaseProspect) {
        try {
          const { updatePrivateProspect } = await import('@/lib/supabase-private-prospects')
          await updatePrivateProspect(
            prospectId,
            { assigned_to: null, assigned_member_name: null },
            { orgCode: managerOrgCode, userId: managerUid }
          )
        } catch (sbErr) {
          console.warn('[imports PATCH] Supabase unassign error:', sbErr)
        }
      } else {
        await prospectRef.update({ assignedTo: null, updatedAt: new Date() })
      }

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

      // Sync heartbeat organisation
      const orgCode = (managerOrgCode || prospectData.orgCode) as string | undefined
      if (orgCode) {
        try {
          await adminDb.collection('organisations').doc(orgCode).update({
            lastPipelineUpdate: new Date().toISOString(),
            lastImportsUpdate: new Date().toISOString()
          })
        } catch (orgErr) {
          console.warn('[imports PATCH] unassigned lastImportsUpdate write failed:', orgErr)
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
          const ad = accessDoc.data() || {}
          memberName = `${ad.firstname ?? ''} ${ad.lastname ?? ''}`.trim()
        }
      } catch {
        /* ignore */
      }
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

    // Préserver l'échéance de transfert fixée par le Senior Manager
    const currentTransferDeadline =
      (prospectData.transferDeadline as string) ||
      (prospectData.transferredToManagerUid ? (prospectData.assignmentDeadline as string) : null)

    const effectiveDeadline =
      deadline !== undefined ? deadline : (prospectData.assignmentDeadline || null)

    let pipelineEntryId = ''

    if (existingTa.empty) {
      // ── Créer l'entrée pipeline pour le membre ────────────────────────
      const pipelineRef = adminDb.collection('pipeline').doc()
      pipelineEntryId = pipelineRef.id

      await pipelineRef.set({
        userId: assignedTo, // le membre voit dans son pipeline
        assignedTo: assignedTo,
        memberName,
        memberEmail,
        memberAccessId: memberAccessId ? memberAccessId.toLowerCase() : null,
        managerUid, // le manager voit via /api/pipeline/manager
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
        transferDeadline: currentTransferDeadline || null, // Échéance fixée par le SM
        assignmentDeadline: effectiveDeadline, // Échéance fixée par le TM pour le commercial
        enteredAt: new Date().toISOString(),
        assignedAt: new Date().toISOString(),
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
        pipelineItemId: prospectId, // référence au prospect importé
        pipelineEntryId, // nouvelle entrée pipeline du membre
        companyName,
        transferDeadline: currentTransferDeadline || null,
        assignmentDeadline: effectiveDeadline,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    } else {
      pipelineEntryId = existingTa.docs[0]!.data().pipelineEntryId ?? ''
      if (pipelineEntryId && deadline !== undefined) {
        try {
          await adminDb.collection('pipeline').doc(pipelineEntryId).update({
            assignmentDeadline: effectiveDeadline,
            updatedAt: FieldValue.serverTimestamp()
          })
          await existingTa.docs[0]!.ref.update({
            assignmentDeadline: effectiveDeadline,
            updatedAt: FieldValue.serverTimestamp()
          })
        } catch {
          /* ignore */
        }
      }
    }

    // ── Mettre à jour le prospect importé ─────────────────────────────────
    const prospectUpdateData: Record<string, any> = {
      assignedTo,
      assignedMemberName: memberName,
      pipelineEntryId,
      assignmentDeadline: effectiveDeadline, // Échéance commerciale fixée par le TM
      updatedAt: new Date()
    }
    // Si transferDeadline n'avait pas encore été stocké distinctement, le préserver
    if (currentTransferDeadline && !prospectData.transferDeadline) {
      prospectUpdateData.transferDeadline = currentTransferDeadline
    }

    if (isSupabaseProspect) {
      try {
        const { updatePrivateProspect } = await import('@/lib/supabase-private-prospects')
        await updatePrivateProspect(
          prospectId,
          {
            assigned_to: assignedTo,
            assigned_member_name: memberName,
            assignment_deadline: effectiveDeadline,
            transfer_deadline: currentTransferDeadline || undefined,
            pipeline_entry_id: pipelineEntryId
          },
          { orgCode: managerOrgCode, managerUid, userId: managerUid }
        )
      } catch (sbErr) {
        console.warn('[imports PATCH] Supabase assign error:', sbErr)
      }
    } else {
      await prospectRef.update(prospectUpdateData)
    }

    // Déclenchement de la synchronisation temps réel pour l'organisation
    const orgCode = (managerOrgCode || prospectData.orgCode) as string | undefined
    if (orgCode) {
      try {
        await adminDb.collection('organisations').doc(orgCode).update({
          lastPipelineUpdate: new Date().toISOString(),
          lastImportsUpdate: new Date().toISOString()
        })
      } catch (orgErr) {
        console.warn('[imports PATCH] lastImportsUpdate write failed:', orgErr)
      }
    }

    // Notification In-App et Email automatique pour le commercial assigné
    try {
      const { createUserNotification } = await import('@/lib/user-notifications')
      const deadlineText = effectiveDeadline
        ? ` avec une échéance fixée au ${new Date(effectiveDeadline).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
          })}`
        : ''

      await createUserNotification({
        userId: assignedTo,
        type: 'prospect_assignment',
        title: 'Nouveau prospect assigné',
        message: `Votre manager (${managerName}) vous a assigné "${companyName}"${deadlineText}. Retrouvez-le dans votre Sales Pipeline dans la colonne Prospection.`,
        link: '/pipeline',
        metadata: {
          senderUid: managerUid,
          senderName: managerName,
          deadline: effectiveDeadline,
          companyName
        }
      })

      if (memberEmail) {
        const { sendProspectAssignmentEmail } = await import('@/lib/notification-emails')
        await sendProspectAssignmentEmail({
          to: memberEmail,
          recipientName: memberName,
          managerName,
          companyName,
          deadline: effectiveDeadline,
          details: {
            sector: (prospectData.sector || prospectData.companySector || null) as string | null,
            city: (prospectData.city || prospectData.companyCity || null) as string | null,
            phone: (prospectData.phone || prospectData.companyPhone || null) as string | null,
            email: (prospectData.email || prospectData.companyEmail || null) as string | null
          }
        })
      }
    } catch (notifErr) {
      console.warn('[imports PATCH] Erreur envoi notification commercial:', notifErr)
    }

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

    if (!['manager', 'support_agent', 'admin', 'independent'].includes(callerRole ?? '')) {
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
    if ((callerRole === 'manager' || callerRole === 'independent') && managerId !== callerUid) {
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
      if (snap.exists) {
        const data = snap.data()
        const isOwner =
          data?.managerId === managerId ||
          data?.importedBy === callerUid ||
          data?.transferredFromSeniorUid === callerUid
        if (!isOwner && callerRole !== 'admin') {
          return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
        }
        await ref.delete()
      }

      // Supprimer aussi de Supabase si présent
      try {
        const { deletePrivateProspect } = await import('@/lib/supabase-private-prospects')
        await deletePrivateProspect(prospectId, {
          orgCode: callerData?.orgCode || null,
          userId: callerUid
        })
      } catch {
        // Ignorer si n'existe pas dans Supabase
      }

      return NextResponse.json({ success: true, count: 1 })
    }

    return NextResponse.json({ message: 'Action de suppression non spécifiée' }, { status: 400 })
  } catch (error) {
    console.error('[imports DELETE] Error deleting prospects:', error)
    const msg = error instanceof Error ? error.message : 'Erreur serveur inconnue'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
