import { DEPLOYMENT_CONFIG } from './deployment-config'

export interface RoleLabelParams {
  role?: string | null
  orgRole?: string | null
  lang?: 'fr' | 'en'
  /** Libellé personnalisé attribué à l'invitation (ex: "Directeur Général", "Président"). */
  customRoleLabel?: string | null
}

/**
 * Retourne le libellé d'affichage pour un rôle utilisateur donné.
 * Si l'instance dédiée configure des alias via NEXT_PUBLIC_ROLE_LABEL_*,
 * ces alias personnalisés prévalent sur les libellés standard i18n.
 */
export function getRoleDisplayLabel({
  role,
  orgRole,
  lang = 'fr',
  customRoleLabel
}: RoleLabelParams): string {
  const isEn = lang === 'en'

  if (role === 'admin') {
    return isEn ? 'Administrator' : 'Administrateur'
  }

  if (role === 'manager') {
    if (orgRole === 'executive') {
      // Libellé personnalisé défini à l'invitation (ex: "Directeur Général", "PDG")
      if (customRoleLabel?.trim()) {
        return customRoleLabel.trim()
      }
      if (DEPLOYMENT_CONFIG.roleLabels.executive) {
        return DEPLOYMENT_CONFIG.roleLabels.executive
      }
      return isEn ? 'Executive / Director' : 'Direction Générale'
    }

    if (orgRole === 'senior_manager') {
      if (DEPLOYMENT_CONFIG.roleLabels.seniorManager) {
        return DEPLOYMENT_CONFIG.roleLabels.seniorManager
      }
      return isEn ? 'Coordinator' : 'Coordinateur'
    }

    if (orgRole === 'team_manager') {
      if (DEPLOYMENT_CONFIG.roleLabels.teamManager) {
        return DEPLOYMENT_CONFIG.roleLabels.teamManager
      }
      return isEn ? 'Supervisor' : 'Superviseur'
    }

    return isEn ? 'Manager' : 'Manager'
  }

  if (role === 'support_agent') {
    if (DEPLOYMENT_CONFIG.roleLabels.supportAgent) {
      return DEPLOYMENT_CONFIG.roleLabels.supportAgent
    }
    return isEn ? 'Support Agent' : 'Agent Support'
  }

  if (role === 'independent') {
    return isEn ? 'Independent' : 'Indépendant'
  }

  // Rôle member (commercial)
  if (DEPLOYMENT_CONFIG.roleLabels.member) {
    return DEPLOYMENT_CONFIG.roleLabels.member
  }
  return isEn ? 'Sales Rep' : 'Commercial'
}

/**
 * Couleurs associées aux badges de rôles
 */
export function getRoleBadgeStyle(role?: string | null, orgRole?: string | null): {
  bg: string
  color: string
} {
  if (role === 'admin') {
    return { bg: 'rgba(239,68,68,0.18)', color: '#ef4444' }
  }
  if (role === 'manager') {
    if (orgRole === 'executive') {
      return { bg: 'rgba(59,130,246,0.18)', color: '#3b82f6' } // Bleu direction
    }
    if (orgRole === 'senior_manager') {
      return { bg: 'rgba(139,92,246,0.18)', color: '#8b5cf6' } // Violet SM
    }
    return { bg: 'rgba(234,179,8,0.18)', color: '#eab308' } // Jaune/ambre TM
  }
  if (role === 'support_agent') {
    return { bg: 'rgba(235,133,18,0.18)', color: '#eb8512' } // Orange support
  }
  if (role === 'independent') {
    return { bg: 'rgba(34,197,94,0.18)', color: '#22c55e' } // Vert
  }
  return { bg: 'rgba(96,165,250,0.18)', color: '#3b82f6' } // Bleu commercial
}
