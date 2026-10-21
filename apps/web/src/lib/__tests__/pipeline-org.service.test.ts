import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchOrgConsolidatedPipeline } from '../../server/services/pipeline-org.service'

vi.mock('@/lib/firebase-admin', () => {
  return {
    adminDb: {
      collection: vi.fn()
    }
  }
})

describe('pipeline-org.service - fetchOrgConsolidatedPipeline', () => {
  it('normalizes unrecognized status as other and excludes it from prospection/negociation', async () => {
    const { adminDb } = await import('@/lib/firebase-admin')

    const mockManagersDocs = [
      {
        id: 'tm-1',
        data: () => ({
          displayName: 'Team Manager 1',
          orgRole: 'team_manager',
          orgCode: 'SC-CM-TEST1',
          role: 'manager'
        })
      }
    ]

    const mockPipelineDocs = [
      {
        id: 'p1',
        data: () => ({
          managerUid: 'tm-1',
          status: 'prospection',
          amount: 10000,
          orgCode: 'SC-CM-TEST1'
        })
      },
      {
        id: 'p2',
        data: () => ({
          managerUid: 'tm-1',
          status: 'negociation',
          amount: 25000,
          orgCode: 'SC-CM-TEST1'
        })
      },
      {
        id: 'p3',
        data: () => ({
          managerUid: 'tm-1',
          status: 'conclue',
          amount: 100000,
          orgCode: 'SC-CM-TEST1'
        })
      },
      {
        id: 'p4',
        data: () => ({
          managerUid: 'tm-1',
          status: 'perdu_ou_corrompu',
          amount: 50000,
          orgCode: 'SC-CM-TEST1'
        })
      }
    ]

    ;(adminDb.collection as any).mockImplementation((collName: string) => {
      if (collName === 'users') {
        return {
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: mockManagersDocs })
            })
          })
        }
      }
      if (collName === 'pipeline') {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: mockPipelineDocs })
            })
          })
        }
      }
      return {}
    })

    const result = await fetchOrgConsolidatedPipeline({
      orgCode: 'SC-CM-TEST1',
      callerUid: 'sm-test-uid'
    })

    // Vérifier les comptes globaux
    expect(result.counts.prospection).toBe(1)
    expect(result.counts.negociation).toBe(1)
    expect(result.counts.conclue).toBe(1)
    expect(result.counts.other).toBe(1)
    expect(result.counts.total).toBe(4)

    // Vérifier les valeurs financières
    expect(result.values.prospection).toBe(10000)
    expect(result.values.negociation).toBe(25000)
    expect(result.values.conclue).toBe(100000)
    expect(result.values.other).toBe(50000)
    expect(result.values.total).toBe(185000)

    // Vérifier que le statut de l'item corrompu/inconnu est normalisé à 'other'
    const unknownItem = result.items.find((i) => i.id === 'p4')
    expect(unknownItem?.status).toBe('other')

    // Vérifier les stats du manager
    const tm1Stats = result.managers.find((m) => m.uid === 'tm-1')?.stats
    expect(tm1Stats?.prospection).toBe(1)
    expect(tm1Stats?.negociation).toBe(1)
    expect(tm1Stats?.conclue).toBe(1)
    expect(tm1Stats?.other).toBe(1)
    expect(tm1Stats?.total).toBe(4)
  })
})
