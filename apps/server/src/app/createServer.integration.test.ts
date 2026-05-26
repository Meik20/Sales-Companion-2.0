import { describe, it, expect, vi } from 'vitest'

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    WEB_ORIGIN: 'http://localhost:3000',
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_CLIENT_EMAIL: 'test@test.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n'
  }
}))

vi.mock('../firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockRejectedValue(new Error('Invalid token'))
  },
  adminDb: {},
  admin: { firestore: { FieldValue: {} } },
  adminApp: {}
}))

import request from 'supertest'
import { createServer } from './createServer'

describe('createServer integration', () => {
  const app = createServer()

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('GET / returns running message', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.text).toContain('running')
  })

  it('rewrites /api/health to /health', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('GET /pipeline/stats/summary is not captured as :id', async () => {
    const res = await request(app)
      .get('/pipeline/stats/summary')
      .set('Authorization', 'Bearer invalid')
    // 401 = route matched auth middleware (not 404 from wrong handler)
    expect(res.status).toBe(401)
  })

  it('POST /ai/pitch is deprecated but reachable', async () => {
    const res = await request(app).post('/ai/pitch').send({})
    expect(res.headers.deprecation).toBe('true')
    expect(res.status).toBe(200)
  })
})
