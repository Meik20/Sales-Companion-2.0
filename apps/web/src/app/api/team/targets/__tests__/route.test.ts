import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const mocks = vi.hoisted(() => {
  const mockTargets: Array<Record<string, any>> = [
    // Cible pour le membre actif Landry
    {
      id: 'tm-1_landry-uid_2026-11',
      managerUid: 'tm-1',
      memberId: 'landry-uid',
      memberName: 'Landry FU',
      targetVolume: 50,
      targetValue: 300000,
      period: '2026-11'
    },
    // Cible orpheline d'un ancien membre qui a quitté l'équipe
    {
      id: 'tm-1_old-rep-uid_2026-11',
      managerUid: 'tm-1',
      memberId: 'old-rep-uid',
      memberName: 'Ancien Commercial',
      targetVolume: 50,
      targetValue: 300000,
      period: '2026-11'
    }
  ]

  const mockTeamAccesses: Array<Record<string, any>> = [
    // Seul Landry est encore actif dans team_accesses
    {
      id: 'landry-access',
      managerUid: 'tm-1',
      firebaseUid: 'landry-uid',
      name: 'Landry FU',
      role: 'member'
    }
  ]

  const mockCollection = vi.fn((colName: string) => {
    return {
      doc: vi.fn((id: string) => ({
        get: vi.fn().mockResolvedValue({
          exists: id === 'tm-1',
          data: () => ({
            role: 'manager',
            orgRole: 'team_manager',
            plan: 'pro',
            active: true,
            subscriptionExpired: false,
            subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
          })
        })
      })),
      where: vi.fn((field: string, op: string, val: any) => {
        const queryObj: any = {
          get: vi.fn().mockImplementation(async () => {
            if (colName === 'teamTargets') {
              return {
                docs: mockTargets.map((t) => ({
                  id: t.id,
                  data: () => t
                }))
              }
            }
            if (colName === 'team_accesses') {
              return {
                docs: mockTeamAccesses.map((a) => ({
                  id: a.id,
                  data: () => a
                }))
              }
            }
            return { docs: [] }
          })
        }
        queryObj.where = vi.fn(() => queryObj)
        return queryObj
      })
    }
  })

  return {
    mockCollection,
    mockTargets,
    mockTeamAccesses
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection
  },
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid-tm-token') return { uid: 'tm-1' }
      throw new Error('Invalid token')
    })
  }
}))

describe('GET /api/team/targets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exclut automatiquement les cibles orphelines des anciens membres partis de l équipe', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/targets', {
      method: 'GET',
      headers: { authorization: 'Bearer valid-tm-token' }
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    // Doit contenir uniquement la cible de Landry FU (50 lignes, 300k)
    // et exclure old-rep-uid qui ne fait plus partie de team_accesses
    expect(json.targets).toHaveLength(1)
    expect(json.targets[0].memberId).toBe('landry-uid')
    expect(json.targets[0].targetVolume).toBe(50)
    expect(json.targets[0].targetValue).toBe(300000)
  })
})
