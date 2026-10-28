import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockCheckAllExpiredSubscriptions = vi.fn()
  return { mockCheckAllExpiredSubscriptions }
})

vi.mock('@/lib/subscription', () => ({
  checkAllExpiredSubscriptions: mocks.mockCheckAllExpiredSubscriptions
}))

import { GET, POST } from '../route'

describe('CRON /api/cron/check-subscriptions', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-cron-secret-xyz' }
    mocks.mockCheckAllExpiredSubscriptions.mockResolvedValue({
      totalChecked: 10,
      totalDowngraded: 2,
      expiredUids: ['user-1', 'user-2']
    })
  })

  it('rejette avec 503 si CRON_SECRET n\'est pas configuré', async () => {
    delete process.env.CRON_SECRET

    const req = new NextRequest('http://localhost/api/cron/check-subscriptions', {
      headers: { Authorization: 'Bearer test-cron-secret-xyz' }
    })

    const res = await GET(req)
    expect(res.status).toBe(503)
    expect(mocks.mockCheckAllExpiredSubscriptions).not.toHaveBeenCalled()
  })

  it('rejette avec 401 si aucun secret n\'est fourni', async () => {
    const req = new NextRequest('http://localhost/api/cron/check-subscriptions')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mocks.mockCheckAllExpiredSubscriptions).not.toHaveBeenCalled()
  })

  it('rejette avec 401 si le secret est passé dans l\'URL via ?key=', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/check-subscriptions?key=test-cron-secret-xyz'
    )
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mocks.mockCheckAllExpiredSubscriptions).not.toHaveBeenCalled()
  })

  it('rejette avec 401 si le secret est erroné', async () => {
    const req = new NextRequest('http://localhost/api/cron/check-subscriptions', {
      headers: { Authorization: 'Bearer wrong-secret' }
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mocks.mockCheckAllExpiredSubscriptions).not.toHaveBeenCalled()
  })

  it('accepte et s\'exécute avec l\'en-tête Authorization Bearer', async () => {
    const req = new NextRequest('http://localhost/api/cron/check-subscriptions', {
      headers: { Authorization: 'Bearer test-cron-secret-xyz' }
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.totalDowngraded).toBe(2)
    expect(mocks.mockCheckAllExpiredSubscriptions).toHaveBeenCalled()
  })

  it('accepte et s\'exécute avec l\'en-tête x-cron-key', async () => {
    const req = new NextRequest('http://localhost/api/cron/check-subscriptions', {
      headers: { 'x-cron-key': 'test-cron-secret-xyz' }
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mocks.mockCheckAllExpiredSubscriptions).toHaveBeenCalled()
  })
})

