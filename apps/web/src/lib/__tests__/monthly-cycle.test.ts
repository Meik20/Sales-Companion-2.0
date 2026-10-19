import { describe, it, expect, vi } from 'vitest'
import {
  getMonthPeriodInfo,
  getMonthPeriodLabel,
  isEligibleForAutoArchive,
  getCurrentCycleContext
} from '../monthly-cycle'
import { runMonthlyPipelineCycleAutoArchive } from '../../server/services/monthly-cycle-archive.service'

describe('monthly-cycle utility', () => {
  it('correctly calculates month period info and J+3 cutoff date', () => {
    const info = getMonthPeriodInfo(2026, 10, new Date('2026-10-15T12:00:00Z'))
    expect(info.key).toBe('2026-10')
    expect(info.labelFr).toBe('Octobre 2026')
    expect(info.startDate.getDate()).toBe(1)
    expect(info.startDate.getMonth()).toBe(9) // 0-indexed October
    expect(info.endDate.getDate()).toBe(31) // 31 days in October

    // Grace cutoff date is November 3rd at 23:59:59.999
    expect(info.graceCutoffDate.getFullYear()).toBe(2026)
    expect(info.graceCutoffDate.getMonth()).toBe(10) // November
    expect(info.graceCutoffDate.getDate()).toBe(3)
    expect(info.graceCutoffDate.getHours()).toBe(23)
    expect(info.graceCutoffDate.getMinutes()).toBe(59)
    expect(info.isClosed).toBe(false)
  })

  it('determines if deal is eligible for auto-archive according to J+3 rule', () => {
    const dealConcludedDate = new Date('2026-10-12T10:00:00Z')

    // During the month of conclusion: not eligible
    expect(isEligibleForAutoArchive(dealConcludedDate, new Date('2026-10-25T12:00:00Z'))).toBe(false)

    // On November 1st (within J+3 grace period): not eligible
    expect(isEligibleForAutoArchive(dealConcludedDate, new Date('2026-11-01T12:00:00Z'))).toBe(false)

    // On November 3rd at 20:00 (still within grace period): not eligible
    expect(isEligibleForAutoArchive(dealConcludedDate, new Date('2026-11-03T20:00:00Z'))).toBe(false)

    // On November 4th at 00:01 (after J+3 cutoff): ELIGIBLE for auto-archive!
    expect(isEligibleForAutoArchive(dealConcludedDate, new Date('2026-11-04T00:01:00Z'))).toBe(true)

    // On November 10th: ELIGIBLE
    expect(isEligibleForAutoArchive(dealConcludedDate, new Date('2026-11-10T12:00:00Z'))).toBe(true)
  })

  it('correctly sets active period and grace flag in getCurrentCycleContext', () => {
    // When today is November 2nd (within Day 1-3)
    const ctxGrace = getCurrentCycleContext(new Date('2026-11-02T10:00:00Z'))
    expect(ctxGrace.isWithinJ3GracePeriod).toBe(true)
    expect(ctxGrace.defaultPeriodKey).toBe('2026-10') // defaults to M-1 during grace period
    expect(ctxGrace.currentPeriod.key).toBe('2026-11')
    expect(ctxGrace.prevPeriod.key).toBe('2026-10')

    // When today is November 5th (after Day 3)
    const ctxNormal = getCurrentCycleContext(new Date('2026-11-05T10:00:00Z'))
    expect(ctxNormal.isWithinJ3GracePeriod).toBe(false)
    expect(ctxNormal.defaultPeriodKey).toBe('2026-11') // defaults to M
  })

  it('executes auto-archive on eligible concluded docs and leaves others intact', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined)

    const eligibleDoc = {
      id: 'deal-1',
      data: () => ({
        companyName: 'ACME Corp',
        status: 'conclue',
        concludedAt: new Date('2026-09-15T10:00:00Z') // September deal, cutoff was Oct 3rd
      }),
      ref: { delete: mockDelete }
    }

    const notEligibleDoc = {
      id: 'deal-2',
      data: () => ({
        companyName: 'Beta Corp',
        status: 'conclue',
        concludedAt: new Date() // concluded today
      }),
      ref: { delete: vi.fn() }
    }

    const mockAdminDb: any = {
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              docs: [eligibleDoc, notEligibleDoc]
            })
          }))
        })),
        doc: vi.fn(() => ({
          set: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue({ exists: false })
        }))
      }))
    }

    const res = await runMonthlyPipelineCycleAutoArchive(mockAdminDb)
    expect(res.archivedCount).toBe(1)
    expect(mockDelete).toHaveBeenCalledTimes(1)
  })

  it('correctly returns localized month label based on language using getMonthPeriodLabel', () => {
    const period = { labelFr: 'Octobre 2026', labelEn: 'October 2026' }
    expect(getMonthPeriodLabel(period, 'fr')).toBe('Octobre 2026')
    expect(getMonthPeriodLabel(period, 'en')).toBe('October 2026')
    expect(getMonthPeriodLabel(null, 'fr')).toBe('En cours')
    expect(getMonthPeriodLabel(null, 'en')).toBe('Current')
  })
})
