export const roles = ['admin', 'manager', 'member', 'independent'] as const
export type UserRole = (typeof roles)[number]