export type CrmClient = {
  id: string
  companyName: string
  companyCity?: string
  companySector?: string
  companyPhone?: string
  companyEmail?: string
  managerUid?: string
  userId?: string
  memberName?: string
  status: string
  notes?: string
  createdAt?: string
  updatedAt?: string
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
