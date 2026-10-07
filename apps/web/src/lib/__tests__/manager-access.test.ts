import { describe, expect, it } from 'vitest'
import { hasActivePaidManagerAccess } from '../manager-access'

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

  it('rejects a manager with an expired subscription', () => {
    expect(
      hasActivePaidManagerAccess({
        ...activeManager,
        subscriptionExpiresAt: new Date(Date.now() - 60_000).toISOString()
      })
    ).toBe(false)
  })
})