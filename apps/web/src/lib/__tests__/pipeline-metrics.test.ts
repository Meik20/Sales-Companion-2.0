import { describe, it, expect } from 'vitest'
import {
  normalizePipelineStatus,
  isPipelineActive,
  calculatePipelineStats,
  calculateAttainmentRate,
  calculateRoRate,
  aggregateOrgSegmentTargets
} from '../pipeline-metrics'

describe('pipeline-metrics canonical calculation rules', () => {
  describe('normalizePipelineStatus and isPipelineActive', () => {
    it('normalizes various status labels correctly', () => {
      expect(normalizePipelineStatus('Prospection')).toBe('prospection')
      expect(normalizePipelineStatus('lead')).toBe('prospection')
      expect(normalizePipelineStatus('in_progress')).toBe('negociation')
      expect(normalizePipelineStatus('negotiation')).toBe('negociation')
      expect(normalizePipelineStatus('conclue')).toBe('conclue')
      expect(normalizePipelineStatus('won')).toBe('conclue')
      expect(normalizePipelineStatus('signe')).toBe('conclue')
      expect(normalizePipelineStatus('unknown_status')).toBe('other')
    })

    it('identifies active pipeline items (prospection & negotiation only)', () => {
      expect(isPipelineActive('prospection')).toBe(true)
      expect(isPipelineActive('negociation')).toBe(true)
      expect(isPipelineActive('conclue')).toBe(false)
      expect(isPipelineActive('other')).toBe(false)
    })
  })

  describe('calculatePipelineStats', () => {
    const mockItems = [
      { id: '1', status: 'prospection', amount: 10000 },
      { id: '2', status: 'prospection', amount: 20000 },
      { id: '3', status: 'negociation', amount: 30000 },
      { id: '4', status: 'conclue', amount: 250000 }
    ]

    it('calculates exact active count and active amount (excluding concluded deals)', () => {
      const stats = calculatePipelineStats(mockItems)

      expect(stats.totalCount).toBe(4)
      // Portefeuille Actif = 2 prospection + 1 négociation = 3
      expect(stats.activeCount).toBe(3)
      // Valeur du Pipeline Actif = 10k + 20k + 30k = 60k
      expect(stats.activePipelineAmount).toBe(60000)

      // Détails
      expect(stats.prospectionCount).toBe(2)
      expect(stats.prospectionAmount).toBe(30000)
      expect(stats.negociationCount).toBe(1)
      expect(stats.negociationAmount).toBe(30000)

      // Conclues
      expect(stats.conclueCount).toBe(1)
      expect(stats.concludedAmount).toBe(250000)

      // Taux de conversion : 1 / 4 = 25%
      expect(stats.conversionRate).toBe(25)
    })

    it('handles empty items without errors', () => {
      const stats = calculatePipelineStats([])
      expect(stats.totalCount).toBe(0)
      expect(stats.activeCount).toBe(0)
      expect(stats.activePipelineAmount).toBe(0)
      expect(stats.conversionRate).toBe(0)
    })
  })

  describe('calculateAttainmentRate and calculateRoRate', () => {
    it('calculates attainment rate correctly', () => {
      expect(calculateAttainmentRate(6, 150)).toBe(4) // 4%
      expect(calculateAttainmentRate(250000, 900000)).toBe(28) // 28%
      expect(calculateAttainmentRate(50, null)).toBeNull()
      expect(calculateAttainmentRate(50, 0)).toBeNull()
    })

    it('calculates composite RO rate as the average of volume and value attainment', () => {
      // (4% + 28%) / 2 = 16%
      expect(calculateRoRate(4, 28)).toBe(16)
      // Only volume defined
      expect(calculateRoRate(40, null)).toBe(40)
      // Only value defined
      expect(calculateRoRate(null, 70)).toBe(70)
      // Neither defined: fallback to conversion rate
      expect(calculateRoRate(null, null, 19)).toBe(19)
    })
  })

  describe('aggregateOrgSegmentTargets', () => {
    const managers = [
      { uid: 'sm-1', isSenior: true, orgRole: 'senior_manager' },
      { uid: 'tm-1', isSenior: false, orgRole: 'team_manager' },
      { uid: 'tm-2', isSenior: false, orgRole: 'team_manager' }
    ]

    const targets = [
      // Senior Manager residual target (MUST BE EXCLUDED)
      { managerUid: 'sm-1', targetVolume: 100, targetValue: 500000, period: '2026-10' },
      // Team Manager 1 target
      { managerUid: 'tm-1', targetVolume: 100, targetValue: 600000, period: '2026-10' },
      // Team Manager 2 target
      { managerUid: 'tm-2', targetVolume: 50, targetValue: 300000, period: '2026-10' }
    ]

    it('strictly excludes Senior Manager targets and sums only operational Team Managers', () => {
      const result = aggregateOrgSegmentTargets(managers, targets)

      // Volume = 100 (tm-1) + 50 (tm-2) = 150 (NOT 250)
      expect(result.targetVolume).toBe(150)
      // Valeur = 600k (tm-1) + 300k (tm-2) = 900k (NOT 1.4M)
      expect(result.targetValue).toBe(900000)
      expect(result.period).toBe('2026-10')
      expect(result.teamManagersCount).toBe(2)
    })

    it('returns null for empty or zero targets', () => {
      const result = aggregateOrgSegmentTargets(managers, [])
      expect(result.targetVolume).toBeNull()
      expect(result.targetValue).toBeNull()
    })
  })
})
