import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const mocks = vi.hoisted(() => {
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
  const mockBatchUpdate = vi.fn()
  const mockBatchDelete = vi.fn()
  const mockBatch = vi.fn(() => ({
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit
  }))

  const mockUsers: Record<string, any> = {
    'sm-uid': {
      role: 'manager',
      orgRole: 'senior_manager',
      orgCode: 'SC-CM-PROMOTE',
      segment: 'Nord',
      active: true,
      plan: 'pro',
      subscriptionExpired: false,
      subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      displayName: 'Senior Manager'
    },
    'tm-1': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-PROMOTE',
      segment: 'Nord',
      displayName: 'Team Manager A',
      email: 'tma@company.cm'
    },
    'rep-1': {
      role: 'member',
      orgCode: 'SC-CM-PROMOTE',
      segment: 'Nord',
      managerUid: 'tm-1',
      displayName: 'Marc Rep',
      email: 'marc@company.cm'
    },
    'already-tm': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-PROMOTE',
      segment: 'Nord',
      displayName: 'Deja Manager',
      email: 'deja@company.cm'
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
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 'pipe-rep-1',
              ref: { id: 'pipe-rep-1' },
              data: () => ({ userId: 'rep-1', managerUid: 'tm-1', orgCode: 'SC-CM-PROMOTE', status: 'prospection' })
            }
          ]
        })
      }))
    }
  })

  return {
    mockBatch,
    mockBatchUpdate,
    mockBatchDelete,
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
    }),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('@/lib/user-notifications', () => ({
  createUserNotification: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    delete: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date())
  }
}))

describe('POST /api/team/members/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter (401) si non authentifié', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/promote', {
      method: 'POST',
      body: JSON.stringify({ memberUid: 'rep-1' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('devrait rejeter (403) si le caller n est pas un Senior Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/promote', {
      method: 'POST',
      headers: { Authorization: 'Bearer tm-token' },
      body: JSON.stringify({ memberUid: 'rep-1' })
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('devrait rejeter (400) si l utilisateur n a pas le rôle member', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/promote', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({ memberUid: 'already-tm' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('Impossible de promouvoir')
  })

  it('devrait promouvoir avec succès le commercial en Team Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/members/promote', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({ memberUid: 'rep-1', segment: 'Nord' })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.promotedMember.role).toBe('manager')
    expect(json.promotedMember.orgRole).toBe('team_manager')
    expect(mocks.mockBatchCommit).toHaveBeenCalled()
  })
})
