import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('role-labels', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.NEXT_PUBLIC_ROLE_LABEL_EXECUTIVE
    delete process.env.NEXT_PUBLIC_ROLE_LABEL_SM
    delete process.env.NEXT_PUBLIC_ROLE_LABEL_TM
    delete process.env.NEXT_PUBLIC_ROLE_LABEL_MEMBER
    delete process.env.NEXT_PUBLIC_ROLE_LABEL_SUPPORT
  })

  it('utilise les libellés par défaut quand aucune personnalisation n’est définie', async () => {
    const { getRoleDisplayLabel } = await import('../role-labels')

    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'senior_manager', lang: 'fr' })).toBe('Coordinateur')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'team_manager', lang: 'fr' })).toBe('Superviseur')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive', lang: 'fr' })).toBe('Direction Générale')
    expect(getRoleDisplayLabel({ role: 'member', lang: 'fr' })).toBe('Commercial')
    expect(getRoleDisplayLabel({ role: 'support_agent', lang: 'fr' })).toBe('Agent Support')

    // En anglais
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'senior_manager', lang: 'en' })).toBe('Coordinator')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'team_manager', lang: 'en' })).toBe('Supervisor')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive', lang: 'en' })).toBe('Executive / Director')
    expect(getRoleDisplayLabel({ role: 'member', lang: 'en' })).toBe('Sales Rep')
  })

  it('applique les libellés personnalisés pour l’instance entreprise', async () => {
    process.env.NEXT_PUBLIC_ROLE_LABEL_EXECUTIVE = 'Directeur Général'
    process.env.NEXT_PUBLIC_ROLE_LABEL_SM = 'Chef des Ventes Régional'
    process.env.NEXT_PUBLIC_ROLE_LABEL_TM = 'Superviseur de Zone'
    process.env.NEXT_PUBLIC_ROLE_LABEL_MEMBER = 'Délégué Commercial'
    process.env.NEXT_PUBLIC_ROLE_LABEL_SUPPORT = 'Assistant Commercial'

    const { getRoleDisplayLabel } = await import('../role-labels')

    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive' })).toBe('Directeur Général')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'senior_manager' })).toBe('Chef des Ventes Régional')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'team_manager' })).toBe('Superviseur de Zone')
    expect(getRoleDisplayLabel({ role: 'member' })).toBe('Délégué Commercial')
    expect(getRoleDisplayLabel({ role: 'support_agent' })).toBe('Assistant Commercial')
  })

  it('utilise le customRoleLabel pour executive si fourni', async () => {
    const { getRoleDisplayLabel } = await import('../role-labels')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive', customRoleLabel: 'Directeur Général' })).toBe('Directeur Général')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive', customRoleLabel: '  PDG  ' })).toBe('PDG')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive', customRoleLabel: '' })).toBe('Direction Générale')
    expect(getRoleDisplayLabel({ role: 'manager', orgRole: 'executive', customRoleLabel: null })).toBe('Direction Générale')
  })
})
