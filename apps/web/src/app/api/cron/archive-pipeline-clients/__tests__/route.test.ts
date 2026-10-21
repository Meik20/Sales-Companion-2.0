import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mockRunArchive = vi.fn()
  return { mockRunArchive }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {}
}))

vi.mock('@/server/services/monthly-cycle-archive.service', () => ({
  runMonthlyPipelineCycleAutoArchive: mocks.mockRunArchive
}))

import { GET, POST } from '../route'

describe('CRON /api/cron/archive-pipeline-clients', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  it('rejects with 503 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const req = new NextRequest('http://localhost/api/cron/archive-pipeline-clients')
    const res = await GET(req)

    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.message).toContain('configuration CRON_SECRET manquante')
    expect(mocks.mockRunArchive).not.toHaveBeenCalled()
  })

  it('rejects with 401 if invalid secret is provided', async () => {
    process.env.CRON_SECRET = 'super-secret-123'

    const req = new NextRequest('http://localhost/api/cron/archive-pipeline-clients', {
      headers: { authorization: 'Bearer wrong-secret' }
    })
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.message).toBe('Non autorisé')
    expect(mocks.mockRunArchive).not.toHaveBeenCalled()
  })

  it('executes archive and drains batches when valid Bearer secret is provided', async () => {
    process.env.CRON_SECRET = 'super-secret-123'

    // Simuler 2 lots successifs : 1er lot hasMore = true (300 fiches), 2ème lot hasMore = false (50 fiches)
    mocks.mockRunArchive
      .mockResolvedValueOnce({ archivedCount: 300, hasMore: true })
      .mockResolvedValueOnce({ archivedCount: 50, hasMore: false })

    const req = new NextRequest('http://localhost/api/cron/archive-pipeline-clients', {
      headers: { authorization: 'Bearer super-secret-123' }
    })
    const res = await GET(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.archivedCount).toBe(350)
    expect(json.batchesRun).toBe(2)
    expect(json.hasMore).toBe(false)
    expect(mocks.mockRunArchive).toHaveBeenCalledTimes(2)
  })

  it('rejects with 401 when secret is passed in URL query parameter (?key=)', async () => {
    process.env.CRON_SECRET = 'super-secret-123'

    const req = new NextRequest('http://localhost/api/cron/archive-pipeline-clients?key=super-secret-123')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.message).toBe('Non autorisé')
    expect(mocks.mockRunArchive).not.toHaveBeenCalled()
  })

  it('accepts valid secret via POST with x-cron-key header and propagates cursors', async () => {
    process.env.CRON_SECRET = 'super-secret-123'
    const mockCursor = { id: 'doc-300' } as any
    mocks.mockRunArchive
      .mockResolvedValueOnce({ archivedCount: 200, hasMore: true, nextCursors: { q1LastDoc: mockCursor } })
      .mockResolvedValueOnce({ archivedCount: 50, hasMore: false })

    const req = new NextRequest('http://localhost/api/cron/archive-pipeline-clients', {
      method: 'POST',
      headers: { 'x-cron-key': 'super-secret-123' }
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.archivedCount).toBe(250)
    expect(json.batchesRun).toBe(2)
    expect(mocks.mockRunArchive).toHaveBeenCalledTimes(2)
    // Vérifier que le 2ème lot a bien reçu le curseur du 1er lot
    expect(mocks.mockRunArchive).toHaveBeenNthCalledWith(2, expect.anything(), undefined, 300, { q1LastDoc: mockCursor })
  })

  it('returns 500 and reports failure when the archive service throws', async () => {
    process.env.CRON_SECRET = 'super-secret-123'
    mocks.mockRunArchive.mockRejectedValueOnce(new Error('Firestore network timeout'))

    const req = new NextRequest('http://localhost/api/cron/archive-pipeline-clients', {
      headers: { authorization: 'Bearer super-secret-123' }
    })
    const res = await GET(req)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('Firestore network timeout')
  })
})
