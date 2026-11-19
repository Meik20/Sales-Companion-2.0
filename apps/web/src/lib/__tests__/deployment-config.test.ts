import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('DEPLOYMENT_CONFIG', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
    delete process.env.NEXT_PUBLIC_ENTERPRISE_NAME
    delete process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS
    delete process.env.NEXT_PUBLIC_DEDICATED_ORG_CODE
  })

  it('définit le mode public par défaut lorsque aucune variable n’est spécifiée', async () => {
    const { DEPLOYMENT_CONFIG } = await import('../deployment-config')
    expect(DEPLOYMENT_CONFIG.mode).toBe('public')
    expect(DEPLOYMENT_CONFIG.isEnterprise).toBe(false)
    expect(DEPLOYMENT_CONFIG.enterpriseName).toBe('')
    expect(DEPLOYMENT_CONFIG.allowedEmailDomains).toEqual([])
    expect(DEPLOYMENT_CONFIG.isDomainAllowed('john@gmail.com')).toBe(true)
  })

  it('active le mode enterprise lorsque NEXT_PUBLIC_DEPLOYMENT_MODE=enterprise', async () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'enterprise'
    process.env.NEXT_PUBLIC_ENTERPRISE_NAME = 'Groupe SABC'
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS = 'groupe-sabc.cm, sabc.com'
    process.env.NEXT_PUBLIC_DEDICATED_ORG_CODE = 'SC-CM-SABC1'

    const { DEPLOYMENT_CONFIG } = await import('../deployment-config')
    expect(DEPLOYMENT_CONFIG.mode).toBe('enterprise')
    expect(DEPLOYMENT_CONFIG.isEnterprise).toBe(true)
    expect(DEPLOYMENT_CONFIG.enterpriseName).toBe('Groupe SABC')
    expect(DEPLOYMENT_CONFIG.dedicatedOrgCode).toBe('SC-CM-SABC1')
    expect(DEPLOYMENT_CONFIG.allowedEmailDomains).toEqual(['groupe-sabc.cm', 'sabc.com'])

    // Validation des domaines
    expect(DEPLOYMENT_CONFIG.isDomainAllowed('ivan@groupe-sabc.cm')).toBe(true)
    expect(DEPLOYMENT_CONFIG.isDomainAllowed('commercial@SABC.COM')).toBe(true)
    expect(DEPLOYMENT_CONFIG.isDomainAllowed('inconnu@gmail.com')).toBe(false)
    expect(DEPLOYMENT_CONFIG.isDomainAllowed('hacker@outlook.com')).toBe(false)
  })
})
