import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const mocks = vi.hoisted(() => {
  const mockTargets: Array<Record<string, any>> = [
    {
      id: 'tm-1_landry-uid_2026-10',
      managerUid: 'tm-1',
      memberId: 'landry-uid',
      memberName: 'Landry FU',
      targetVolume: 45,
      targetValue: 250000,
      period: '2026-10'
    },
    {
      id: 'tm-1_old-rep-uid_2026-10',
      managerUid: 'tm-1',
      memberId: 'old-rep-uid',
      memberName: 'Ancien Rep',
      targetVolume: 20,
      targetValue: 100000,
      period: '2026-10'
    }
  ]

  const mockTeamAccesses: Array<Record<string, any>> = [
    {
      id: 'landry-access',
      managerUid: 'tm-1',
      firebaseUid: 'landry-uid',
      name: 'Landry FU',
      role: 'member',
      status: 'active'
    }
  ]

  const batchSetCalls: any[] = []
  const mockBatch = {
    set: vi.fn((ref: any, data: any, opts: any) => {
      batchSetCalls.push({ ref, data, opts })
    }),
    commit: vi.fn().mockResolvedValue(undefined)
  }

  const mockCollection = vi.fn((colName: string) => {
    return {
      doc: vi.fn((id: string) => ({
        id,
        get: vi.fn().mockResolvedValue({
          exists: id === 'tm-1' || id === 'sm-1',
          data: () => {
            if (id === 'sm-1') {
              return {
                role: 'manager',
                orgRole: 'senior_manager',
                orgCode: 'SC-CM-TEST1',
                plan: 'enterprise',
                active: true,
                subscriptionExpired: false,
                subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
              }
            }
            return {
              role: 'manager',
              orgRole: 'team_manager',
              orgCode: 'SC-CM-TEST1',
              plan: 'pro',
              active: true,
              subscriptionExpired: false,
              subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
            }
          }
        })
      })),
      where: vi.fn((field: string, op: string, val: any) => {
        const queryObj: any = {
          get: vi.fn().mockImplementation(async () => {
            if (colName === 'teamTargets') {
              return {
                empty: mockTargets.length === 0,
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
            return { docs: [], empty: true }
          })
        }
        queryObj.where = vi.fn(() => queryObj)
        return queryObj
      })
    }
  })

  return {
    mockCollection,
    mockBatch,
    batchSetCalls,
    mockTargets,
    mockTeamAccesses
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection,
    batch: () => mocks.mockBatch
  },
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid-tm-token') return { uid: 'tm-1' }
      if (token === 'sm-token') return { uid: 'sm-1' }
      throw new Error('Invalid token')
    })
  }
}))

describe('POST /api/team/targets/renew', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.batchSetCalls.length = 0
  })

  it('rejette les requêtes non authentifiées avec 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/targets/renew', {
      method: 'POST',
      body: JSON.stringify({ fromPeriod: '2026-10', toPeriod: '2026-11' })
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('interdit la reconduction directe aux Senior Managers (403)', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/targets/renew', {
      method: 'POST',
      headers: { authorization: 'Bearer sm-token', 'content-type': 'application/json' },
      body: JSON.stringify({ fromPeriod: '2026-10', toPeriod: '2026-11' })
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.message).toContain('Senior Manager')
  })

  it('rejette les périodes identiques ou mal formatées avec 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/targets/renew', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-tm-token', 'content-type': 'application/json' },
      body: JSON.stringify({ fromPeriod: '2026-11', toPeriod: '2026-11' })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('reconduit avec succès les objectifs des membres actifs uniquement', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/targets/renew', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-tm-token', 'content-type': 'application/json' },
      body: JSON.stringify({ fromPeriod: '2026-10', toPeriod: '2026-11', overwrite: true })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    // Landry est actif -> reconduit ; old-rep n'est plus actif -> skipped
    expect(json.renewed).toBe(1)
    expect(json.skipped).toBe(1)
    expect(json.period).toBe('2026-11')

    expect(mocks.mockBatch.commit).toHaveBeenCalledTimes(1)
    expect(mocks.batchSetCalls.length).toBe(1)
    expect(mocks.batchSetCalls[0].data.memberId).toBe('landry-uid')
    expect(mocks.batchSetCalls[0].data.period).toBe('2026-11')
    expect(mocks.batchSetCalls[0].data.targetVolume).toBe(45)
    expect(mocks.batchSetCalls[0].data.targetValue).toBe(250000)
    expect(mocks.batchSetCalls[0].data.renewedFromPeriod).toBe('2026-10')
  })
})
