import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const notifAdd = vi.fn().mockResolvedValue({ id: 'notif-123' })
  const notifGet = vi.fn()
  const whereMock = vi.fn()

  return {
    notifAdd,
    notifGet,
    whereMock
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (colName: string) => {
      if (colName === 'adminNotifications') {
        return {
          add: mocks.notifAdd,
          where: mocks.whereMock
        }
      }
      return {}
    }
  }
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'MOCK_TIMESTAMP'
  }
}))

import { createAdminNotification } from '../admin-notifications'

describe('createAdminNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crée une notification sans déduplication', async () => {
    await createAdminNotification({
      type: 'new_manager',
      title: 'Nouveau Manager inscrit',
      message: 'test@orange.com a vérifié son email',
      userId: 'user-1',
      userEmail: 'test@orange.com'
    })

    expect(mocks.notifAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_manager',
        title: 'Nouveau Manager inscrit',
        userId: 'user-1',
        userEmail: 'test@orange.com',
        read: false
      })
    )
  })

  it('ne crée pas de doublon lorsque deduplicate=true et qu\'une notification existe déjà', async () => {
    // Configurer le mock de requête Firestore pour simuler un document existant
    mocks.whereMock.mockReturnValue({
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({ empty: false, docs: [{ id: 'existing-notif' }] })
        })
      })
    })

    await createAdminNotification({
      type: 'new_manager',
      title: 'Nouveau Manager inscrit',
      message: 'test@orange.com a vérifié son email',
      userId: 'user-1',
      userEmail: 'test@orange.com',
      deduplicate: true
    })

    expect(mocks.notifAdd).not.toHaveBeenCalled()
  })

  it('crée la notification lorsque deduplicate=true et qu\'aucune notification n\'existe', async () => {
    mocks.whereMock.mockReturnValue({
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({ empty: true, docs: [] })
        })
      })
    })

    await createAdminNotification({
      type: 'new_manager',
      title: 'Nouveau Manager inscrit',
      message: 'test@orange.com a vérifié son email',
      userId: 'user-2',
      userEmail: 'test@orange.com',
      deduplicate: true
    })

    expect(mocks.notifAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_manager',
        userId: 'user-2'
      })
    )
  })
})

