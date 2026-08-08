'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CrmClient, CustomerCall, CustomerTicket, CallStatus, TicketPriority } from '../types'
import type { CurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'

type Props = {
  client: CrmClient
  onClose: () => void
  user: CurrentUser | null
}

type DrawerTab = 'appels' | 'tickets' | 'historique'

export function ClientDrawer({ client, onClose, user }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<DrawerTab>('appels')
  const [calls, setCalls] = useState<CustomerCall[]>([])
  const [tickets, setTickets] = useState<CustomerTicket[]>([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)

  // Call log modal
  const [showCallModal, setShowCallModal] = useState(false)
  const [callStatus, setCallStatus] = useState<CallStatus>('connected')
  const [callNotes, setCallNotes] = useState('')
  const [savingCall, setSavingCall] = useState(false)

  // New ticket modal
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketDesc, setTicketDesc] = useState('')
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('medium')
  const [savingTicket, setSavingTicket] = useState(false)

  const callStatusLabels: Record<CallStatus, { label: string; color: string; emoji: string }> = {
    connected:  { label: t('crm.drawer.statusConnected'),  color: '#4ade80', emoji: '✅' },
    no_answer:  { label: t('crm.drawer.statusNoAnswer'), color: '#f59e0b', emoji: '📵' },
    busy:       { label: t('crm.drawer.statusBusy'),     color: '#f97316', emoji: '🔴' },
    voicemail:  { label: t('crm.drawer.statusVoicemail'),color: '#a78bfa', emoji: '📬' },
    failed:     { label: t('crm.drawer.statusFailed'),   color: '#f87171', emoji: '❌' }
  }

  const priorityLabels: Record<TicketPriority, { label: string; color: string }> = {
    low:    { label: t('crm.drawer.priorityLow'),    color: '#60a5fa' },
    medium: { label: t('crm.drawer.priorityMedium'), color: '#f59e0b' },
    high:   { label: t('crm.drawer.priorityHigh'),   color: '#f97316' },
    urgent: { label: t('crm.drawer.priorityUrgent'), color: '#f87171' }
  }

  const ticketStatusLabels: Record<string, string> = {
    open: t('crm.drawer.ticketOpen'),
    in_progress: t('crm.drawer.ticketInProgress'),
    resolved: t('crm.drawer.ticketResolved'),
    closed: t('crm.drawer.ticketClosed')
  }

  const fetchCalls = useCallback(async () => {
    if (!user || !client.id) return
    setLoadingCalls(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/crm/calls?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setCalls(await res.json())
    } finally { setLoadingCalls(false) }
  }, [user, client.id])

  const fetchTickets = useCallback(async () => {
    if (!user || !client.id) return
    setLoadingTickets(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/crm/tickets?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setTickets(await res.json())
    } finally { setLoadingTickets(false) }
  }, [user, client.id])

  useEffect(() => {
    void fetchCalls()
    void fetchTickets()
  }, [fetchCalls, fetchTickets])

  // ── Call trigger ─────────────────────────────────────────────────────────────
  function handleCallClick(type: 'tel' | 'whatsapp') {
    const phone = client.companyPhone?.replace(/\s+/g, '') || ''
    if (!phone) return
    const url = type === 'tel'
      ? `tel:${phone}`
      : `https://wa.me/${phone.replace('+', '')}`
    window.open(url, '_blank')
    setShowCallModal(true)
  }

  async function saveCall() {
    if (!user) return
    setSavingCall(true)
    try {
      const token = await user.getIdToken()
      await fetch('/api/crm/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          clientName: client.companyName,
          clientPhone: client.companyPhone || '',
          status: callStatus,
          notes: callNotes,
          callType: 'outgoing'
        })
      })
      setShowCallModal(false)
      setCallNotes('')
      setCallStatus('connected')
      void fetchCalls()
      setTab('appels')
    } finally { setSavingCall(false) }
  }

  async function saveTicket() {
    if (!user || !ticketSubject.trim()) return
    setSavingTicket(true)
    try {
      const token = await user.getIdToken()
      await fetch('/api/crm/tickets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          clientName: client.companyName,
          subject: ticketSubject,
          description: ticketDesc,
          priority: ticketPriority
        })
      })
      setShowTicketModal(false)
      setTicketSubject('')
      setTicketDesc('')
      setTicketPriority('medium')
      void fetchTickets()
      setTab('tickets')
    } finally { setSavingTicket(false) }
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`/api/crm/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      void fetchTickets()
    } catch (e) { console.error(e) }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[899] bg-black/45 backdrop-blur-[2px]"
      />

      {/* Drawer panel */}
      <div className="fixed bottom-0 right-0 top-0 z-[900] flex w-[min(480px,100vw)] flex-col overflow-hidden border-l border-border bg-card shadow-[-12px_0_60px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="border-b border-border bg-primary/5 p-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="m-0 font-['Syne',sans-serif] text-[18px] font-extrabold text-foreground">
                {client.companyName}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-3">
                {client.companyCity && (
                  <span className="text-[12px] text-muted-foreground">📍 {client.companyCity}</span>
                )}
                {client.companySector && (
                  <span className="text-[12px] text-muted-foreground">🏭 {client.companySector}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-transparent text-[16px] text-muted-foreground transition-colors hover:bg-secondary"
            >
              ×
            </button>
          </div>

          {/* Phone action buttons */}
          {client.companyPhone && (
            <div className="mt-3.5 flex gap-2">
              <button
                onClick={() => handleCallClick('tel')}
                className="cursor-pointer rounded-lg border border-blue-500/40 bg-blue-500/15 px-3.5 py-2 text-[12px] font-bold text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/25"
              >
                📞 {t('crm.drawer.call')}
              </button>
              <button
                onClick={() => handleCallClick('whatsapp')}
                className="cursor-pointer rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-[12px] font-bold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/25"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => setShowTicketModal(true)}
                className="cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-[12px] font-bold text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/25"
              >
                🎫 {t('crm.drawer.newTicket')}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: 'appels', label: `📞 ${t('crm.drawer.tabCalls')} (${calls.length})` },
            { id: 'tickets', label: `🎫 ${t('crm.drawer.tabSupport')} (${tickets.length})` },
            { id: 'historique', label: `📋 ${t('crm.drawer.tabHistory')}` }
          ] as const).map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex-1 border-b-2 px-2 py-3 text-[12px] transition-colors ${
                tab === tabItem.id
                  ? 'border-primary font-bold text-primary'
                  : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ── APPELS tab ── */}
          {tab === 'appels' && (
            <div className="flex flex-col gap-2.5">
              {loadingCalls ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground">{t('crm.drawer.loading')}</p>
              ) : calls.length === 0 ? (
                <EmptyState emoji="📞" msg={t('crm.drawer.noCalls')} sub={t('crm.drawer.noCallsSub')} />
              ) : calls.map(call => (
                <div key={call.id} className="rounded-xl border border-border bg-secondary/30 p-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-foreground">
                      {callStatusLabels[call.status]?.emoji} {callStatusLabels[call.status]?.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(call.createdAt).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {call.notes && (
                    <p className="m-0 text-[12px] leading-relaxed text-muted-foreground">{call.notes}</p>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground/70">
                    {call.agentName} · {call.clientPhone}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TICKETS tab ── */}
          {tab === 'tickets' && (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setShowTicketModal(true)}
                className="mb-1 cursor-pointer rounded-xl border border-dashed border-border p-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-secondary"
              >
                + {t('crm.drawer.openTicketBtn')}
              </button>
              {loadingTickets ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground">{t('crm.drawer.loading')}</p>
              ) : tickets.length === 0 ? (
                <EmptyState emoji="🎫" msg={t('crm.drawer.noTickets')} sub={t('crm.drawer.noTicketsSub')} />
              ) : tickets.map(ticket => (
                <div key={ticket.id} className="rounded-xl border border-border bg-secondary/30 p-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-foreground">{ticket.subject}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: `${priorityLabels[ticket.priority]?.color}22`,
                        color: priorityLabels[ticket.priority]?.color
                      }}
                    >
                      {priorityLabels[ticket.priority]?.label}
                    </span>
                  </div>
                  {ticket.description && (
                    <p className="mb-2 mt-0 text-[12px] leading-relaxed text-muted-foreground">{ticket.description}</p>
                  )}
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => {
                      const isActive = ticket.status === s
                      const statusColors: Record<string, string> = {
                        open: '#f87171', in_progress: '#f59e0b',
                        resolved: '#4ade80', closed: '#94a3b8'
                      }
                      return (
                        <button
                          key={s}
                          onClick={() => void updateTicketStatus(ticket.id, s)}
                          className="cursor-pointer rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors"
                          style={{
                            borderColor: isActive ? statusColors[s] : 'var(--border)',
                            background: isActive ? `${statusColors[s]}22` : 'transparent',
                            color: isActive ? statusColors[s] : 'var(--muted-foreground)'
                          }}
                        >
                          {ticketStatusLabels[s]}
                        </button>
                      )
                    })}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">
                    {new Date(ticket.createdAt).toLocaleDateString()} · {ticket.agentName}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── HISTORIQUE tab ── */}
          {tab === 'historique' && (
            <div className="flex flex-col gap-3">
              {[
                ...calls.map(c => ({ type: 'call' as const, date: c.createdAt, data: c })),
                ...tickets.map(t => ({ type: 'ticket' as const, date: t.createdAt, data: t }))
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] ${
                      item.type === 'call' ? 'bg-blue-500/15' : 'bg-amber-500/15'
                    }`}>
                      {item.type === 'call' ? '📞' : '🎫'}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-foreground">
                        {item.type === 'call'
                          ? `${t('crm.drawer.callEvent')} · ${callStatusLabels[(item.data as CustomerCall).status]?.label}`
                          : `${t('crm.drawer.ticketEvent')} · ${(item.data as CustomerTicket).subject}`}
                      </div>
                      {item.type === 'call' && (item.data as CustomerCall).notes && (
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {(item.data as CustomerCall).notes}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] text-muted-foreground/70">
                        {new Date(item.date).toLocaleString(undefined, {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              {calls.length === 0 && tickets.length === 0 && (
                <EmptyState emoji="📋" msg={t('crm.drawer.noHistory')} sub={t('crm.drawer.noHistorySub')} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Call log modal ────────────────────────────────────────────────── */}
      {showCallModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <h3 className="mb-1 text-[16px] font-extrabold text-foreground">
              📞 {t('crm.drawer.callModalTitle')} {client.companyName}
            </h3>
            <p className="mb-4 text-[13px] text-muted-foreground">
              {client.companyPhone} · {t('crm.drawer.qualifyCall')}
            </p>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('crm.drawer.callResultLabel')}
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.entries(callStatusLabels) as [CallStatus, typeof callStatusLabels[CallStatus]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setCallStatus(key)}
                  className="cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    borderColor: callStatus === key ? val.color : 'var(--border)',
                    background: callStatus === key ? `${val.color}22` : 'transparent',
                    color: callStatus === key ? val.color : 'var(--muted-foreground)'
                  }}
                >
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('crm.drawer.notesLabel')}
            </label>
            <textarea
              placeholder={t('crm.drawer.notesPlaceholder')}
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              rows={4}
              className="mb-4 w-full rounded-lg border border-border bg-background p-3 text-[13px] text-foreground outline-none focus:border-primary"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowCallModal(false)}
                className="cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void saveCall()}
                disabled={savingCall}
                className="flex-1 cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {savingCall ? t('crm.drawer.saving') : `✓ ${t('crm.drawer.saveCall')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New ticket modal ──────────────────────────────────────────────── */}
      {showTicketModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <h3 className="mb-1 text-[16px] font-extrabold text-foreground">
              🎫 {t('crm.drawer.newTicketModalTitle')}
            </h3>
            <p className="mb-4 text-[13px] text-muted-foreground">
              {t('crm.drawer.forCompany')} {client.companyName}
            </p>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('crm.drawer.subjectLabel')}
            </label>
            <input
              placeholder={t('crm.drawer.subjectPlaceholder')}
              value={ticketSubject}
              onChange={e => setTicketSubject(e.target.value)}
              className="mb-3 w-full rounded-lg border border-border bg-background p-2.5 text-[13px] text-foreground outline-none focus:border-primary"
            />

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('crm.drawer.descLabel')}
            </label>
            <textarea
              placeholder={t('crm.drawer.descPlaceholder')}
              value={ticketDesc}
              onChange={e => setTicketDesc(e.target.value)}
              rows={3}
              className="mb-3 w-full rounded-lg border border-border bg-background p-2.5 text-[13px] text-foreground outline-none focus:border-primary"
            />

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('crm.drawer.priorityLabel')}
            </label>
            <div className="mb-4 flex gap-2">
              {(Object.entries(priorityLabels) as [TicketPriority, typeof priorityLabels[TicketPriority]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setTicketPriority(key)}
                  className="flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors"
                  style={{
                    borderColor: ticketPriority === key ? val.color : 'var(--border)',
                    background: ticketPriority === key ? `${val.color}22` : 'transparent',
                    color: ticketPriority === key ? val.color : 'var(--muted-foreground)'
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTicketModal(false)}
                className="cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void saveTicket()}
                disabled={savingTicket || !ticketSubject.trim()}
                className="flex-1 cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {savingTicket ? t('crm.drawer.creating') : `+ ${t('crm.drawer.createTicket')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EmptyState({ emoji, msg, sub }: { emoji: string; msg: string; sub: string }) {
  return (
    <div className="py-8 px-4 text-center text-muted-foreground">
      <div className="mb-2 text-[32px]">{emoji}</div>
      <p className="mb-1 mt-0 text-[14px] font-semibold text-foreground">{msg}</p>
      <p className="m-0 text-[12px]">{sub}</p>
    </div>
  )
}
