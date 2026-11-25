// apps/web/src/server/services/pipeline-org.service.ts
// Service métier d'agrégation du pipeline consolidé pour le Senior Manager.
// Protège l'invariant hiérarchique à 4 niveaux et respecte la limite de 30 éléments de Firestore 'in'.

export interface OrgPipelineQueryParams {
  orgCode: string
  callerUid: string
  callerOrgRole?: 'senior_manager' | 'team_manager' | 'executive' | null
  callerSegment?: string | null
  filterManagerUid?: string | null
  filterStatus?: string | null
  limit?: number
  period?: string | null
}

import {
  normalizePipelineStatus,
  type CanonicalPipelineStatus
} from '@/lib/pipeline-metrics'
import { isPendingMigrationDeal } from '@/lib/monthly-cycle'
import { COUNTRY_CURRENCIES, type CountryCode } from '@sales-companion/shared'

export interface PipelineStatusBucket {
  prospection: number
  negociation: number
  conclue: number
  perdue?: number
  other: number
  total: number
}

export interface ConsolidatedPipelineResult {
  items: Record<string, unknown>[]
  managers: { uid: string; name: string; orgRole: string; segment?: string | null; email?: string; stats?: any }[]
  counts: PipelineStatusBucket
  values: PipelineStatusBucket
  hasMore: boolean
  totalFetched: number
  orgCode: string
  availableSegments?: string[]
  totalSalespeopleCount?: number
  totalSupervisorsCount?: number
  currency?: string
}

export async function fetchOrgConsolidatedPipeline(
  params: OrgPipelineQueryParams
): Promise<ConsolidatedPipelineResult> {
  const { adminDb } = await import('@/lib/firebase-admin')
  const { runOpportunisticAutoArchive } = await import('@/server/services/monthly-cycle-archive.service')
  await runOpportunisticAutoArchive(adminDb)

  const { orgCode, callerUid, callerOrgRole, callerSegment, filterManagerUid, filterStatus, limit = 500, period } = params

  const maxLimit = Math.min(Math.max(limit || 500, 1), 2000)

  // Résolution des bornes de la période mensuelle pour le calcul exact des affaires conclues
  let periodBounds: { start: Date; end: Date } | null = null
  if (period) {
    const parts = period.split('-').map(Number)
    if (parts[0] && parts[1]) {
      periodBounds = {
        start: new Date(parts[0], parts[1] - 1, 1, 0, 0, 0, 0),
        end: new Date(parts[0], parts[1], 0, 23, 59, 59, 999)
      }
    }
  }

  const isConcludedInPeriod = (rawDate: unknown): boolean => {
    if (!periodBounds) return true
    if (!rawDate) return false
    const d = new Date(rawDate as string)
    return !isNaN(d.getTime()) && d >= periodBounds.start && d <= periodBounds.end
  }

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
  const managersMap: Record<string, { name: string; orgRole: string; segment?: string | null; seniorManagerUid?: string | null }> = {}
  const managersList: { uid: string; name: string; orgRole: string; segment?: string | null; seniorManagerUid?: string | null }[] = []

  filteredManagersDocs.forEach((d) => {
    const data = d.data()
    const entry = {
      uid: d.id,
      name: data.displayName || data.name || data.email || d.id,
      orgRole: data.orgRole || 'team_manager',
      segment: data.segment || null,
      seniorManagerUid: data.seniorManagerUid || null
    }
    managersMap[d.id] = entry
    managersList.push(entry)
  })

  if (orgManagerUids.length === 0) {
    return {
      items: [],
      managers: [],
      counts: { prospection: 0, negociation: 0, conclue: 0, other: 0, total: 0 },
      values: { prospection: 0, negociation: 0, conclue: 0, other: 0, total: 0 },
      hasMore: false,
      totalFetched: 0,
      orgCode
    }
  }

  // 3. Isolation et ciblage des managers
  // - Pour un Coordinateur (non-Exécutif) : ÉTANCHÉITÉ STRICTE sur son propre UID et ses Superviseurs directs
  //   (seniorManagerUid === callerUid). Il ne voit jamais les données d'un autre Coordinateur, même sur le même segment.
  // - Pour un Manager Exécutif : agrégation consolidée par segment (tous Coordinateurs et Superviseurs du segment).
  let targetManagerUids = orgManagerUids
  const isCallerExecutive = callerOrgRole === 'executive'
  const matchesSegment = (seg?: string | null) => {
    if (!seg || !callerSegment) return false
    const s = seg.trim().toLowerCase()
    const c = callerSegment.trim().toLowerCase()
    return s === c || s.startsWith(c + ' (') || s.startsWith(c + ' –')
  }

  if (!isCallerExecutive) {
    // Si le Coordinateur observe un segment précis (titulaire ou intérimaire)
    const isObservingInterim = callerSegment && (!matchesSegment(managersMap[callerUid]?.segment))
    if (isObservingInterim) {
      // Intérim : cibler les Superviseurs rattachés à ce segment d'intérim
      const interimScopeUids = filteredManagersDocs
        .filter((d) => {
          const dData = d.data()
          return (
            d.id === callerUid ||
            dData.seniorManagerUid === callerUid ||
            matchesSegment(dData.segment) ||
            matchesSegment(dData.displaySegment)
          )
        })
        .map((d) => d.id)
      targetManagerUids = interimScopeUids.length > 0 ? interimScopeUids : [callerUid]
    } else {
      // Titulaire : ses Superviseurs directs et lui-même
      const ownScopeUids = filteredManagersDocs
        .filter((d) => d.id === callerUid || d.data().seniorManagerUid === callerUid)
        .map((d) => d.id)
      targetManagerUids = ownScopeUids.length > 0 ? ownScopeUids : [callerUid]
    }
  } else if (callerSegment && !filterManagerUid) {
    const isDirectionSegment =
      callerSegment.toLowerCase() === 'direction' ||
      callerSegment.toLowerCase() === 'direction générale' ||
      callerSegment.toUpperCase() === 'ALL'
    if (!isDirectionSegment) {
      const segmentSmDocs = filteredManagersDocs.filter(
        (d) =>
          (d.data().orgRole || 'team_manager') === 'senior_manager' &&
          (matchesSegment(d.data().segment) || matchesSegment(d.data().displaySegment))
      )
      const segmentSmUids = new Set(segmentSmDocs.map((d) => d.id))
      const relevantUids = filteredManagersDocs
        .filter(
          (d) =>
            segmentSmUids.has(d.id) ||
            (d.data().seniorManagerUid && segmentSmUids.has(d.data().seniorManagerUid)) ||
            matchesSegment(d.data().segment) ||
            matchesSegment(d.data().displaySegment)
        )
        .map((d) => d.id)
      targetManagerUids = relevantUids
    }
  }

  // Si un filtre manager précis est demandé, vérifier qu'il appartient bien au périmètre autorisé
  if (filterManagerUid) {
    const allowedSet = new Set(targetManagerUids)
    const targetMgr = managersMap[filterManagerUid]
    if (!isCallerExecutive && !allowedSet.has(filterManagerUid)) {
      targetManagerUids = []
    } else if (targetMgr && targetMgr.orgRole === 'senior_manager') {
      const subordinateTmUids = filteredManagersDocs
        .filter((d) => d.id === filterManagerUid || d.data().seniorManagerUid === filterManagerUid)
        .map((d) => d.id)
      targetManagerUids = subordinateTmUids.length > 0 ? subordinateTmUids : [filterManagerUid]
    } else if (orgManagerUids.includes(filterManagerUid)) {
      targetManagerUids = [filterManagerUid]
    } else {
      targetManagerUids = []
    }
  }

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
        const isPending = (data.pendingMigration === true) || isPendingMigrationDeal(data)
        allItems.push({
          id: d.id,
          ...data,
          pendingMigration: isPending,
          orgCode: data.orgCode || orgCode,
          status: normalizePipelineStatus(data.status),
          managerName: mgr?.name ?? (data.managerName as string) ?? '',
          managerOrgRole: mgr?.orgRole ?? 'team_manager',
          seniorManagerUid: mgr?.seniorManagerUid ?? (data.seniorManagerUid as string) ?? null,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || null,
          updatedAt: data.updatedAt?.toDate
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt || null,
          concludedAt: data.concludedAt?.toDate
            ? data.concludedAt.toDate().toISOString()
            : typeof data.concludedAt === 'string'
              ? data.concludedAt
              : null
        })
      }
    })
  }

  // 5. Calcul des totaux par statut + sommes des montants par statut (values)
  // RÈGLE §7A : total = prospection + négociation + conclues filtrées par période
  // Les conclues hors-période (encore en Firestore pendant J+3) ne comptent pas dans le total
  const counts: PipelineStatusBucket = { prospection: 0, negociation: 0, conclue: 0, perdue: 0, other: 0, total: 0 }
  const values: PipelineStatusBucket = { prospection: 0, negociation: 0, conclue: 0, perdue: 0, other: 0, total: 0 }
  allItems.forEach((it) => {
    const st = (it.status as CanonicalPipelineStatus) || 'other'
    const amt = typeof it.amount === 'number' ? it.amount : Number(it.amount) || 0
    if (st === 'prospection') {
      counts.prospection++
      values.prospection += amt
    } else if (st === 'negociation') {
      counts.negociation++
      values.negociation += amt
    } else if (st === 'conclue') {
      if (isConcludedInPeriod(it.concludedAt ?? it.updatedAt)) {
        counts.conclue++
        values.conclue += amt
      }
      // Les conclues hors-période sont exclues du total (elles sont en attente de migration J+3)
    } else if (st === 'perdue') {
      counts.perdue = (counts.perdue || 0) + 1
      values.perdue = (values.perdue || 0) + amt
    } else {
      counts.other++
      values.other += amt
    }
  })
  // Recalcul du total : somme des statuts actifs + conclues filtrées par période (+ other)
  counts.total = counts.prospection + counts.negociation + counts.conclue + counts.other
  values.total = values.prospection + values.negociation + values.conclue + values.other

  // Tri plus récent en premier
  allItems.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
    return tb - ta
  })

  // Liste des Team Managers opérationnels pour le décompte des commerciaux actifs
  const teamManagersDocs = filteredManagersDocs.filter(
    (d) => (d.data().orgRole || 'team_manager') === 'team_manager'
  )
  const teamManagerUids = teamManagersDocs.map((d) => d.id)

  // Source de vérité : compter les commerciaux actifs sous contrat (team_accesses) pour chaque Team Manager
  const activeSalespeopleByManager: Record<string, number> = {}
  for (const uid of teamManagerUids) {
    activeSalespeopleByManager[uid] = 0
  }

  for (let i = 0; i < teamManagerUids.length; i += CHUNK_SIZE) {
    const chunk = teamManagerUids.slice(i, i + CHUNK_SIZE)
    const accessSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', 'in', chunk)
      .get()

    accessSnap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.role === 'support_agent' || data.status === 'promoted') return
      const mUid = data.managerUid
      if (mUid && activeSalespeopleByManager[mUid] != null) {
        activeSalespeopleByManager[mUid]++
      }
    })
  }

  let totalSalespeopleCount = 0
  for (const count of Object.values(activeSalespeopleByManager)) {
    totalSalespeopleCount += count
  }

  // Verrouillage de la devise officielle de l'organisation
  let orgCurrency = 'XAF'
  try {
    const orgDocSnap = await adminDb.collection('organisations').doc(orgCode).get()
    if (orgDocSnap.exists) {
      const orgData = orgDocSnap.data()
      const orgCountry = ((orgData?.country as string) || 'CM').toUpperCase() as CountryCode
      orgCurrency = (orgData?.currency as string) || COUNTRY_CURRENCIES[orgCountry] || 'XAF'
    }
  } catch (err) {
    console.warn('[pipeline-org.service] Impossible de lire la devise org:', err)
  }

  // Liste des managers retournés pour la navigation et le filtrage :
  // - Pour un Executive : afficher UNIQUEMENT les Coordinateurs (Senior Managers, isSenior: true).
  //   L'Executive ne filtre pas les Superviseurs (Team Managers), il n'a aucun lien direct avec eux.
  //   L'Executive lui-même (et tout profil executive) ne figure JAMAIS dans cette liste.
  //   S'il est rattaché à un segment, seuls les Coordinateurs de son segment sont retournés.
  // - Pour un Coordinateur (Senior Manager) : afficher uniquement les Superviseurs (Team Managers) de son segment.
  const relevantManagersDocs = filteredManagersDocs.filter((d) => {
    const mRole = d.data().orgRole || 'team_manager'
    // RÈGLE ABSOLUE : Un Executive ne figure JAMAIS dans la liste des managers opérationnels
    if (mRole === 'executive' || d.id === callerUid) return false
    if (isCallerExecutive) {
      if (mRole !== 'senior_manager') return false
      const isDirectionSegment =
        callerSegment?.toLowerCase() === 'direction' ||
        callerSegment?.toLowerCase() === 'direction générale' ||
        callerSegment?.toUpperCase() === 'ALL'
      if (callerSegment && !isDirectionSegment) {
        const seg = d.data().segment
        const disp = d.data().displaySegment
        const matches = matchesSegment(seg) || matchesSegment(disp)
        if (!matches) return false
      }
      return true
    }
    return mRole !== 'senior_manager' && d.data().seniorManagerUid === callerUid
  })

  const managersWithStats = relevantManagersDocs.map((d) => {
    const data = d.data()
    const mRole = data.orgRole || 'team_manager'
    const isSm = mRole === 'senior_manager'

    // Pour un Senior Manager, son pipeline regroupe ses Team Managers subordonnés
    const managerItems = isSm
      ? allItems.filter((i) => {
        const itemMgr = managersMap[i.managerUid as string]
        return i.managerUid === d.id || (itemMgr && itemMgr.seniorManagerUid === d.id)
      })
      : allItems.filter((i) => i.managerUid === d.id)

    const zone = data.zone || null
    const displaySegment = data.displaySegment || (zone && data.segment ? `${data.segment} (${zone})` : (data.segment || null))

    return {
      uid: d.id,
      name: data.displayName || data.name || data.email || d.id,
      email: data.email || '',
      orgRole: mRole,
      segment: data.segment || null,
      zone: zone,
      displaySegment: displaySegment,
      isSenior: isSm,
      isCurrent: false,
      seniorManagerUid: data.seniorManagerUid || null,
      stats: {
        prospection: managerItems.filter((i) => i.status === 'prospection').length,
        negociation: managerItems.filter((i) => i.status === 'negociation').length,
        conclue: managerItems.filter(
          (i) => i.status === 'conclue' && isConcludedInPeriod(i.concludedAt ?? i.updatedAt)
        ).length,
        other: managerItems.filter((i) => i.status === 'other').length,
        get total() {
          return (
            managerItems.filter((i) => i.status === 'prospection').length +
            managerItems.filter((i) => i.status === 'negociation').length +
            managerItems.filter(
              (i) => i.status === 'conclue' && isConcludedInPeriod(i.concludedAt ?? i.updatedAt)
            ).length +
            managerItems.filter((i) => i.status === 'other').length
          )
        },
        salespeopleCount: isSm
          ? filteredManagersDocs
            .filter((tm) => tm.data().seniorManagerUid === d.id)
            .reduce((sum, tm) => sum + (activeSalespeopleByManager[tm.id] ?? 0), 0)
          : (activeSalespeopleByManager[d.id] ?? 0)
      }
    }
  })

  const allSegmentsSet = new Set<string>()
  filteredManagersDocs.forEach((d) => {
    const s = d.data().segment
    if (s && typeof s === 'string' && s.trim()) {
      allSegmentsSet.add(s.trim())
    }
  })
  const availableSegments = Array.from(allSegmentsSet).sort((a, b) => a.localeCompare(b, 'fr'))

  return {
    items: allItems,
    managers: managersWithStats,
    counts,
    values,
    hasMore,
    totalFetched: allItems.length,
    orgCode,
    availableSegments,
    totalSalespeopleCount,
    totalSupervisorsCount: teamManagersDocs.length,
    currency: orgCurrency
  }
}
