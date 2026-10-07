import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

// Utiliser vi.hoisted pour les variables partagées avec les mocks hissés (hoisted)
const mocks = vi.hoisted(() => {
  const mockBatchUpdate = vi.fn()
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined)
  const mockDocGet = vi.fn()
  const mockDocUpdate = vi.fn()
  const mockAddLog = vi.fn().mockResolvedValue({ id: 'log-123' })

  const mockBatch = vi.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit
  }))

  const mockDoc = vi.fn((_id?: string) => ({
    get: mockDocGet,
    update: mockDocUpdate
  }))

  const mockCollection = vi.fn((name: string) => {
    if (name === 'webhook_logs') {
      return { add: mockAddLog }
    }
    return { doc: mockDoc }
  })

  return {
    mockBatchUpdate,
    mockBatchCommit,
    mockDocGet,
    mockDocUpdate,
    mockAddLog,
    mockBatch,
    mockDoc,
    mockCollection
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: mocks.mockCollection,
    batch: mocks.mockBatch
  }
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  }
}))

vi.mock('@/lib/sync-team-plan', () => ({
  syncTeamMemberPlans: vi.fn().mockResolvedValue({ updatedUsers: 2 })
}))

vi.mock('@/lib/subscription', () => ({
  calculateSubscriptionExpiry: () => new Date('2026-11-06T00:00:00.000Z')
}))

import { POST } from '../route'

describe('POST /api/payment/webhook', () => {
  const secret = 'test-webhook-secret-key-123'
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      CAMPAY_WEBHOOK_SECRET: secret
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function createSignedRequest(body: object, customSignature?: string) {
    const rawBody = JSON.stringify(body)
    const sig =
      customSignature !== undefined
        ? customSignature
        : createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

    const headers: Record<string, string> = {
      'content-type': 'application/json'
    }
    if (sig) {
      headers['x-campay-signature'] = sig
    }

    return new NextRequest('http://localhost:3000/api/payment/webhook', {
      method: 'POST',
      headers,
      body: rawBody
    })
  }

  it('devrait rejeter (401) si la signature HMAC est manquante en production', async () => {
    const req = createSignedRequest({ status: 'SUCCESSFUL', external_reference: 'tx-1' }, '')

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Signature invalide')
  })

  it('devrait rejeter (401) si la signature HMAC est falsifiée', async () => {
    const fakeSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const req = createSignedRequest({ status: 'SUCCESSFUL', external_reference: 'tx-1' }, fakeSignature)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Signature invalide')
  })

  it('devrait ignorer de manière idempotente un paiement déjà SUCCESSFUL', async () => {
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'SUCCESSFUL',
        userId: 'user-abc',
        plan: 'starter'
      })
    })

    const payload = {
      status: 'SUCCESSFUL',
      reference: 'campay-ref-999',
      external_reference: 'tx-already-done',
      operator: 'MTN',
      amount: '15000'
    }
    const req = createSignedRequest(payload)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
    // Ne doit pas ré-exécuter le batch
    expect(mocks.mockBatchCommit).not.toHaveBeenCalled()
  })

  it('devrait activer le plan atomiquement via batch pour une nouvelle transaction réussie', async () => {
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'PENDING',
        userId: 'user-buyer-42',
        plan: 'pro'
      })
    })

    const payload = {
      status: 'SUCCESSFUL',
      reference: 'campay-ref-ok-1',
      external_reference: 'tx-new-payment',
      operator: 'ORANGE',
      amount: '30000'
    }
    const req = createSignedRequest(payload)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
    expect(mocks.mockBatchUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ active: true, activated: true })
    )
    expect(mocks.mockBatchCommit).toHaveBeenCalledTimes(1)
  })

  it('devrait mettre à jour le statut en FAILED si le paiement a échoué', async () => {
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'PENDING',
        userId: 'user-buyer-42',
        plan: 'starter'
      })
    })

    const payload = {
      status: 'FAILED',
      reference: 'campay-ref-fail-1',
      external_reference: 'tx-failed-payment',
      operator: 'MTN'
    }
    const req = createSignedRequest(payload)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mocks.mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FAILED'
      })
    )
  })

  it('devrait rejeter et marquer AMOUNT_MISMATCH si le montant reçu est inférieur au montant attendu', async () => {
    mocks.mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        status: 'PENDING',
        userId: 'user-buyer-42',
        plan: 'pro',
        amount: 50000
      })
    })

    const payload = {
      status: 'SUCCESSFUL',
      reference: 'campay-ref-hack-1',
      external_reference: 'tx-mismatch',
      operator: 'MTN',
      amount: '500' // Seulement 500 au lieu de 50000
    }
    const req = createSignedRequest(payload)

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('Montant')
    expect(mocks.mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'AMOUNT_MISMATCH',
        amountPaid: '500'
      })
    )
    expect(mocks.mockBatchCommit).not.toHaveBeenCalled()
  })
})
