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
      orgCode: 'SC-CM-12345',
      plan: 'pro',
      subscriptionExpired: false
    },
    'tm-uid': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-12345',
      displayName: 'Team Manager Alpha',
      email: 'tm@company.cm'
    },
    'external-tm-uid': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'OTHER-ORG',
      displayName: 'External TM',
      email: 'ext@other.cm'
    }
  }

  const mockProspects: Record<string, any> = {
    'p-1': {
      managerId: 'sm-uid',
      name: 'Prospect Un',
      importedBy: 'sm-uid'
    },
    'p-2': {
      managerId: 'sm-uid',
      name: 'Prospect Deux',
      importedBy: 'sm-uid'
    }
  }

  const mockDoc = vi.fn((colName: string, id: string) => {
    if (colName === 'users') {
      const data = mockUsers[id]
      return {
        get: vi.fn().mockResolvedValue({
          exists: Boolean(data),
          data: () => data
        })
      }
    }
    if (colName === 'manager_prospects') {
      const data = mockProspects[id]
      return {
        id,
        ref: { id },
        get: vi.fn().mockResolvedValue({
          exists: Boolean(data),
          data: () => data,
          ref: { id }
        })
      }
    }
    return {
      get: vi.fn().mockResolvedValue({ exists: false, data: () => null })
    }
  })

  return {
    mockBatchCommit,
    mockBatchUpdate,
    mockBatch,
    mockDoc,
    mockVerifyIdToken: vi.fn().mockResolvedValue({ uid: 'sm-uid' })
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: mocks.mockVerifyIdToken
  },
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => mocks.mockDoc(name, id)
    }),
    batch: mocks.mockBatch
  }
}))

vi.mock('@/lib/manager-access', () => ({
  hasActivePaidManagerAccess: (user: any) =>
    user?.role === 'manager' && user?.plan === 'pro' && !user?.subscriptionExpired
}))

describe('POST /api/imports/transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'sm-uid' })
  })

  it('devrait rejeter (401) sans token d authentification', async () => {
    const req = new NextRequest('http://localhost:3000/api/imports/transfer', {
      method: 'POST',
      body: JSON.stringify({ targetManagerUid: 'tm-uid', prospectIds: ['p-1'] })
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('devrait rejeter (400) si aucun targetManagerUid fourni', async () => {
    const req = new NextRequest('http://localhost:3000/api/imports/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ prospectIds: ['p-1'] })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('Team Manager cible')
  })

  it('devrait rejeter (400) si le targetManagerUid est le Senior Manager lui-même', async () => {
    const req = new NextRequest('http://localhost:3000/api/imports/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ targetManagerUid: 'sm-uid', prospectIds: ['p-1'] })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('ne peut pas être le Senior Manager')
  })

  it('devrait rejeter (400) si le manager cible n appartient pas à la même organisation', async () => {
    const req = new NextRequest('http://localhost:3000/api/imports/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ targetManagerUid: 'external-tm-uid', prospectIds: ['p-1'] })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain("n'appartient pas à votre organisation")
  })

  it('devrait transférer avec succès les prospects au Team Manager de l organisation', async () => {
    const req = new NextRequest('http://localhost:3000/api/imports/transfer', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ targetManagerUid: 'tm-uid', prospectIds: ['p-1', 'p-2'] })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.count).toBe(2)
    expect(json.targetManager.name).toBe('Team Manager Alpha')
    expect(mocks.mockBatchUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.mockBatchCommit).toHaveBeenCalledTimes(1)
  })
})
