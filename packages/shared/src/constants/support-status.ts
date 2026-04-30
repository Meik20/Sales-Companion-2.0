export const supportStatuses = ['open', 'resolved', 'closed'] as const
export type SupportStatus = (typeof supportStatuses)[number]