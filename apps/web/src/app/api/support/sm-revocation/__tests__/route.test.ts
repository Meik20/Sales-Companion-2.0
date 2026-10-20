import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const mocks = vi.hoisted(() => {
  const mockThreadAdd = vi.fn()
  const mockMessagesAdd = vi.fn().mockResolvedValue({ id: 'msg-1' })

  const mockUsers: Record<string, any> = {
    'sm-caller': {
      role: 'manager',
      orgRole: 'senior_manager',
      orgCode: 'SC-CM-MULTI',
      segment: 'Pôle Nord',
      active: true,
      plan: 'enterprise',
      subscriptionExpired: false,
      subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      displayName: 'Senior Manager 1',
      email: 'sm1@company.cm'
    },
    'sm-target': {
      role: 'manager',
      orgRole: 'senior_manager',
      orgCode: 'SC-CM-MULTI',
      segment: 'Pôle Sud',
      displayName: 'Senior Manager 2',
      email: 'sm2@company.cm'
    },
    'tm-rep': {
      role: 'manager',
      orgRole: 'team_manager',
      orgCode: 'SC-CM-MULTI',
      segment: 'Pôle Nord',
      displayName: 'Team Manager Repreneur'
    },
    'other-org-sm': {
      role: 'manager',
      orgRole: 'senior_manager',
      orgCode: 'SC-CM-OTHER',
      displayName: 'Autre SM'
    }
  }

  const mockExistingThreads: any[] = []

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
    if (colName === 'organisations') {
      return {
        ref: { id },
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ companyName: 'Grande Entreprise SA' })
        })
      }
    }
    return {
      ref: { id },
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) })
    }
  })

  const createMockQuery = (colName: string, filters: Array<{ field: string; op: string; val: any }> = []) => ({
    where: vi.fn((field: string, op: string, val: any) =>
      createMockQuery(colName, [...filters, { field, op, val }])
    ),
    get: vi.fn().mockImplementation(async () => {
      if (colName === 'support_threads') {
        const isTargetMatch = filters.some(f => f.field === 'targetSmUid' && f.val === 'sm-already-pending')
        if (isTargetMatch) {
          return { empty: false, docs: [{ id: 'thread-existing' }] }
        }
        return { empty: mockExistingThreads.length === 0, docs: mockExistingThreads }
      }
      return { empty: true, docs: [] }
    }),
    add: vi.fn().mockImplementation(async (data: any) => {
      mockThreadAdd(data)
      return {
        id: 'new-thread-123',
        collection: vi.fn(() => ({
          add: mockMessagesAdd
        }))
      }
    })
  })

  const mockCollection = vi.fn((colName: string) => {
    const q = createMockQuery(colName, [])
    return {
      doc: (id: string) => mockDoc(colName, id),
      where: q.where,
      add: q.add
    }
  })

  return {
    mockCollection,
    mockDoc,
    mockThreadAdd,
    mockMessagesAdd,
    mockUsers
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection
  },
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid-sm-token') return { uid: 'sm-caller' }
      if (token === 'tm-token') return { uid: 'tm-rep' }
      throw new Error('Invalid token')
    })
  }
}))

vi.mock('@/lib/user-notifications', () => ({
  createUserNotification: vi.fn().mockResolvedValue(undefined)
}))

describe('POST /api/support/sm-revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rejeter (401) si aucun token n est fourni', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/sm-revocation', {
      method: 'POST',
      body: JSON.stringify({ targetSmUid: 'sm-target' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('devrait rejeter (403) si le caller n est pas un Senior Manager', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/sm-revocation', {
      method: 'POST',
      headers: { Authorization: 'Bearer tm-token' },
      body: JSON.stringify({ targetSmUid: 'sm-target' })
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('devrait rejeter (400) formellement l auto-demande de révocation', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/sm-revocation', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({
        targetSmUid: 'sm-caller',
        reason: 'Motif de test pour auto révocation',
        executiveContactName: 'DG',
        executiveContactEmail: 'dg@company.cm'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('propre révocation')
  })

  it('devrait rejeter (400) si la cible n est pas Senior Manager ou autre organisation', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/sm-revocation', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({
        targetSmUid: 'other-org-sm',
        reason: 'Motif de test suffisant pour passer',
        executiveContactName: 'Directeur Général',
        executiveContactEmail: 'dg@company.cm'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('organisation')
  })

  it('devrait rejeter (400) si le motif ou les coordonnées de direction sont insuffisants', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/sm-revocation', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({
        targetSmUid: 'sm-target',
        reason: 'court',
        executiveContactName: '',
        executiveContactEmail: 'invalide'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('devrait enregistrer la demande de gouvernance et créer le ticket support avec succès', async () => {
    const req = new NextRequest('http://localhost:3000/api/support/sm-revocation', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-sm-token' },
      body: JSON.stringify({
        targetSmUid: 'sm-target',
        reason: 'Départ acté de la direction de pôle avec restructuration du segment Sud',
        executiveContactName: 'Paul Biya CEO',
        executiveContactEmail: 'direction@company.cm',
        executiveContactPhone: '+237690000000',
        proposedSuccessorUid: 'tm-rep'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.ticketId).toBe('new-thread-123')
    expect(mocks.mockThreadAdd).toHaveBeenCalled()
    expect(mocks.mockMessagesAdd).toHaveBeenCalled()
  })
})
