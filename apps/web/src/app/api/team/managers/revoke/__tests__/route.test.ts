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
      orgCode: 'SC-CM-REVOKE',
      active: true,
      plan: 'pro',
      subscriptionExpired: false,
      subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      displayName: 'Senior Manager'
    },
    'tm-1': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-REVOKE',
      displayName: 'Team Manager Sortant',
      email: 'tm1@company.cm'
    },
    'tm-2': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-REVOKE',
      displayName: 'Team Manager Repreneur',
      email: 'tm2@company.cm'
    },
    'other-tm': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-OTHER',
      displayName: 'Autre Org TM'
    }
  }

  const mockPipelineDocs = [
    {
      id: 'pipe-1',
      ref: { id: 'pipe-1' },
      data: () => ({ managerUid: 'tm-1', userId: 'rep-1', companyName: 'Entreprise Test' })
    }
  ]

  const mockProspectDocs = [
    {
      id: 'prospect-1',
      ref: { id: 'prospect-1' },
      data: () => ({ managerId: 'tm-1', name: 'Lead Test' })
    }
  ]

  const mockAccessDocs = [
    {
      id: 'access-1',
      ref: { id: 'access-1' },
      data: () => ({ managerUid: 'tm-1', email: 'rep@company.cm' })
    }
  ]

  const mockMemberUsersDocs = [
    {
      id: 'rep-1',
      ref: { id: 'rep-1' },
      data: () => ({ managerUid: 'tm-1', role: 'member' })
    }
  ]

  const mockAssignmentDocs = [
    {
      id: 'assign-1',
      ref: { id: 'assign-1' },
      data: () => ({ managerUid: 'tm-1' })
    }
  ]

  const mockDoc = vi.fn((colName: string, id: string) => {
    if (colName === 'users') {
      const data = mockUsers[id]
      return {
        ref: { id },
        get: vi.fn().mockResolvedValue({
          exists: Boolean(data),
          data: () => data
        }),
        update: vi.fn().mockResolvedValue(undefined)
      }
    }
    return {
      ref: { id },
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      update: vi.fn().mockResolvedValue(undefined)
    }
  })

  const createMockQuery = (colName: string, filters: Array<{ field: string; op: string; val: any }> = []) => ({
    where: vi.fn((field: string, op: string, val: any) =>
      createMockQuery(colName, [...filters, { field, op, val }])
    ),
    get: vi.fn().mockImplementation(async () => {
      if (colName === 'users') {
        const hasOrgFilter = filters.some(f => f.field === 'orgCode' && f.val === 'SC-CM-REVOKE')
        const hasRoleManager = filters.some(f => f.field === 'role' && f.val === 'manager')
        if (hasOrgFilter && hasRoleManager) {
          return {
            docs: [
              { id: 'sm-uid', data: () => mockUsers['sm-uid'] },
              { id: 'tm-1', data: () => mockUsers['tm-1'] },
              { id: 'tm-2', data: () => mockUsers['tm-2'] }
            ]
          }
        }
        const hasManagerFilter = filters.some(f => f.field === 'managerUid' && f.val === 'tm-1')
        const hasRoleMember = filters.some(f => f.field === 'role' && f.val === 'member')
        if (hasManagerFilter && hasRoleMember) {
          return { docs: mockMemberUsersDocs }
        }
      }
      if (colName === 'pipeline') {
        return { docs: mockPipelineDocs }
      }
      if (colName === 'manager_prospects') {
        return { docs: mockProspectDocs }
      }
      if (colName === 'team_accesses') {
        return { docs: mockAccessDocs }
      }
      if (colName === 'team_assignments') {
        return { docs: mockAssignmentDocs }
      }
      return { docs: [] }
    })
  })

  const mockCollection = vi.fn((colName: string) => {
    return {
      doc: (id: string) => mockDoc(colName, id),
      where: (field: string, op: string, val: any) => createMockQuery(colName, [{ field, op, val }])
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

vi.mock('@/lib/supabase-private-prospects', () => ({
  isPrivateProspectsTableAvailable: vi.fn().mockResolvedValue(false),
  reassignPrivateProspectsForRevokedManager: vi.fn().mockResolvedValue({ success: true, count: 0 })
}))

vi.mock('@/lib/user-notifications', () => ({
  createUserNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('POST /api/team/managers/revoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter (401) si le token est manquant', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/managers/revoke', {
      method: 'POST',
      body: JSON.stringify({ targetManagerUid: 'tm-1' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('devrait rejeter (403) si le caller n est pas le Senior Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/managers/revoke', {
      method: 'POST',
      headers: { Authorization: 'Bearer tm-token' },
      body: JSON.stringify({ targetManagerUid: 'tm-2' })
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('devrait rejeter (400) formellement l auto-révocation du Senior Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/managers/revoke', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({ targetManagerUid: 'sm-uid' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('ne peut pas se révoquer lui-même')
  })

  it('devrait rejeter (400) si le TM cible appartient à une autre organisation', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/managers/revoke', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({ targetManagerUid: 'other-tm' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('devrait révoquer le TM et transférer tous ses dossiers vers le successeur avec succès', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/managers/revoke', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({
        targetManagerUid: 'tm-1',
        successorManagerUid: 'tm-2'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.revokedManager.uid).toBe('tm-1')
    expect(json.successorManager.uid).toBe('tm-2')
    expect(mocks.mockBatchCommit).toHaveBeenCalled()
  })
})
