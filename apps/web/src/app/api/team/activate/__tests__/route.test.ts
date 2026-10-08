import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const VALID_MAGIC_CODE = 'valid-magic-code-32-chars-long123'

const mocks = vi.hoisted(() => {
  const mockUserSet = vi.fn().mockResolvedValue(undefined)
  const mockDocUpdate = vi.fn().mockResolvedValue(undefined)
  const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined)
  const mockCreateUser = vi.fn().mockResolvedValue({ uid: 'new-user-uid' })
  const mockGetUserByEmail = vi.fn().mockRejectedValue({ code: 'auth/user-not-found' })

  let mockAccessDocData: any = {}

  const mockDocRef = {
    update: mockDocUpdate,
    set: mockUserSet,
    get: vi.fn().mockImplementation(() =>
      Promise.resolve({
        exists: true,
        data: () => mockAccessDocData,
        ref: mockDocRef
      })
    )
  }

  const mockDoc = vi.fn((id: string) => {
    return {
      get: vi.fn().mockResolvedValue({
        exists: id === 'new-user-uid' || id === 'manager-123',
        data: () => (id === 'manager-123' ? { plan: 'pro', active: true } : mockAccessDocData),
        ref: mockDocRef
      }),
      set: mockUserSet,
      update: mockDocUpdate
    }
  })

  const mockCollection = vi.fn((name: string) => {
    return {
      doc: mockDoc,
      where: vi.fn((field: string, op: string, val: string) => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue(
            field === 'magicCode' && val === VALID_MAGIC_CODE
              ? {
                  empty: false,
                  docs: [
                    {
                      exists: true,
                      data: () => ({ ...mockAccessDocData, magicCode: VALID_MAGIC_CODE }),
                      ref: mockDocRef
                    }
                  ]
                }
              : { empty: true, docs: [] }
          )
        }))
      }))
    }
  })

  const mockRunTransaction = vi.fn(async (callback: any) => {
    const fakeTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ ...mockAccessDocData, magicCode: VALID_MAGIC_CODE })
      }),
      update: mockDocUpdate,
      set: mockUserSet
    }
    return callback(fakeTx)
  })

  return {
    mockUserSet,
    mockDocUpdate,
    mockSetCustomUserClaims,
    mockCreateUser,
    mockGetUserByEmail,
    mockDoc,
    mockCollection,
    mockRunTransaction,
    setAccessData: (data: any) => {
      mockAccessDocData = data
    }
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection,
    runTransaction: mocks.mockRunTransaction
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
      magicCode: VALID_MAGIC_CODE,
      activated: false
    })

    const req = new NextRequest('http://localhost:3000/api/team/activate', {
      method: 'POST',
      body: JSON.stringify({
        accessId: VALID_MAGIC_CODE,
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
    expect(mocks.mockSetCustomUserClaims).not.toHaveBeenCalledWith('new-user-uid', {
      role: 'admin'
    })

    // Vérifier que le document utilisateur dans Firestore a role: 'member'
    expect(mocks.mockUserSet).toHaveBeenCalledWith(
      expect.anything(),
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
      magicCode: VALID_MAGIC_CODE,
      activated: false
    })

    const req = new NextRequest('http://localhost:3000/api/team/activate', {
      method: 'POST',
      body: JSON.stringify({
        accessId: VALID_MAGIC_CODE,
        password: 'Password123!',
        email: 'agent@test.com'
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mocks.mockSetCustomUserClaims).toHaveBeenCalledWith('new-user-uid', {
      role: 'support_agent'
    })
    expect(mocks.mockUserSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        role: 'support_agent'
      }),
      { merge: true }
    )
  })
})
