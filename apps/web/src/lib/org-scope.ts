/**
 * org-scope.ts
 * Source de vérité unique pour la résolution de périmètre hiérarchique et de segment/zone :
 * - Supporte plusieurs Responsables Exécutifs dans une même organisation
 *   (zones distinctes, multi-zones, Direction globale ou zones partagées).
 * - Garantit l'exclusion absolue des profils `executive` des listes opérationnelles.
 * - Garantit l'étanchéité stricte des Coordinateurs (titulaire + intérims).
 */

export interface OrgManagerScopeRecord {
  uid: string
  name: string
  email: string
  orgRole: string
  segment?: string | null
  displaySegment?: string | null
  seniorManagerUid?: string | null
}

export interface CallerSegmentAccessInput {
  callerOrgRole: string
  callerSegment?: string | null
  callerSegments?: string[] | null
  callerInterimSegments?: Array<{ segment?: string | null }> | null
  requestedSegment?: string | null
}

export type CallerSegmentAccessResult =
  | {
      ok: true
      targetSegment: string | null
      isDirectionScope: boolean
      isObservingInterim: boolean
    }
  | {
      ok: false
      status: 403
      error: string
    }

const DIRECTION_SEGMENTS = new Set(['direction', 'direction générale', 'all'])

export function isDirectionSegmentName(seg?: string | null): boolean {
  if (!seg || !seg.trim()) return true
  return DIRECTION_SEGMENTS.has(seg.trim().toLowerCase())
}

/**
 * Compare deux libellés de segment en gérant :
 * - le format composé `Segment (Zone)` ou `Segment – Zone`
 * - les sous-zones d'un Superviseur (`SOHO (Littoral 1)` rattaché à `SOHO (Littoral)`)
 * tout en gardant `SOHO (Littoral)` et `SOHO (Centre)` strictement distincts.
 */
export function matchesOrgSegment(candidate?: string | null, target?: string | null): boolean {
  if (!candidate || !target) return false
  const c = candidate.trim().toLowerCase()
  const t = target.trim().toLowerCase()
  if (!c || !t) return false
  if (
    c === t ||
    c.startsWith(`${t} (`) ||
    c.startsWith(`${t} –`) ||
    t.startsWith(`${c} (`) ||
    t.startsWith(`${c} –`)
  ) {
    return true
  }
  const extractParts = (val: string): { base: string; zone: string } | null => {
    const match = val.match(/^(.+?)\s*\(([^)]+)\)$/)
    if (!match) return null
    return { base: match[1]!.trim(), zone: match[2]!.trim() }
  }
  const cParts = extractParts(c)
  const tParts = extractParts(t)
  if (cParts && tParts && cParts.base === tParts.base) {
    if (
      cParts.zone.startsWith(`${tParts.zone} `) ||
      cParts.zone.startsWith(`${tParts.zone}-`) ||
      tParts.zone.startsWith(`${cParts.zone} `) ||
      tParts.zone.startsWith(`${cParts.zone}-`)
    ) {
      return true
    }
  }
  return false
}

/**
 * Résout et contrôle le segment autorisé pour l'appelant (`executive`, `senior_manager`, `team_manager`).
 */
export function resolveCallerSegmentAccess(
  input: CallerSegmentAccessInput
): CallerSegmentAccessResult {
  const {
    callerOrgRole,
    callerSegment,
    callerSegments,
    callerInterimSegments,
    requestedSegment
  } = input

  if (callerOrgRole === 'executive') {
    const allowedSegments =
      Array.isArray(callerSegments) && callerSegments.length > 0
        ? callerSegments.filter((s) => typeof s === 'string' && s.trim().length > 0)
        : callerSegment && !isDirectionSegmentName(callerSegment)
          ? [callerSegment]
          : null // null = Supervision globale (Direction / ALL)

    let targetSegment: string | null = requestedSegment || null
    if (allowedSegments && allowedSegments.length > 0) {
      if (requestedSegment) {
        const isAllowed = allowedSegments.some((seg) =>
          matchesOrgSegment(seg, requestedSegment)
        )
        if (!isAllowed) {
          return {
            ok: false,
            status: 403,
            error: `Accès non autorisé au segment « ${requestedSegment} »`
          }
        }
        targetSegment = requestedSegment
      } else {
        targetSegment = allowedSegments[0]!
      }
    }

    return {
      ok: true,
      targetSegment,
      isDirectionScope: isDirectionSegmentName(targetSegment),
      isObservingInterim: false
    }
  }

  if (callerOrgRole === 'senior_manager') {
    const titularSegment = callerSegment || null
    const interimList = Array.isArray(callerInterimSegments) ? callerInterimSegments : []
    const interimSegNames = interimList
      .map((item) => item?.segment)
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    const allowedSegments = [titularSegment, ...interimSegNames].filter(
      (s): s is string => Boolean(s && s.trim().length > 0)
    )

    let targetSegment = titularSegment
    if (requestedSegment && allowedSegments.length > 0) {
      const isAllowed = allowedSegments.some((seg) =>
        matchesOrgSegment(seg, requestedSegment)
      )
      if (!isAllowed) {
        return {
          ok: false,
          status: 403,
          error: `Accès non autorisé au segment « ${requestedSegment} »`
        }
      }
      targetSegment = requestedSegment
    }

    const isObservingInterim = Boolean(
      targetSegment && titularSegment && !matchesOrgSegment(titularSegment, targetSegment)
    )

    return {
      ok: true,
      targetSegment,
      isDirectionScope: false,
      isObservingInterim
    }
  }

  return {
    ok: true,
    targetSegment: callerSegment || null,
    isDirectionScope: false,
    isObservingInterim: false
  }
}

export interface ScopedOrgManagersResult {
  /** Tous les managers non-executive du périmètre (Coordinateurs + Superviseurs) */
  scopedManagers: OrgManagerScopeRecord[]
  /** Uniquement les Superviseurs opérationnels (Team Managers) dans le périmètre */
  teamManagers: OrgManagerScopeRecord[]
  /** Uniquement les Coordinateurs (Senior Managers) dans le périmètre */
  seniorManagers: OrgManagerScopeRecord[]
  /** Sous-ensemble final des UIDs opérationnels à requêter (après filtre éventuel par managerId) */
  effectiveTeamManagerUids: string[]
  /** Manager ciblé par filterManagerId s'il appartient bien au périmètre */
  selectedFilterManager: OrgManagerScopeRecord | null
}

/**
 * Filtre et isole les managers opérationnels d'une organisation pour l'appelant.
 * Garantit :
 * - Exclusion systématique de tout profil `executive` (y compris s'il y en a plusieurs).
 * - Cloisonnement par zone/segment pour chaque Exécutif.
 * - Étanchéité stricte par `seniorManagerUid` (ou segment d'intérim) pour chaque Coordinateur.
 */
export function resolveScopedOrgManagers(params: {
  allOrgManagers: OrgManagerScopeRecord[]
  callerUid: string
  callerOrgRole: string
  targetSegment: string | null
  isDirectionScope: boolean
  isObservingInterim: boolean
  filterManagerId?: string | null
}): ScopedOrgManagersResult {
  const {
    allOrgManagers,
    callerUid,
    callerOrgRole,
    targetSegment,
    isDirectionScope,
    isObservingInterim,
    filterManagerId
  } = params

  // 1. Exclusion absolue de tous les Exécutifs (même s'il y en a plusieurs dans l'org)
  const operationalCandidates = allOrgManagers.filter(
    (m) => (m.orgRole || 'team_manager') !== 'executive'
  )

  const matchesManagerSegment = (m: OrgManagerScopeRecord) =>
    matchesOrgSegment(m.displaySegment || m.segment, targetSegment)

  let scopedManagers: OrgManagerScopeRecord[] = []

  if (callerOrgRole === 'executive') {
    if (isDirectionScope) {
      scopedManagers = operationalCandidates
    } else {
      const matchingSeniorUids = new Set(
        operationalCandidates
          .filter((m) => m.orgRole === 'senior_manager' && matchesManagerSegment(m))
          .map((m) => m.uid)
      )
      scopedManagers = operationalCandidates.filter(
        (m) =>
          matchesManagerSegment(m) ||
          Boolean(m.seniorManagerUid && matchingSeniorUids.has(m.seniorManagerUid))
      )
    }
  } else if (callerOrgRole === 'senior_manager') {
    if (isObservingInterim) {
      const interimSeniorUids = new Set(
        operationalCandidates
          .filter((m) => m.orgRole === 'senior_manager' && matchesManagerSegment(m))
          .map((m) => m.uid)
      )
      scopedManagers = operationalCandidates.filter(
        (m) =>
          m.uid === callerUid ||
          matchesManagerSegment(m) ||
          Boolean(m.seniorManagerUid && interimSeniorUids.has(m.seniorManagerUid))
      )
    } else {
      scopedManagers = operationalCandidates.filter(
        (m) => m.uid === callerUid || m.seniorManagerUid === callerUid
      )
    }
  } else {
    scopedManagers = operationalCandidates.filter((m) => m.uid === callerUid)
  }

  const seniorManagers = scopedManagers.filter((m) => m.orgRole === 'senior_manager')
  const teamManagers = scopedManagers.filter(
    (m) => m.orgRole !== 'senior_manager' && m.orgRole !== 'executive'
  )

  let effectiveTeamManagerUids = teamManagers.map((m) => m.uid)
  let selectedFilterManager: OrgManagerScopeRecord | null = null

  if (filterManagerId) {
    const found = scopedManagers.find((m) => m.uid === filterManagerId) ?? null
    if (found) {
      selectedFilterManager = found
      if (found.orgRole === 'senior_manager') {
        const underSm = teamManagers
          .filter((tm) => tm.seniorManagerUid === found.uid)
          .map((tm) => tm.uid)
        effectiveTeamManagerUids = underSm
      } else {
        effectiveTeamManagerUids = [found.uid]
      }
    } else {
      // Sécurité : un managerId hors périmètre ne doit jamais exposer de données
      effectiveTeamManagerUids = []
    }
  }

  return {
    scopedManagers,
    teamManagers,
    seniorManagers,
    effectiveTeamManagerUids,
    selectedFilterManager
  }
}
