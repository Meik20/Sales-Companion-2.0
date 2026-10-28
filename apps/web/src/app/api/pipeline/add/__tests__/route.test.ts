import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockUserGet = vi.fn()
  const mockPipelineAdd = vi.fn()
  const mockManagerProspectsAdd = vi.fn()
  const mockOrgDocUpdate = vi.fn()
  const mockQueryGet = vi.fn()

  // Crée une query chainable supportant where(), limit() et get()
  const createQuery = (): any => ({
    where: () => createQuery(),
    limit: () => createQuery(),
    get: mockQueryGet
  })

  const mockCollection = vi.fn((name: string) => {
    if (name === 'users') return { doc: (docId?: string) => ({ get: () => mockUserGet(docId) }) }
    if (name === 'organisations') return { doc: () => ({ update: mockOrgDocUpdate }) }
    if (name === 'manager_prospects') return { add: mockManagerProspectsAdd, where: () => createQuery() }
    if (name === 'clients') return { where: () => createQuery() }
    // pipeline (default)
    return { add: mockPipelineAdd, where: () => createQuery() }
  })

  return {
    mockVerifyIdToken,
    mockUserGet,
    mockPipelineAdd,
    mockManagerProspectsAdd,
    mockOrgDocUpdate,
    mockQueryGet,
    mockCollection
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: { verifyIdToken: mocks.mockVerifyIdToken },
  adminDb: { collection: mocks.mockCollection }
}))

// Neutralise le miroir Supabase (non bloquant dans la route, mais sans mock il lève une erreur d'import)
vi.mock('@/lib/supabase-private-prospects', () => ({
  isPrivateProspectsTableAvailable: vi.fn().mockResolvedValue(false),
  bulkInsertPrivateProspects: vi.fn().mockResolvedValue(undefined)
}))

import { POST } from '../route'

describe('POST /api/pipeline/add ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'caller-uid', email_verified: true })
    mocks.mockUserGet.mockResolvedValue({
      data: () => ({
        role: 'independent',
        active: true,
        activated: true,
        emailVerified: true,
        name: 'Caller'
      })
    })
    mocks.mockPipelineAdd.mockResolvedValue({ id: 'pipeline-1' })
    mocks.mockManagerProspectsAdd.mockResolvedValue({ id: 'prospect-1' })
    mocks.mockOrgDocUpdate.mockResolvedValue({})
    mocks.mockQueryGet.mockResolvedValue({ docs: [] })
  })

  it('derives ownership from the authenticated profile, not request fields', async () => {
    const request = new NextRequest('http://localhost/api/pipeline/add', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        companyName: 'Example Co',
        userRole: 'manager',
        managerUid: 'victim-uid',
        assignedTo: 'victim-uid',
        memberName: 'Victim',
        memberAccessId: 'victim@company'
      })
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mocks.mockPipelineAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'caller-uid',
        managerUid: null,
        assignedTo: 'caller-uid',
        memberName: 'Caller',
        memberAccessId: null
      })
    )
  })

  it('routes prospects added by a manager to manager_prospects waiting queue', async () => {
    mocks.mockUserGet.mockResolvedValueOnce({
      data: () => ({
        role: 'manager',
        orgRole: 'team_manager',
        active: true,
        activated: true,
        emailVerified: true,
        orgCode: 'SC-CM-TEST1',
        plan: 'pro',
        subscriptionExpired: false,
        subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
      })
    })

    const request = new NextRequest('http://localhost/api/pipeline/add', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        companyName: 'Entreprise Ciblée',
        companyPhone: '+237699000000',
        companyCity: 'Douala',
        country: 'CM'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.target).toBe('imports')
    expect(mocks.mockManagerProspectsAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        managerId: 'caller-uid',
        orgCode: 'SC-CM-TEST1',
        name: 'Entreprise Ciblée',
        assignedTo: null,
        status: 'new'
      })
    )
    expect(mocks.mockPipelineAdd).not.toHaveBeenCalled()
  })

  it('rejects inactive managers before writing pipeline data', async () => {
    mocks.mockUserGet.mockResolvedValueOnce({
      data: () => ({ role: 'manager', active: false, activated: false })
    })
    const request = new NextRequest('http://localhost/api/pipeline/add', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ companyName: 'Example Co' })
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(mocks.mockPipelineAdd).not.toHaveBeenCalled()
    expect(mocks.mockManagerProspectsAdd).not.toHaveBeenCalled()
  })

  it('blocks addition with 409 conflict when a prospect is already assigned in the same team', async () => {
    // 1. Caller is a member
    mocks.mockUserGet.mockResolvedValueOnce({
      data: () => ({
        role: 'member',
        active: true,
        activated: true,
        emailVerified: true,
        orgCode: 'SC-CM-TEST1',
        segment: 'Nord',
        managerUid: 'tm-1',
        name: 'Nouveau Rep'
      })
    })

    // 2. Query finds an existing active prospect in pipeline under the same team
    mocks.mockQueryGet.mockResolvedValue({
      docs: [
        {
          id: 'pipe-existing-1',
          ref: { id: 'pipe-existing-1', parent: { id: 'pipeline' } },
          data: () => ({
            companyName: 'Entreprise En Conflit',
            status: 'negociation',
            orgCode: 'SC-CM-TEST1',
            segment: 'Nord',
            managerUid: 'tm-1',
            managerName: 'Alain Dupont',
            assignedTo: 'rep-other',
            memberName: 'Autre Rep'
          })
        }
      ]
    })

    const request = new NextRequest('http://localhost/api/pipeline/add', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        companyName: 'Entreprise En Conflit',
        companyPhone: '+237699112233'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe('prospect_already_assigned')
    expect(json.conflict.companyName).toBe('Entreprise En Conflit')
    expect(json.conflict.status).toBe('negociation')
    expect(json.conflict.teamManagerName).toBe('Alain Dupont')
    expect(json.conflict.assignedMemberName).toBe('Autre Rep')
    expect(mocks.mockPipelineAdd).not.toHaveBeenCalled()
  })

  it('blocks addition with 409 conflict when a prospect is already held in manager_prospects in the same segment', async () => {
    // 1. Caller is a manager in segment 'Littoral'
    mocks.mockUserGet.mockResolvedValueOnce({
      data: () => ({
        role: 'manager',
        orgRole: 'team_manager',
        active: true,
        activated: true,
        emailVerified: true,
        orgCode: 'SC-CM-TEST1',
        segment: 'Littoral',
        plan: 'pro',
        subscriptionExpired: false,
        subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
      })
    })

    // 2. Query finds a prospect in manager_prospects belonging to another TM in Littoral
    mocks.mockQueryGet.mockResolvedValue({
      docs: [
        {
          id: 'prospect-imported-1',
          ref: { id: 'prospect-imported-1', parent: { id: 'manager_prospects' } },
          data: () => ({
            companyName: 'Cameroun Telecom',
            companyId: 'comp-100',
            status: 'new',
            orgCode: 'SC-CM-TEST1',
            segment: 'Littoral',
            managerId: 'tm-2',
            managerName: 'Beatrice Manager',
            assignedTo: null
          })
        }
      ]
    })

    const request = new NextRequest('http://localhost/api/pipeline/add', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        companyId: 'comp-100',
        companyName: 'Cameroun Telecom'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe('prospect_already_assigned')
    expect(json.conflict.teamManagerName).toBe('Beatrice Manager')
    expect(json.conflict.assignedMemberName).toBeNull()
    expect(mocks.mockManagerProspectsAdd).not.toHaveBeenCalled()
  })

  it('blocks addition with 409 conflict when a prospect in manager_prospects has missing segment but TM belongs to same segment', async () => {
    // 1. Caller is TM in segment 'COMMERCIAL'
    mocks.mockUserGet.mockImplementation((docId?: string) => {
      if (docId === 'tm-owner-1') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            name: 'Kevin Mbaye',
            displayName: 'Kevin Mbaye',
            role: 'manager',
            segment: 'COMMERCIAL',
            orgCode: 'SC-CM-TEST1'
          })
        })
      }
      return Promise.resolve({
        exists: true,
        data: () => ({
          role: 'manager',
          orgRole: 'team_manager',
          active: true,
          activated: true,
          emailVerified: true,
          orgCode: 'SC-CM-TEST1',
          segment: 'COMMERCIAL',
          plan: 'pro',
          subscriptionExpired: false,
          subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      })
    })

    // 2. Query finds prospect in manager_prospects with segment = undefined / null
    mocks.mockQueryGet.mockResolvedValue({
      docs: [
        {
          id: 'prospect-imported-no-segment',
          ref: { id: 'prospect-imported-no-segment', parent: { id: 'manager_prospects' } },
          data: () => ({
            companyName: 'Cybersecurity Research Lab',
            companyId: 'crl-100',
            status: 'new',
            orgCode: 'SC-CM-TEST1',
            segment: null, // absent/non renseigné sur le document
            managerId: 'tm-owner-1',
            managerName: 'Kevin Mbaye',
            assignedTo: null
          })
        }
      ]
    })

    const request = new NextRequest('http://localhost/api/pipeline/add', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        companyId: 'crl-100',
        companyName: 'Cybersecurity Research Lab'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toBe('prospect_already_assigned')
    expect(json.conflict.teamManagerName).toBe('Kevin Mbaye')
    expect(json.conflict.segment).toBe('COMMERCIAL')
    expect(json.conflict.isSameUser).toBe(false)
    expect(mocks.mockManagerProspectsAdd).not.toHaveBeenCalled()
  })
})
