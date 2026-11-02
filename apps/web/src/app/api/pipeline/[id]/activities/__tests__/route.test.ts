import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockUserGet = vi.fn()
  const mockPipelineGet = vi.fn()
  const mockPipelineUpdate = vi.fn()
  const mockActivitiesAdd = vi.fn()
  const mockActivitiesGet = vi.fn()

  const createActivitiesQuery = (): any => ({
    orderBy: () => createActivitiesQuery(),
    limit: () => createActivitiesQuery(),
    get: mockActivitiesGet
  })

  const mockPipelineDoc = vi.fn((docId: string) => ({
    get: () => mockPipelineGet(docId),
    update: mockPipelineUpdate,
    collection: (subName: string) => {
      if (subName === 'activities') {
        return {
          add: mockActivitiesAdd,
          orderBy: () => createActivitiesQuery()
        }
      }
      return {}
    }
  }))

  const mockCollection = vi.fn((name: string) => {
    if (name === 'users') {
      return { doc: (docId?: string) => ({ get: () => mockUserGet(docId) }) }
    }
    if (name === 'pipeline') {
      return { doc: mockPipelineDoc }
    }
    return {}
  })

  return {
    mockVerifyIdToken,
    mockUserGet,
    mockPipelineGet,
    mockPipelineUpdate,
    mockActivitiesAdd,
    mockActivitiesGet,
    mockCollection
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: { verifyIdToken: mocks.mockVerifyIdToken },
  adminDb: { collection: mocks.mockCollection }
}))

import { GET, POST } from '../route'

describe('Pipeline Activities Route (/api/pipeline/[id]/activities)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockVerifyIdToken.mockResolvedValue({ uid: 'commercial-uid' })
    mocks.mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        name: 'Paul Commercial',
        role: 'member',
        orgCode: 'SC-CM-TEST1'
      })
    })
    mocks.mockPipelineGet.mockResolvedValue({
      exists: true,
      id: 'deal-123',
      data: () => ({
        userId: 'commercial-uid',
        companyName: 'Acme SARL',
        status: 'prospection'
      })
    })
  })

  it('GET rejette avec 401 si aucun token d’authentification', async () => {
    const req = new NextRequest('http://localhost/api/pipeline/deal-123/activities')
    const res = await GET(req, { params: Promise.resolve({ id: 'deal-123' }) })
    expect(res.status).toBe(401)
  })

  it('GET renvoie 404 si l’opportunité n’existe pas', async () => {
    mocks.mockPipelineGet.mockResolvedValueOnce({ exists: false })
    const req = new NextRequest('http://localhost/api/pipeline/deal-404/activities', {
      headers: { Authorization: 'Bearer valid-token' }
    })
    const res = await GET(req, { params: Promise.resolve({ id: 'deal-404' }) })
    expect(res.status).toBe(404)
  })

  it('GET renvoie 403 si un utilisateur non autorisé tente d’accéder à l’opportunité', async () => {
    mocks.mockPipelineGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: 'other-user',
        managerUid: 'other-tm'
      })
    })
    const req = new NextRequest('http://localhost/api/pipeline/deal-123/activities', {
      headers: { Authorization: 'Bearer valid-token' }
    })
    const res = await GET(req, { params: Promise.resolve({ id: 'deal-123' }) })
    expect(res.status).toBe(403)
  })

  it('GET retourne la liste des activités pour l’utilisateur assigné', async () => {
    mocks.mockActivitiesGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'act-1',
          data: () => ({
            type: 'call',
            summary: 'Appel avec le DG, devis demandé',
            outcome: 'Échange positif',
            performedBy: 'commercial-uid',
            performedByName: 'Paul Commercial',
            createdAt: { toDate: () => new Date('2026-11-02T10:00:00Z') }
          })
        }
      ]
    })

    const req = new NextRequest('http://localhost/api/pipeline/deal-123/activities', {
      headers: { Authorization: 'Bearer valid-token' }
    })
    const res = await GET(req, { params: Promise.resolve({ id: 'deal-123' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.activities).toHaveLength(1)
    expect(json.activities[0].summary).toBe('Appel avec le DG, devis demandé')
  })

  it('POST valide le schéma et rejette si summary est vide', async () => {
    const req = new NextRequest('http://localhost/api/pipeline/deal-123/activities', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'call', summary: '' })
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'deal-123' }) })
    expect(res.status).toBe(400)
  })

  it('POST enregistre l’interaction et met à jour firstActionAt et nextFollowUp', async () => {
    mocks.mockActivitiesAdd.mockResolvedValueOnce({ id: 'new-act-id' })

    const req = new NextRequest('http://localhost/api/pipeline/deal-123/activities', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'visit',
        summary: 'Visite dans les locaux à Bonanjo. Démo effectuée.',
        outcome: 'RDV fixé',
        nextFollowUpDate: '2026-11-10'
      })
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'deal-123' }) })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('new-act-id')
    expect(json.type).toBe('visit')

    // Vérifie que parent pipelineDoc a été mis à jour avec firstActionAt et nextFollowUp
    expect(mocks.mockPipelineUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstActionAt: expect.any(String),
        nextFollowUp: '2026-11-10'
      })
    )
  })
})

