import { describe, it, expect } from 'vitest'
import {
  matchesOrgSegment,
  resolveCallerSegmentAccess,
  resolveScopedOrgManagers,
  type OrgManagerScopeRecord
} from '../org-scope'

const SAMPLE_ORG_MANAGERS: OrgManagerScopeRecord[] = [
  {
    uid: 'exec-littoral-1',
    name: 'Exec Littoral 1',
    email: 'exec1@org.test',
    orgRole: 'executive',
    segment: 'SOHO (Littoral)'
  },
  {
    uid: 'exec-littoral-2',
    name: 'Exec Littoral 2 (Shared)',
    email: 'exec2@org.test',
    orgRole: 'executive',
    segment: 'SOHO (Littoral)'
  },
  {
    uid: 'exec-centre',
    name: 'Exec Centre',
    email: 'exec3@org.test',
    orgRole: 'executive',
    segment: 'SOHO (Centre)'
  },
  {
    uid: 'sm-littoral',
    name: 'Coord Littoral',
    email: 'smlit@org.test',
    orgRole: 'senior_manager',
    segment: 'SOHO',
    displaySegment: 'SOHO (Littoral)'
  },
  {
    uid: 'tm-littoral-1',
    name: 'TM Littoral 1',
    email: 'tmlit1@org.test',
    orgRole: 'team_manager',
    segment: 'SOHO',
    displaySegment: 'SOHO (Littoral)',
    seniorManagerUid: 'sm-littoral'
  },
  {
    uid: 'sm-centre',
    name: 'Coord Centre',
    email: 'smctr@org.test',
    orgRole: 'senior_manager',
    segment: 'SOHO',
    displaySegment: 'SOHO (Centre)'
  },
  {
    uid: 'tm-centre-1',
    name: 'TM Centre 1',
    email: 'tmctr1@org.test',
    orgRole: 'team_manager',
    segment: 'SOHO',
    displaySegment: 'SOHO (Centre)',
    seniorManagerUid: 'sm-centre'
  },
  {
    uid: 'tm-pme-1',
    name: 'TM PME 1',
    email: 'tmpme1@org.test',
    orgRole: 'team_manager',
    segment: 'PME',
    displaySegment: 'PME',
    seniorManagerUid: null
  }
]

describe('org-scope multi-executive & zone isolation', () => {
  it('distinguishes zones cleanly while supporting Segment vs Segment (Zone)', () => {
    expect(matchesOrgSegment('SOHO (Littoral)', 'SOHO (Littoral)')).toBe(true)
    expect(matchesOrgSegment('SOHO', 'SOHO (Littoral)')).toBe(true)
    expect(matchesOrgSegment('SOHO (Littoral)', 'SOHO')).toBe(true)
    expect(matchesOrgSegment('SOHO (Littoral)', 'SOHO (Centre)')).toBe(false)
    expect(matchesOrgSegment('PME', 'SOHO')).toBe(false)
  })

  it('isolates multiple Executives in the same org and excludes all Executives from operational lists', () => {
    const accessLit1 = resolveCallerSegmentAccess({
      callerOrgRole: 'executive',
      callerSegments: ['SOHO (Littoral)'],
      requestedSegment: null
    })
    expect(accessLit1.ok).toBe(true)
    if (!accessLit1.ok) return

    const scopedLit1 = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'exec-littoral-1',
      callerOrgRole: 'executive',
      targetSegment: accessLit1.targetSegment,
      isDirectionScope: accessLit1.isDirectionScope,
      isObservingInterim: accessLit1.isObservingInterim
    })

    // Aucun Executive dans les listes opérationnelles
    expect(scopedLit1.scopedManagers.some((m) => m.orgRole === 'executive')).toBe(false)
    // Uniquement la zone Littoral (jamais Centre ni PME)
    expect(scopedLit1.effectiveTeamManagerUids).toEqual(['tm-littoral-1'])

    // Deuxième Exécutif partageant exactement la même zone SOHO (Littoral)
    const scopedLit2 = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'exec-littoral-2',
      callerOrgRole: 'executive',
      targetSegment: accessLit1.targetSegment,
      isDirectionScope: accessLit1.isDirectionScope,
      isObservingInterim: accessLit1.isObservingInterim
    })
    expect(scopedLit2.effectiveTeamManagerUids).toEqual(['tm-littoral-1'])
  })

  it('blocks an Executive from requesting an unauthorized segment (403) and blocks out-of-scope managerId', () => {
    const denied = resolveCallerSegmentAccess({
      callerOrgRole: 'executive',
      callerSegments: ['SOHO (Littoral)', 'PME'],
      requestedSegment: 'SOHO (Centre)'
    })
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.status).toBe(403)
    }

    const allowed = resolveCallerSegmentAccess({
      callerOrgRole: 'executive',
      callerSegments: ['SOHO (Littoral)', 'PME'],
      requestedSegment: 'PME'
    })
    expect(allowed.ok).toBe(true)
    if (!allowed.ok) return

    const outOfScopeFilter = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'exec-littoral-1',
      callerOrgRole: 'executive',
      targetSegment: allowed.targetSegment,
      isDirectionScope: allowed.isDirectionScope,
      isObservingInterim: allowed.isObservingInterim,
      filterManagerId: 'tm-centre-1'
    })
    expect(outOfScopeFilter.effectiveTeamManagerUids).toEqual([])
  })

  it('allows Direction (ALL) Executive to see all operational teams across all segments while excluding Executives', () => {
    const dirAccess = resolveCallerSegmentAccess({
      callerOrgRole: 'executive',
      callerSegment: 'ALL',
      requestedSegment: null
    })
    expect(dirAccess.ok).toBe(true)
    if (!dirAccess.ok) return
    expect(dirAccess.isDirectionScope).toBe(true)

    const dirScoped = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'exec-dir',
      callerOrgRole: 'executive',
      targetSegment: dirAccess.targetSegment,
      isDirectionScope: dirAccess.isDirectionScope,
      isObservingInterim: dirAccess.isObservingInterim
    })
    expect(dirScoped.effectiveTeamManagerUids).toEqual(['tm-littoral-1', 'tm-centre-1', 'tm-pme-1'])
    expect(dirScoped.scopedManagers.some((m) => m.orgRole === 'executive')).toBe(false)

    // Filtre par Coordinateur sm-centre → ne garde que tm-centre-1
    const byCoord = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'exec-dir',
      callerOrgRole: 'executive',
      targetSegment: dirAccess.targetSegment,
      isDirectionScope: dirAccess.isDirectionScope,
      isObservingInterim: dirAccess.isObservingInterim,
      filterManagerId: 'sm-centre'
    })
    expect(byCoord.effectiveTeamManagerUids).toEqual(['tm-centre-1'])
  })

  it('keeps Coordinator strictly isolated to own Team Managers unless observing an authorized interim segment', () => {
    const coordAccess = resolveCallerSegmentAccess({
      callerOrgRole: 'senior_manager',
      callerSegment: 'SOHO (Littoral)',
      callerInterimSegments: [{ segment: 'PME' }],
      requestedSegment: null
    })
    expect(coordAccess.ok).toBe(true)
    if (!coordAccess.ok) return
    expect(coordAccess.isObservingInterim).toBe(false)

    const ownScope = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'sm-littoral',
      callerOrgRole: 'senior_manager',
      targetSegment: coordAccess.targetSegment,
      isDirectionScope: coordAccess.isDirectionScope,
      isObservingInterim: coordAccess.isObservingInterim
    })
    expect(ownScope.effectiveTeamManagerUids).toEqual(['tm-littoral-1'])

    const interimAccess = resolveCallerSegmentAccess({
      callerOrgRole: 'senior_manager',
      callerSegment: 'SOHO (Littoral)',
      callerInterimSegments: [{ segment: 'PME' }],
      requestedSegment: 'PME'
    })
    expect(interimAccess.ok).toBe(true)
    if (!interimAccess.ok) return
    expect(interimAccess.isObservingInterim).toBe(true)

    const interimScope = resolveScopedOrgManagers({
      allOrgManagers: SAMPLE_ORG_MANAGERS,
      callerUid: 'sm-littoral',
      callerOrgRole: 'senior_manager',
      targetSegment: interimAccess.targetSegment,
      isDirectionScope: interimAccess.isDirectionScope,
      isObservingInterim: interimAccess.isObservingInterim
    })
    expect(interimScope.effectiveTeamManagerUids).toEqual(['tm-pme-1'])
  })
})
