import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const mocks = vi.hoisted(() => {
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
  const mockBatchUpdate = vi.fn()
  const mockBatch = vi.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit
  }))

  const mockUsers: Record<string, any> = {
    'sm-uid': {
      role: 'manager',
      orgRole: 'senior_manager',
      orgCode: 'SC-CM-TRANSFER',
      active: true,
      plan: 'pro',
      subscriptionExpired: false,
      subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      displayName: 'Senior Manager'
    },
    'tm-1': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-TRANSFER',
      displayName: 'Team Manager A',
      email: 'tma@company.cm'
    },
    'tm-2': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-TRANSFER',
      displayName: 'Team Manager B',
      email: 'tmb@company.cm'
    },
    'rep-1': {
      role: 'member',
      orgCode: 'SC-CM-TRANSFER',
      managerUid: 'tm-1',
      displayName: 'Marc Rep',
      email: 'marc@company.cm'
    }
  }

  const mockDoc = vi.fn((colName: string, id: string) => {
    if (colName === 'users') {
      const data = mockUsers[id]
      return {
        ref: { id },
        get: vi.fn().mockResolvedValue({
          exists: Boolean(data),
          data: () => data
        })
      }
    }
    return {
      ref: { id },
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      update: vi.fn().mockResolvedValue(undefined)
    }
  })

  const mockCollection = vi.fn((colName: string) => {
    return {
      doc: (id: string) => mockDoc(colName, id),
      where: vi.fn((field: string, op: string, val: string) => {
        return {
          get: vi.fn().mockResolvedValue({ docs: [] }),
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              docs: [
                {
                  id: 'pipe-rep-1',
                  ref: { id: 'pipe-rep-1' },
                  data: () => ({ userId: 'rep-1', managerUid: 'tm-1', orgCode: 'SC-CM-TRANSFER' })
                }
              ]
            })
          }))
        }
      })
    }
  })

  return {
    mockBatch,
    mockBatchUpdate,
    mockBatchCommit,
    mockCollection,
    mockDoc,
    mockUsers
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection,
    batch: mocks.mockBatch
  },
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid-sm-token') return { uid: 'sm-uid' }
      if (token === 'tm-token') return { uid: 'tm-1' }
      throw new Error('Invalid token')
    })
  }
}))

vi.mock('@/lib/user-notifications', () => ({
  createUserNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('POST /api/team/members/transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter (401) si l utilisateur n est pas authentifié', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/transfer', {
      method: 'POST',
      body: JSON.stringify({ memberUid: 'rep-1', targetManagerUid: 'tm-2' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('devrait rejeter (403) si le caller n est pas le Senior Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer tm-token' },
      body: JSON.stringify({ memberUid: 'rep-1', targetManagerUid: 'tm-2' })
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('devrait rejeter (400) si le commercial est déjà rattaché à ce Team Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({ memberUid: 'rep-1', targetManagerUid: 'tm-1' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('déjà rattaché')
  })

  it('devrait transférer avec succès le commercial vers le nouveau Team Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({ memberUid: 'rep-1', targetManagerUid: 'tm-2' })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.member.uid).toBe('rep-1')
    expect(json.targetManager.uid).toBe('tm-2')
    expect(mocks.mockBatchCommit).toHaveBeenCalled()
  })
})
