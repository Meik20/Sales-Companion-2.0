import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockGet = vi.fn()
  const mockDocGet = vi.fn()
  const mockDoc = vi.fn(() => ({ get: mockDocGet }))
  const mockLimit = vi.fn(() => ({ get: mockGet }))
  const mockWhere2 = vi.fn(() => ({ limit: mockLimit }))
  const mockWhere1 = vi.fn(() => ({ where: mockWhere2 }))
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    where: mockWhere1
  }))

  const mockCheckRateLimit = vi.fn()
  const mockGetClientIp = vi.fn(() => '127.0.0.1')

  return {
    mockGet,
    mockDocGet,
    mockDoc,
    mockLimit,
    mockWhere2,
    mockWhere1,
    mockCollection,
    mockCheckRateLimit,
    mockGetClientIp
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection
  }
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.mockCheckRateLimit,
  getClientIp: mocks.mockGetClientIp
}))

import { GET } from '../route'

describe('GET /api/team/org/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: new Date(Date.now() + 300000)
    })
  })

  it('devrait retourner 429 si le rate limit est dépassé', async () => {
    const resetDate = new Date(Date.now() + 60000)
    mocks.mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: resetDate
    })

    const req = new NextRequest('http://localhost:3000/api/team/org/verify?code=ORG-CM-1234')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.valid).toBe(false)
    expect(json.error).toContain('Trop de tentatives')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('devrait retourner 400 si le code est manquant ou trop court', async () => {
    const req = new NextRequest('http://localhost:3000/api/team/org/verify?code=ABC')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.valid).toBe(false)
    expect(json.error).toContain('trop court')
  })

  it('devrait retourner 404 si aucune organisation ne correspond au code', async () => {
    // 1. Non trouvé dans organisations
    mocks.mockDocGet.mockResolvedValueOnce({ exists: false })
    // 2. Non trouvé dans users (fallback)
    mocks.mockGet.mockResolvedValueOnce({
      empty: true,
      docs: []
    })

    const req = new NextRequest('http://localhost:3000/api/team/org/verify?code=ORG-UNKNOWN')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.valid).toBe(false)
    expect(json.error).toContain('Aucune organisation trouvée')
  })

  it('devrait retourner 200 si l organisation est trouvée dans organisations', async () => {
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        companyName: 'Acme Corp',
        sector: 'Technology',
        country: 'CM'
      })
    })

    const req = new NextRequest('http://localhost:3000/api/team/org/verify?code=ORG-CM-8888')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.valid).toBe(true)
    expect(json.orgCode).toBe('ORG-CM-8888')
    expect(json.companyName).toBe('Acme Corp')
    expect(json.sector).toBe('Technology')
    expect(json.country).toBe('CM')
  })

  it('devrait retourner 200 via le fallback users si absente de organisations', async () => {
    mocks.mockDocGet.mockResolvedValueOnce({ exists: false })
    mocks.mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            companyName: 'Legacy Org',
            sector: 'Retail',
            country: 'CM'
          })
        }
      ]
    })

    const req = new NextRequest('http://localhost:3000/api/team/org/verify?code=ORG-CM-7777')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.valid).toBe(true)
    expect(json.orgCode).toBe('ORG-CM-7777')
    expect(json.companyName).toBe('Legacy Org')
  })

  it('devrait gérer les erreurs internes (500)', async () => {
    mocks.mockDocGet.mockRejectedValueOnce(new Error('Firestore connection timeout'))

    const req = new NextRequest('http://localhost:3000/api/team/org/verify?code=ORG-CM-8888')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.valid).toBe(false)
    expect(json.error).toBe('Firestore connection timeout')
  })
})
