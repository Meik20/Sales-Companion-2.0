import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockUserGet = vi.fn()
  const mockPipelineAdd = vi.fn()
  const mockQueryGet = vi.fn()
  const createQuery = (): any => ({
    where: () => createQuery(),
    get: mockQueryGet
  })
  const mockCollection = vi.fn((name: string) => {
    if (name === 'users') return { doc: () => ({ get: mockUserGet }) }
    return { add: mockPipelineAdd, where: () => createQuery() }
  })

  return { mockVerifyIdToken, mockUserGet, mockPipelineAdd, mockQueryGet, mockCollection }
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
  })
})
