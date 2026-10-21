import { describe, it, expect, vi } from 'vitest'
import {
  getMonthPeriodInfo,
  getMonthPeriodLabel,
  isEligibleForAutoArchive,
  getCurrentCycleContext,
  getMaxEligibleConcludedDate
} from '../monthly-cycle'
import { archivePipelineDealAtomically } from '../clients-sync'
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

  it('correctly calculates getMaxEligibleConcludedDate based on grace period cutoff', () => {
    // 1. Day <= 3 (e.g. November 2nd): M-1 is still in grace period, eligible deals are M-2 or older (< October 1st)
    const cutoffNov2 = getMaxEligibleConcludedDate(new Date('2026-11-02T10:00:00Z'))
    expect(cutoffNov2.getFullYear()).toBe(2026)
    expect(cutoffNov2.getMonth()).toBe(9) // October (0-indexed 9)
    expect(cutoffNov2.getDate()).toBe(1)

    // 2. Day > 3 (e.g. November 4th): M-1 grace period ended, eligible deals are M-1 or older (< November 1st)
    const cutoffNov4 = getMaxEligibleConcludedDate(new Date('2026-11-04T10:00:00Z'))
    expect(cutoffNov4.getFullYear()).toBe(2026)
    expect(cutoffNov4.getMonth()).toBe(10) // November (0-indexed 10)
    expect(cutoffNov4.getDate()).toBe(1)

    // 3. Edge case: January 2nd (Year transition, day <= 3): eligible deals are M-2 (< December 1st of previous year)
    const cutoffJan2 = getMaxEligibleConcludedDate(new Date('2027-01-02T10:00:00Z'))
    expect(cutoffJan2.getFullYear()).toBe(2026)
    expect(cutoffJan2.getMonth()).toBe(11) // December (0-indexed 11)
    expect(cutoffJan2.getDate()).toBe(1)
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

  it('atomically archives a concluded deal with archivePipelineDealAtomically', async () => {
    const pipelineData = {
      companyName: 'ACME Sarl',
      status: 'conclue',
      concludedAt: new Date('2026-09-15T10:00:00Z'),
      amount: 500000,
      assignedTo: 'user_123'
    }

    const mockTxSet = vi.fn()
    const mockTxDelete = vi.fn()

    const mockAdminDb: any = {
      collection: vi.fn((col: string) => ({
        doc: vi.fn((id: string) => ({ id, col }))
      })),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async (ref: any) => {
            if (ref.col === 'pipeline') {
              return { exists: true, data: () => pipelineData }
            }
            return { exists: false, data: () => null }
          }),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const result = await archivePipelineDealAtomically(mockAdminDb, 'deal_abc')
    expect(result.status).toBe('archived')
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'clients', id: 'client_deal_abc' }),
      expect.objectContaining({ companyName: 'ACME Sarl', status: 'active', amount: 500000 }),
      { merge: true }
    )
    expect(mockTxDelete).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'pipeline', id: 'deal_abc' })
    )
  })

  it('archivePipelineDealAtomically revalidates fresh date and strictly aborts without deleting if concludedAt was changed to recent date (concurrency)', async () => {
    const mockTxDelete = vi.fn()
    const mockTxSet = vi.fn()

    const now = new Date('2026-11-04T12:00:00Z')
    // Le statut est toujours 'conclue', mais un commercial a repoussé la date au mois de novembre (en cours, grâce non échue) !
    const freshDataWithRecentDate = {
      companyName: 'Postponed Deal Corp',
      status: 'conclue',
      concludedAt: new Date('2026-11-04T10:00:00Z') // Conclu aujourd'hui : NON éligible !
    }

    const mockAdminDb: any = {
      collection: vi.fn(() => ({
        doc: vi.fn((id: string) => ({ id }))
      })),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async () => ({
            exists: true,
            data: () => freshDataWithRecentDate
          })),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const result = await archivePipelineDealAtomically(mockAdminDb, 'deal_concurrent_date', now)
    expect(result.status).toBe('skipped_not_eligible')
    expect(mockTxSet).not.toHaveBeenCalled()
    expect(mockTxDelete).not.toHaveBeenCalled()
  })

  it('archivePipelineDealAtomically archives a historical concluded deal missing concludedAt using updatedAt', async () => {
    const mockTxDelete = vi.fn()
    const mockTxSet = vi.fn()

    const now = new Date('2026-11-04T12:00:00Z')
    // Fiche historique : pas de concludedAt, mais updatedAt en septembre 2026
    const historicalDeal = {
      companyName: 'Historical Corp',
      status: 'conclue',
      updatedAt: new Date('2026-09-15T10:00:00Z')
    }

    const mockAdminDb: any = {
      collection: vi.fn((col: string) => ({
        doc: vi.fn((id: string) => ({ id, col }))
      })),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async (ref: any) => {
            if (ref.col === 'pipeline') {
              return { exists: true, data: () => historicalDeal }
            }
            return { exists: false, data: () => null }
          }),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const result = await archivePipelineDealAtomically(mockAdminDb, 'deal_historical_1', now)
    expect(result.status).toBe('archived')
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'clients', id: 'client_deal_historical_1' }),
      expect.objectContaining({
        companyName: 'Historical Corp',
        status: 'active'
      }),
      { merge: true }
    )
    expect(mockTxDelete).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'pipeline', id: 'deal_historical_1' })
    )
  })

  it('archivePipelineDealAtomically aborts without deleting if doc does not exist', async () => {
    const mockTxDelete = vi.fn()
    const mockAdminDb: any = {
      collection: vi.fn(() => ({
        doc: vi.fn((id: string) => ({ id }))
      })),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async () => ({ exists: false })),
          set: vi.fn(),
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const result = await archivePipelineDealAtomically(mockAdminDb, 'non_existent_id')
    expect(result.status).toBe('skipped_not_found')
    expect(mockTxDelete).not.toHaveBeenCalled()
  })

  it('archivePipelineDealAtomically strictly aborts without deleting if status changed concurrently', async () => {
    const mockTxDelete = vi.fn()
    const mockTxSet = vi.fn()

    const mockAdminDb: any = {
      collection: vi.fn(() => ({
        doc: vi.fn((id: string) => ({ id }))
      })),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async () => ({
            exists: true,
            data: () => ({ status: 'negociation', companyName: 'Concurrent Corp' })
          })),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const result = await archivePipelineDealAtomically(mockAdminDb, 'deal_concurrent')
    expect(result.status).toBe('skipped_not_concluded')
    expect(mockTxSet).not.toHaveBeenCalled()
    expect(mockTxDelete).not.toHaveBeenCalled()
  })

  it('executes auto-archive on eligible concluded docs and leaves others intact', async () => {
    const eligibleDoc = {
      id: 'deal-1',
      data: () => ({
        companyName: 'ACME Corp',
        status: 'conclue',
        concludedAt: new Date('2026-09-15T10:00:00Z') // September deal, cutoff was Oct 3rd
      })
    }

    const notEligibleDoc = {
      id: 'deal-2',
      data: () => ({
        companyName: 'Beta Corp',
        status: 'conclue',
        concludedAt: new Date() // concluded today
      })
    }

    const mockTxSet = vi.fn()
    const mockTxDelete = vi.fn()

    const createQueryChain = (docs: any[]) => {
      const chain: any = {
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        startAfter: vi.fn(() => chain),
        get: vi.fn().mockResolvedValue({ docs })
      }
      return chain
    }

    const mockAdminDb: any = {
      collection: vi.fn((col: string) => {
        if (col === 'pipeline') {
          return {
            ...createQueryChain([eligibleDoc, notEligibleDoc]),
            doc: vi.fn((id: string) => ({ id, col: 'pipeline' }))
          }
        }
        return {
          ...createQueryChain([]),
          doc: vi.fn((id: string) => ({ id, col: 'clients' }))
        }
      }),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async (ref: any) => {
            if (ref.id === 'deal-1') {
              return { exists: true, data: () => eligibleDoc.data() }
            }
            return { exists: false, data: () => null }
          }),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const res = await runMonthlyPipelineCycleAutoArchive(mockAdminDb)
    expect(res.archivedCount).toBe(1)
    expect(mockTxSet).toHaveBeenCalledTimes(1)
    expect(mockTxDelete).toHaveBeenCalledTimes(1)
  })

  it('throws and logs when Firestore fails during runMonthlyPipelineCycleAutoArchive', async () => {
    const failingDb: any = {
      collection: vi.fn(() => {
        throw new Error('Firestore connection failed')
      })
    }

    await expect(runMonthlyPipelineCycleAutoArchive(failingDb)).rejects.toThrow('Firestore connection failed')
  })

  it('strictly preserves pipeline doc and does NOT delete if status changed concurrently (anti-data loss)', async () => {
    const concurrentDoc = {
      id: 'deal-concurrent-1',
      data: () => ({
        companyName: 'Concurrent Corp',
        status: 'conclue',
        concludedAt: new Date('2026-09-15T10:00:00Z')
      })
    }

    const mockTxSet = vi.fn()
    const mockTxDelete = vi.fn()

    const createQueryChain = (docs: any[]) => {
      const chain: any = {
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        startAfter: vi.fn(() => chain),
        get: vi.fn().mockResolvedValue({ docs })
      }
      return chain
    }

    const mockAdminDb: any = {
      collection: vi.fn((col: string) => {
        return {
          ...createQueryChain([concurrentDoc]),
          doc: vi.fn((id: string) => ({ id, col }))
        }
      }),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async (ref: any) => {
            if (ref.id === 'deal-concurrent-1') {
              // Relecture fraîche : le statut a basculé en 'negociation' !
              return {
                exists: true,
                data: () => ({ status: 'negociation', companyName: 'Concurrent Corp' })
              }
            }
            return { exists: false, data: () => null }
          }),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const res = await runMonthlyPipelineCycleAutoArchive(mockAdminDb)
    expect(res.archivedCount).toBe(0)
    // SÉCURITÉ CRITIQUE : transaction.delete ne doit JAMAIS avoir été appelé !
    expect(mockTxDelete).not.toHaveBeenCalled()
    expect(mockTxSet).not.toHaveBeenCalled()
  })

  it('correctly detects, processes and archives historical concluded deals missing concludedAt via catchup pass', async () => {
    // Fiche historique sans concludedAt mais avec un updatedAt éligible (> J+3)
    const historicalDoc = {
      id: 'deal-historical-catchup',
      data: () => ({
        companyName: 'Old ACME Corp',
        status: 'conclue',
        updatedAt: new Date('2026-08-15T10:00:00Z') // pas de concludedAt !
      })
    }

    const mockTxSet = vi.fn()
    const mockTxDelete = vi.fn()

    const createQueryChain = (docs: any[]) => {
      const chain: any = {
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        startAfter: vi.fn(() => chain),
        get: vi.fn().mockResolvedValue({ docs })
      }
      return chain
    }

    const mockAdminDb: any = {
      collection: vi.fn((col: string) => {
        if (col === 'pipeline') {
          return {
            ...createQueryChain([historicalDoc]),
            doc: vi.fn((id: string) => ({ id, col: 'pipeline' }))
          }
        }
        return {
          ...createQueryChain([]),
          doc: vi.fn((id: string) => ({ id, col: 'clients' }))
        }
      }),
      runTransaction: vi.fn(async (cb) => {
        const tx = {
          get: vi.fn(async (ref: any) => {
            if (ref.id === 'deal-historical-catchup') {
              return { exists: true, data: () => historicalDoc.data() }
            }
            return { exists: false, data: () => null }
          }),
          set: mockTxSet,
          delete: mockTxDelete
        }
        return cb(tx)
      })
    }

    const res = await runMonthlyPipelineCycleAutoArchive(mockAdminDb)
    expect(res.archivedCount).toBe(1)
    expect(mockTxSet).toHaveBeenCalledTimes(1)
    expect(mockTxDelete).toHaveBeenCalledTimes(1)
  })

  it('correctly returns localized month label based on language using getMonthPeriodLabel', () => {
    const period = { labelFr: 'Octobre 2026', labelEn: 'October 2026' }
    expect(getMonthPeriodLabel(period, 'fr')).toBe('Octobre 2026')
    expect(getMonthPeriodLabel(period, 'en')).toBe('October 2026')
    expect(getMonthPeriodLabel(null, 'fr')).toBe('En cours')
    expect(getMonthPeriodLabel(null, 'en')).toBe('Current')
  })
})

