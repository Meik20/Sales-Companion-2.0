import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockCreate = vi.fn()
  const mockCheckRateLimit = vi.fn()
  const mockDoc = vi.fn(() => ({ create: mockCreate }))
  const mockCollection = vi.fn(() => ({ doc: mockDoc }))
  return { mockVerifyIdToken, mockCreate, mockCheckRateLimit, mockCollection }
})

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  checkRateLimit: mocks.mockCheckRateLimit
}))

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: { verifyIdToken: mocks.mockVerifyIdToken },
  adminDb: { collection: mocks.mockCollection }
}))

import { POST } from '../route'

describe('POST /api/auth/google profile provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockCheckRateLimit.mockResolvedValue({ success: true })
    mocks.mockVerifyIdToken.mockResolvedValue({
      uid: 'google-user',
      email: 'user@example.com',
      email_verified: true,
      name: 'Google User',
      firebase: { sign_in_provider: 'google.com' }
    })
    mocks.mockCreate.mockResolvedValue(undefined)
  })

  it('creates an active independent profile only from a verified Google token', async () => {
    const request = new NextRequest('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'valid-google-token' })
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mocks.mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'google-user',
        role: 'independent',
        active: true,
        activated: true,
        emailVerified: true
      })
    )
  })

  it('rejects unverified or non-Google identities without creating a profile', async () => {
    mocks.mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'other-provider',
      email_verified: true,
      firebase: { sign_in_provider: 'password' }
    })
    const request = new NextRequest('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'non-google-token' })
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(mocks.mockCreate).not.toHaveBeenCalled()
  })

  it('treats a concurrently created profile as an idempotent success', async () => {
    mocks.mockCreate.mockRejectedValueOnce({ code: 'already-exists' })
    const request = new NextRequest('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'valid-google-token' })
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })
})