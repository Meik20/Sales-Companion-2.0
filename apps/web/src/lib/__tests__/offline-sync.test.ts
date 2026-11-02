// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getQueuedMutations,
  enqueueOfflineMutation,
  removeQueuedMutation,
  clearQueuedMutations,
  processOfflineQueue
} from '../offline-sync'

describe('Offline Mutation Queue (offline-sync.ts)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('retourne une liste vide initialement', () => {
    expect(getQueuedMutations()).toEqual([])
  })

  it('ajoute une mutation dans la file d’attente locale', () => {
    const item = enqueueOfflineMutation({
      type: 'add_activity',
      endpoint: '/api/pipeline/deal-1/activities',
      method: 'POST',
      payload: { type: 'call', summary: 'Appel prospect' },
      description: 'Appel prospect'
    })

    expect(item.id).toBeDefined()
    expect(item.retryCount).toBe(0)
    expect(item.queuedAt).toBeDefined()

    const queue = getQueuedMutations()
    expect(queue).toHaveLength(1)
    expect(queue[0]?.description).toBe('Appel prospect')
  })

  it('supprime une mutation par son ID', () => {
    const item1 = enqueueOfflineMutation({
      type: 'add_activity',
      endpoint: '/api/pipeline/deal-1/activities',
      method: 'POST',
      payload: { type: 'call', summary: 'Appel 1' },
      description: 'Appel 1'
    })
    const item2 = enqueueOfflineMutation({
      type: 'add_activity',
      endpoint: '/api/pipeline/deal-2/activities',
      method: 'POST',
      payload: { type: 'visit', summary: 'Visite 2' },
      description: 'Visite 2'
    })

    expect(getQueuedMutations()).toHaveLength(2)
    removeQueuedMutation(item1.id)
    const remaining = getQueuedMutations()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.id).toBe(item2.id)
  })

  it('vide intégralement la file d’attente', () => {
    enqueueOfflineMutation({
      type: 'add_activity',
      endpoint: '/api/pipeline/deal-1/activities',
      method: 'POST',
      payload: {},
      description: 'Test'
    })
    clearQueuedMutations()
    expect(getQueuedMutations()).toHaveLength(0)
  })

  it('rejoue les mutations en attente lors du retour en ligne', async () => {
    enqueueOfflineMutation({
      type: 'add_activity',
      endpoint: '/api/pipeline/deal-1/activities',
      method: 'POST',
      payload: { summary: 'Synchronisé' },
      description: 'Action offline'
    })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    })
    global.fetch = mockFetch

    const result = await processOfflineQueue('fake-token')
    expect(result.processed).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.remaining).toBe(0)
    expect(getQueuedMutations()).toHaveLength(0)
  })
})
