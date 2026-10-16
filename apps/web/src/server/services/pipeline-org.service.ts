// apps/web/src/server/services/pipeline-org.service.ts
// Service métier d'agrégation du pipeline consolidé pour le Senior Manager.
// Protège l'invariant hiérarchique à 4 niveaux et respecte la limite de 30 éléments de Firestore 'in'.

export interface OrgPipelineQueryParams {
  orgCode: string
  callerUid: string
  callerSegment?: string | null
  filterManagerUid?: string | null
  filterStatus?: string | null
  limit?: number
}

export interface ConsolidatedPipelineResult {
  items: Record<string, unknown>[]
  managers: { uid: string; name: string; orgRole: string; segment?: string | null; email?: string; stats?: any }[]
  counts: { prospection: number; negociation: number; conclue: number; total: number; [key: string]: number }
  hasMore: boolean
  totalFetched: number
  orgCode: string
}

function normalizeStatus(s: string) {
  const st = (s || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st))
    return 'prospection'
  if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) return 'negociation'
  if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) return 'conclue'
  return 'prospection'
}

export async function fetchOrgConsolidatedPipeline(
  params: OrgPipelineQueryParams
): Promise<ConsolidatedPipelineResult> {
  const { adminDb } = await import('@/lib/firebase-admin')
  const { orgCode, callerUid, callerSegment, filterManagerUid, filterStatus, limit = 500 } = params

  const maxLimit = Math.min(Math.max(limit || 500, 1), 2000)

  // 1. Récupérer tous les managers de l'organisation
  const orgManagersSnap = await adminDb
    .collection('users')
    .where('orgCode', '==', orgCode)
    .where('role', '==', 'manager')
    .get()

  // 2. Le Senior Manager voit TOUS les managers de son orgCode.
  // Le champ `segment` d'un manager est son propre libellé de secteur, pas un critère
  // de visibilité pour le SM. Filtrer par segment ici exclurait les TMs dont le segment
  // diffère de celui du SM après une mise à jour — c'est le bug rapporté.
  // L'appartenance à l'org est garantie par la requête `orgCode == orgCode` ci-dessus.
  const filteredManagersDocs = orgManagersSnap.docs

  const orgManagerUids = filteredManagersDocs.map((d) => d.id)
  const managersMap: Record<string, { name: string; orgRole: string; segment?: string | null }> = {}
  const managersList: { uid: string; name: string; orgRole: string; segment?: string | null }[] = []

  filteredManagersDocs.forEach((d) => {
    const data = d.data()
    const entry = {
      uid: d.id,
      name: data.displayName || data.name || data.email || d.id,
      orgRole: data.orgRole || 'team_manager',
      segment: data.segment || null
    }
    managersMap[d.id] = entry
    managersList.push(entry)
  })

  if (orgManagerUids.length === 0) {
    return {
      items: [],
      managers: [],
      counts: { prospection: 0, negociation: 0, conclue: 0, total: 0 },
      hasMore: false,
      totalFetched: 0,
      orgCode
    }
  }

  // 3. Appliquer le filtre manager si demandé
  const targetManagerUids = filterManagerUid
    ? orgManagerUids.includes(filterManagerUid)
      ? [filterManagerUid]
      : []
    : orgManagerUids

  if (targetManagerUids.length === 0) {
    throw new Error('Manager non trouvé dans cette organisation')
  }

  // 4. Agréger les pipelines par chunks de 30 managers (limite Firestore de l'opérateur 'in')
  const CHUNK_SIZE = 30
  const allItems: Record<string, unknown>[] = []
  const seen = new Set<string>()
  let hasMore = false

  for (let i = 0; i < targetManagerUids.length; i += CHUNK_SIZE) {
    const chunk = targetManagerUids.slice(i, i + CHUNK_SIZE)
    let q = adminDb
      .collection('pipeline')
      .where('managerUid', 'in', chunk) as FirebaseFirestore.Query

    if (filterStatus) {
      const statusVariants =
        filterStatus === 'prospection'
          ? ['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead']
          : filterStatus === 'negociation'
            ? ['negociation', 'negotiation', 'in_progress', 'en_cours']
            : filterStatus === 'conclue'
              ? ['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe']
              : [filterStatus]
      q = q.where('status', 'in', statusVariants)
    }

    const snap = await q.limit(maxLimit).get()
    if (snap.docs.length >= maxLimit) {
      hasMore = true
    }

    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        const data = d.data()
        // Exclure les leads archivés
        if (data.archived === true) return

        // Multi-tenant guard strict : si la fiche a un orgCode explicite, il doit correspondre
        if (data.orgCode && data.orgCode !== orgCode) return
        // Note: ne pas filtrer par segment ici — le segment d'un item reflète celui du TM
        // qui l'a créé, pas celui du SM appelant. Le SM consolide tout le pipeline de l'org.

        seen.add(d.id)
        const mgr = managersMap[data.managerUid as string]
        allItems.push({
          id: d.id,
          ...data,
          orgCode: data.orgCode || orgCode,
          status: normalizeStatus(data.status as string),
          managerName: mgr?.name ?? (data.managerName as string) ?? '',
          managerOrgRole: mgr?.orgRole ?? 'team_manager',
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || null,
          updatedAt: data.updatedAt?.toDate
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt || null
        })
      }
    })
  }

  // 5. Calcul des totaux par statut
  const counts = { prospection: 0, negociation: 0, conclue: 0, total: 0 }
  allItems.forEach((it) => {
    const st = it.status as 'prospection' | 'negociation' | 'conclue'
    if (counts[st] !== undefined) {
      counts[st]++
    }
    counts.total++
  })

  // Tri plus récent en premier
  allItems.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
    return tb - ta
  })

  // Liste des managers avec leurs stats — uniquement les Team Managers (le Senior Manager n'en fait pas partie)
  const teamManagersDocs = filteredManagersDocs.filter(
    (d) => (d.data().orgRole || 'team_manager') !== 'senior_manager'
  )
  const managersWithStats = teamManagersDocs.map((d) => {
    const data = d.data()
    const managerItems = allItems.filter((i) => i.managerUid === d.id)
    return {
      uid: d.id,
      name: data.displayName || data.name || data.email || d.id,
      email: data.email || '',
      orgRole: data.orgRole || 'team_manager',
      isSenior: false,
      isCurrent: d.id === callerUid,
      stats: {
        prospection: managerItems.filter((i) => i.status === 'prospection').length,
        negociation: managerItems.filter((i) => i.status === 'negociation').length,
        conclue: managerItems.filter((i) => i.status === 'conclue').length,
        total: managerItems.length
      }
    }
  })

  return {
    items: allItems,
    managers: managersWithStats,
    counts,
    hasMore,
    totalFetched: allItems.length,
    orgCode
  }
}
