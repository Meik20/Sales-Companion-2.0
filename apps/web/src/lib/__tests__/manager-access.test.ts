import { describe, expect, it, vi } from 'vitest'
import { hasActivePaidManagerAccess, verifyAndSyncManagerAccess } from '../manager-access'

describe('hasActivePaidManagerAccess', () => {
  const activeManager = {
    role: 'manager',
    active: true,
    activated: true,
    emailVerified: true,
    plan: 'pro',
    subscriptionExpiresAt: new Date(Date.now() + 60_000).toISOString()
  }

  it('allows an activated manager with a current paid subscription', () => {
    expect(hasActivePaidManagerAccess(activeManager)).toBe(true)
  })

  it('rejects an inactive manager even when the role is manager', () => {
    expect(hasActivePaidManagerAccess({ ...activeManager, active: false })).toBe(false)
  })

  it('rejects a manager with pending email verification', () => {
    expect(
      hasActivePaidManagerAccess({
        ...activeManager,
        emailVerificationPending: true
      })
    ).toBe(false)
  })

  it('rejects a manager with pending payment', () => {
    expect(
      hasActivePaidManagerAccess({
        ...activeManager,
        paymentPending: true
      })
    ).toBe(false)
  })

  it('allows a legacy active paid manager without emailVerified field', () => {
    const legacyManager = { ...activeManager }
    delete (legacyManager as any).emailVerified
    delete (legacyManager as any).activated
    expect(hasActivePaidManagerAccess(legacyManager)).toBe(true)
  })
})

describe('verifyAndSyncManagerAccess', () => {
  it('auto-synchronise un Team Manager désynchronisé si son Senior Manager est actif', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    const mockAdminDb = {
      collection: (col: string) => ({
        doc: (id: string) => {
          if (col === 'users' && id === 'sm-1') {
            return {
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  role: 'manager',
                  orgRole: 'senior_manager',
                  active: true,
                  plan: 'enterprise',
                  subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
                })
              })
            }
          }
          if (col === 'users' && id === 'tm-1') {
            return {
              update: mockUpdate
            }
          }
          return { get: vi.fn().mockResolvedValue({ exists: false }) }
        }
      })
    }

    const unsyncedTm = {
      role: 'manager',
      orgRole: 'team_manager',
      seniorManagerUid: 'sm-1',
      active: false,
      plan: 'free'
    }

    const result = await verifyAndSyncManagerAccess(mockAdminDb as any, 'tm-1', unsyncedTm)
    expect(result.hasAccess).toBe(true)
    expect(result.data.plan).toBe('enterprise')
    expect(result.data.active).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'enterprise',
        active: true
      })
    )
  })
})
