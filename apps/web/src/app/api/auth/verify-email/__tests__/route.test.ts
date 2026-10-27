import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn()
  const mockCheckRateLimit = vi.fn()
  const mockCreateAdminNotification = vi.fn()
  const usersStore = new Map<string, any>()
  const orgsStore = new Map<string, any>()
  const orgInvitesStore = new Map<string, any>()

  const mockUserUpdate = vi.fn((uid: string, data: any) => {
    const existing = usersStore.get(uid) || {}
    usersStore.set(uid, { ...existing, ...data })
    return Promise.resolve()
  })

  return {
    mockVerifyIdToken,
    mockCheckRateLimit,
    mockCreateAdminNotification,
    usersStore,
    orgsStore,
    orgInvitesStore,
    mockUserUpdate
  }
})

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  checkRateLimit: mocks.mockCheckRateLimit
}))

vi.mock('@/lib/admin-notifications', () => ({
  createAdminNotification: mocks.mockCreateAdminNotification
}))

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: mocks.mockVerifyIdToken
  },
  adminDb: {
    collection: (colName: string) => ({
      doc: (id: string) => ({
        get: () => {
          if (colName === 'users') {
            const data = mocks.usersStore.get(id)
            return Promise.resolve({
              exists: Boolean(data),
              data: () => data
            })
          }
          if (colName === 'organisations') {
            const data = mocks.orgsStore.get(id)
            return Promise.resolve({
              exists: Boolean(data),
              data: () => data
            })
          }
          if (colName === 'orgInvites') {
            const data = mocks.orgInvitesStore.get(id)
            return Promise.resolve({
              exists: Boolean(data),
              data: () => data
            })
          }
          return Promise.resolve({ exists: false, data: () => null })
        },
        update: (data: any) => {
          if (colName === 'users') {
            return mocks.mockUserUpdate(id, data)
          }
          return Promise.resolve()
        }
      }),
      where: () => ({
        where: () => ({
          limit: () => ({
            get: () => Promise.resolve({ empty: true, docs: [] })
          })
        }),
        limit: () => ({
          get: () => Promise.resolve({ empty: true, docs: [] })
        })
      })
    })
  }
}))

import { POST } from '../route'

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.usersStore.clear()
    mocks.orgsStore.clear()
    mocks.orgInvitesStore.clear()
    mocks.mockCheckRateLimit.mockResolvedValue({ success: true })
    mocks.mockCreateAdminNotification.mockResolvedValue(undefined)
  })

  it('active directement un commercial ou un indépendant vérifié', async () => {
    const uid = 'member-123'
    mocks.mockVerifyIdToken.mockResolvedValue({
      uid,
      email: 'member@test.com',
      email_verified: true
    })
    mocks.usersStore.set(uid, {
      role: 'member',
      emailVerificationPending: true,
      active: false,
      activated: false
    })

    const req = new NextRequest('http://localhost/api/auth/verify-email', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' }
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const updated = mocks.usersStore.get(uid)
    expect(updated.active).toBe(true)
    expect(updated.activated).toBe(true)
    expect(updated.emailVerified).toBe(true)
    expect(updated.emailVerificationPending).toBe(false)
  })

  it('active un Team Manager et lui transmet le plan Enterprise du Senior Manager actif', async () => {
    const smUid = 'sm-active-456'
    const tmUid = 'tm-invite-789'

    // Senior Manager avec plan Enterprise actif
    mocks.usersStore.set(smUid, {
      role: 'manager',
      orgRole: 'senior_manager',
      plan: 'enterprise',
      active: true,
      emailVerified: true,
      subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
    })

    // Team Manager invité sous ce SM
    mocks.usersStore.set(tmUid, {
      role: 'manager',
      orgRole: 'team_manager',
      seniorManagerUid: smUid,
      emailVerificationPending: true,
      active: false,
      activated: false,
      plan: 'free'
    })

    mocks.mockVerifyIdToken.mockResolvedValue({
      uid: tmUid,
      email: 'tm@test.com',
      email_verified: true
    })

    const req = new NextRequest('http://localhost/api/auth/verify-email', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' }
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const updatedTm = mocks.usersStore.get(tmUid)
    expect(updatedTm.active).toBe(true)
    expect(updatedTm.activated).toBe(true)
    expect(updatedTm.plan).toBe('enterprise')
    expect(updatedTm.dailyLimit).toBe(50)
    expect(updatedTm.subscriptionExpiresAt).toBeDefined()
    // Ne doit PAS notifier l'admin qu'un paiement est attendu pour ce TM
    expect(mocks.mockCreateAdminNotification).not.toHaveBeenCalled()
  })

  it('ne doit PAS activer directement un autre Senior Manager invité (doit gérer son propre plan)', async () => {
    const smUid = 'other-sm-999'

    mocks.usersStore.set(smUid, {
      role: 'manager',
      orgRole: 'senior_manager',
      emailVerificationPending: true,
      active: false,
      activated: false,
      plan: 'free'
    })

    mocks.mockVerifyIdToken.mockResolvedValue({
      uid: smUid,
      email: 'othersm@test.com',
      email_verified: true
    })

    const req = new NextRequest('http://localhost/api/auth/verify-email', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' }
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const updatedSm = mocks.usersStore.get(smUid)
    // Le SM doit attendre son propre paiement
    expect(updatedSm.active).toBe(false)
    expect(updatedSm.emailVerified).toBe(true)
    expect(updatedSm.emailVerificationPending).toBe(false)
    // L'admin doit être notifié de l'attente de paiement du nouveau SM
    expect(mocks.mockCreateAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_manager',
        userId: smUid
      })
    )
  })
})
