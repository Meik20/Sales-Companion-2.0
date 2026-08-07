export const roles = ['admin', 'manager', 'member', 'independent', 'support_agent'] as const
export type UserRole = (typeof roles)[number]
