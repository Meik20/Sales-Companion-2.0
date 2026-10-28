import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockUserGet = vi.fn()
  const mockPipelineAdd = vi.fn()
  const mockManagerProspectsAdd = vi.fn()
  const mockOrgDocUpdate = vi.fn()
  const mockQueryGet = vi.fn()
  const createQuery = (): any => ({
    where: () => createQuery(),
    get: mockQueryGet
  })
  const mockCollection = vi.fn((name: string) => {
    if (name === 'users') return { doc: () => ({ get: mockUserGet }) }
    if (name === 'organisations') return { doc: () => ({ update: mockOrgDocUpdate }) }
    if (name === 'manager_prospects') return { add: mockManagerProspectsAdd, where: () => createQuery() }
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
})
