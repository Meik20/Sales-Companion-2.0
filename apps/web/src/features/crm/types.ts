export type CrmClientStatus =
  | 'new'
  | 'to_contact'
  | 'contacted'
  | 'in_discussion'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'imported'

export const CRM_STATUS_CONFIG: Record<
  CrmClientStatus,
  { labelKey: string; color: string; bg: string; border: string; emoji: string }
> = {
  new: {
    labelKey: 'crm.statusNew',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.25)',
    emoji: '🔵'
  },
  to_contact: {
    labelKey: 'crm.statusToContact',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.25)',
    emoji: '🟡'
  },
  contacted: {
    labelKey: 'crm.statusContacted',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.25)',
    emoji: '🟡'
  },
  in_discussion: {
    labelKey: 'crm.statusInDiscussion',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.25)',
    emoji: '🟠'
  },
  proposal_sent: {
    labelKey: 'crm.statusProposalSent',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.25)',
    emoji: '🟣'
  },
  won: {
    labelKey: 'crm.statusWon',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.25)',
    emoji: '🟢'
  },
  lost: {
    labelKey: 'crm.statusLost',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.25)',
    emoji: '🔴'
  },
  imported: {
    labelKey: 'crm.statusImported',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.25)',
    emoji: '⚪'
  }
}

export type CrmActivityType =
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'meeting'
  | 'note'
  | 'proposal'
  | 'status_change'

export type CrmActivity = {
  id: string
  clientId: string
  type: CrmActivityType
  title: string
  description?: string
  performedBy?: string
  performedByName?: string
  createdAt: string
}

export type CrmClient = {
  id: string
  companyName: string
  contactName?: string
  phone?: string
  companyPhone?: string
  email?: string
  companyEmail?: string
  address?: string
  city?: string
  companyCity?: string
  postalCode?: string
  country?: string
  sector?: string
  companySector?: string
  status: CrmClientStatus | string
  owner?: string
  ownerName?: string
  managerUid?: string
  managerId?: string
  userId?: string
  memberName?: string
  lastActivityAt?: string
  lastActivityType?: CrmActivityType
  lastActivityTitle?: string
  nextAction?: string
  nextActionAt?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  _source?: 'pipeline' | 'imported' | 'crm_clients'
}

export type CallStatus = 'connected' | 'no_answer' | 'busy' | 'voicemail' | 'failed'

export type CustomerCall = {
  id: string
  agentUid: string
  agentName: string
  clientId: string
  clientName: string
  clientPhone: string
  status: CallStatus
  notes: string
  callType: 'incoming' | 'outgoing'
  durationSeconds: number
  createdAt: string
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type CustomerTicket = {
  id: string
  clientId: string
  clientName: string
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  agentUid: string
  agentName: string
  createdAt: string
  updatedAt: string
}
