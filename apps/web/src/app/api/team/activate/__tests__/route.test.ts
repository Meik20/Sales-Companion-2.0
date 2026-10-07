import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const mocks = vi.hoisted(() => {
  const mockUserSet = vi.fn().mockResolvedValue(undefined)
  const mockDocUpdate = vi.fn().mockResolvedValue(undefined)
  const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined)
  const mockCreateUser = vi.fn().mockResolvedValue({ uid: 'new-user-uid' })
  const mockGetUserByEmail = vi.fn().mockRejectedValue({ code: 'auth/user-not-found' })

  let mockAccessDocData: any = {}

  const mockDoc = vi.fn((id: string) => {
    if (id === 'valid-access') {
      const snap = {
        exists: true,
        data: () => mockAccessDocData,
        ref: { update: mockDocUpdate }
      }
      return {
        get: vi.fn().mockResolvedValue(snap),
        set: mockUserSet,
        update: mockDocUpdate
      }
    }
    return {
      get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: mockUserSet,
      update: mockDocUpdate
    }
  })

  const mockCollection = vi.fn((name: string) => {
    return {
      doc: mockDoc,
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
        }))
      }))
    }
  })

  return {
    mockUserSet,
    mockDocUpdate,
    mockSetCustomUserClaims,
    mockCreateUser,
    mockGetUserByEmail,
    mockDoc,
    mockCollection,
    setAccessData: (data: any) => {
      mockAccessDocData = data
    }
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection
  },
  adminAuth: {
    getUserByEmail: mocks.mockGetUserByEmail,
    createUser: mocks.mockCreateUser,
    updateUser: vi.fn(),
    setCustomUserClaims: mocks.mockSetCustomUserClaims
  }
}))

describe('POST /api/team/activate — Protection contre l’élévation de privilèges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ne doit JAMAIS accorder le rôle admin même si la fiche team_accesses contient role="admin"', async () => {
    // Tentative d'escalade de privilèges : la fiche a été falsifiée avec role: 'admin'
    mocks.setAccessData({
      role: 'admin',
      email: 'invitee@test.com',
      managerUid: 'manager-123',
      activated: false
    })

    const req = new NextRequest('http://localhost:3000/api/team/activate', {
      method: 'POST',
      body: JSON.stringify({
        accessId: 'valid-access',
        password: 'Password123!',
        email: 'invitee@test.com'
      })
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Vérifier que le custom claim posé n'est PAS 'admin', mais 'member'
    expect(mocks.mockSetCustomUserClaims).toHaveBeenCalledWith('new-user-uid', { role: 'member' })
    expect(mocks.mockSetCustomUserClaims).not.toHaveBeenCalledWith('new-user-uid', { role: 'admin' })

    // Vérifier que le document utilisateur dans Firestore a role: 'member'
    expect(mocks.mockUserSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'member'
      }),
      { merge: true }
    )
  })

  it('accorde le rôle support_agent si légitimement invité en support_agent', async () => {
    mocks.setAccessData({
      role: 'support_agent',
      email: 'agent@test.com',
      managerUid: 'manager-123',
      activated: false
    })

    const req = new NextRequest('http://localhost:3000/api/team/activate', {
      method: 'POST',
      body: JSON.stringify({
        accessId: 'valid-access',
        password: 'Password123!',
        email: 'agent@test.com'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mocks.mockSetCustomUserClaims).toHaveBeenCalledWith('new-user-uid', { role: 'support_agent' })
    expect(mocks.mockUserSet).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'support_agent'
      }),
      { merge: true }
    )
  })
})
