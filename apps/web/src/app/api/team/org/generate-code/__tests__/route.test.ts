import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockDocGet = vi.fn()
  const mockDoc = vi.fn(() => ({ get: mockDocGet }))

  const mockQueryGet = vi.fn()
  const mockLimit = vi.fn(() => ({ get: mockQueryGet }))
  const mockWhere = vi.fn(() => ({ limit: mockLimit }))

  const mockCollection = vi.fn((name: string) => {
    if (name === 'users') {
      return {
        doc: mockDoc,
        where: mockWhere
      }
    }
    return { doc: mockDoc }
  })

  const mockCheckRateLimit = vi.fn()
  const mockGenerateOrgCode = vi.fn()

  return {
    mockVerifyIdToken,
    mockDocGet,
    mockDoc,
    mockQueryGet,
    mockLimit,
    mockWhere,
    mockCollection,
    mockCheckRateLimit,
    mockGenerateOrgCode
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: mocks.mockVerifyIdToken
  },
  adminDb: {
    collection: mocks.mockCollection
  }
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.mockCheckRateLimit
}))

vi.mock('@/lib/org', () => ({
  generateOrgCode: mocks.mockGenerateOrgCode
}))

import { POST } from '../route'

describe('POST /api/team/org/generate-code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: new Date(Date.now() + 600000)
    })
  })

  it('devrait retourner 401 si le token Authorization est absent', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/org/generate-code', {
      method: 'POST'
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Non authentifie')
  })

  it('devrait retourner 401 si le token est invalide ou expiré', async () => {
    mocks.mockVerifyIdToken.mockRejectedValueOnce(new Error('Firebase ID token has expired'))

    const req = new NextRequest('http://localhost:3000/api/team/org/generate-code', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid-token'
      }
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Token invalide ou expire')
  })

  it('devrait retourner 429 si la limite de taux est atteinte', async () => {
    mocks.mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-manager-123' })
    mocks.mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 3,
      remaining: 0,
      reset: new Date(Date.now() + 60000)
    })

    const req = new NextRequest('http://localhost:3000/api/team/org/generate-code', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token'
      }
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toContain('Trop de tentatives')
  })

  it('devrait retourner 409 si l utilisateur possède déjà un orgCode', async () => {
    mocks.mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-manager-123' })
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ orgCode: 'ORG-CM-ALREADY' })
    })

    const req = new NextRequest('http://localhost:3000/api/team/org/generate-code', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token'
      }
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('Un code ORG existe deja pour ce compte')
  })

  it('devrait générer avec succès un code unique et retourner 200', async () => {
    mocks.mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-manager-123' })
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ role: 'manager' })
    })
    mocks.mockGenerateOrgCode.mockReturnValue('ORG-CM-9999')
    mocks.mockQueryGet.mockResolvedValueOnce({ empty: true }) // Aucune collision

    const req = new NextRequest('http://localhost:3000/api/team/org/generate-code', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ country: 'CM' })
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.orgCode).toBe('ORG-CM-9999')
    expect(json.message).toContain('Code ORG genere avec succes')
  })

  it('devrait retenter la génération en cas de collision et réussir si le suivant est libre', async () => {
    mocks.mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-manager-123' })
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ role: 'manager' })
    })
    mocks.mockGenerateOrgCode
      .mockReturnValueOnce('ORG-CM-COLLISION')
      .mockReturnValueOnce('ORG-CM-SUCCESS')

    mocks.mockQueryGet
      .mockResolvedValueOnce({ empty: false }) // Premier code pris
      .mockResolvedValueOnce({ empty: true }) // Deuxième code disponible

    const req = new NextRequest('http://localhost:3000/api/team/org/generate-code', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token'
      }
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.orgCode).toBe('ORG-CM-SUCCESS')
  })
})
