'use client'

import { useState, useEffect, useCallback } from 'react'
import { colors } from '@/styles/tokens'
import type { CrmClient, CustomerCall, CustomerTicket, CallStatus, TicketPriority } from '../types'
import type { CurrentUser } from '@/hooks/useCurrentUser'

type Props = {
  client: CrmClient
  onClose: () => void
  user: CurrentUser | null
}

type DrawerTab = 'appels' | 'tickets' | 'historique'

const CALL_STATUS_LABELS: Record<CallStatus, { label: string; color: string; emoji: string }> = {
  connected:  { label: 'Décroché',    color: '#4ade80', emoji: '✅' },
  no_answer:  { label: 'Non joint',   color: '#f59e0b', emoji: '📵' },
  busy:       { label: 'Occupé',      color: '#f97316', emoji: '🔴' },
  voicemail:  { label: 'Répondeur',   color: '#a78bfa', emoji: '📬' },
  failed:     { label: 'Échec',       color: '#f87171', emoji: '❌' }
}

const PRIORITY_LABELS: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Basse',   color: '#60a5fa' },
  medium: { label: 'Moyenne', color: '#f59e0b' },
  high:   { label: 'Haute',   color: '#f97316' },
  urgent: { label: 'Urgente', color: '#f87171' }
}

export function ClientDrawer({ client, onClose, user }: Props) {
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

  const drawerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(480px, 100vw)',
    background: colors.bg2,
    borderLeft: `1px solid ${colors.border}`,
    boxShadow: '-12px 0 60px rgba(0,0,0,0.4)',
    zIndex: 900,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 899, backdropFilter: 'blur(2px)'
        }}
      />

      {/* Drawer panel */}
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${colors.border}`,
          background: 'rgba(55,138,221,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{
                margin: 0, fontSize: 18, fontWeight: 800, color: colors.text,
                fontFamily: "'Syne',sans-serif"
              }}>
                {client.companyName}
              </h2>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {client.companyCity && (
                  <span style={{ fontSize: 12, color: colors.textMid }}>📍 {client.companyCity}</span>
                )}
                {client.companySector && (
                  <span style={{ fontSize: 12, color: colors.textMid }}>🏭 {client.companySector}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `1px solid ${colors.border}`,
                background: 'transparent', cursor: 'pointer',
                color: colors.textMid, fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >×</button>
          </div>

          {/* Phone action buttons */}
          {client.companyPhone && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => handleCallClick('tel')}
                style={callBtn('#185FA5')}
              >
                📞 Appeler
              </button>
              <button
                onClick={() => handleCallClick('whatsapp')}
                style={callBtn('#25D366')}
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => setShowTicketModal(true)}
                style={callBtn('#f59e0b')}
              >
                🎫 Nouveau ticket
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
          {([
            { id: 'appels', label: `📞 Appels (${calls.length})` },
            { id: 'tickets', label: `🎫 SAV (${tickets.length})` },
            { id: 'historique', label: '📋 Historique' }
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '12px 8px',
                border: 'none', borderBottom: tab === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: 'transparent', cursor: 'pointer',
                color: tab === t.id ? 'var(--color-accent)' : colors.textMid,
                fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                fontFamily: 'inherit', transition: 'all 150ms'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* ── APPELS tab ── */}
          {tab === 'appels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingCalls ? (
                <p style={{ color: colors.textMid, fontSize: 13, textAlign: 'center' }}>Chargement…</p>
              ) : calls.length === 0 ? (
                <EmptyState emoji="📞" msg="Aucun appel enregistré" sub="Cliquez sur 'Appeler' pour initier un appel" />
              ) : calls.map(call => (
                <div key={call.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                      {CALL_STATUS_LABELS[call.status]?.emoji} {CALL_STATUS_LABELS[call.status]?.label}
                    </span>
                    <span style={{ fontSize: 11, color: colors.textDim }}>
                      {new Date(call.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {call.notes && (
                    <p style={{ fontSize: 12, color: colors.textMid, margin: 0, lineHeight: 1.5 }}>{call.notes}</p>
                  )}
                  <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4 }}>
                    Par {call.agentName} · {call.clientPhone}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TICKETS tab ── */}
          {tab === 'tickets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowTicketModal(true)}
                style={{
                  padding: '10px 16px', borderRadius: 10, border: `1px dashed ${colors.border}`,
                  background: 'transparent', cursor: 'pointer', color: 'var(--color-accent)',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit', marginBottom: 4
                }}
              >
                + Ouvrir un nouveau ticket SAV
              </button>
              {loadingTickets ? (
                <p style={{ color: colors.textMid, fontSize: 13, textAlign: 'center' }}>Chargement…</p>
              ) : tickets.length === 0 ? (
                <EmptyState emoji="🎫" msg="Aucun ticket ouvert" sub="Créez un ticket pour suivre une réclamation" />
              ) : tickets.map(ticket => (
                <div key={ticket.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{ticket.subject}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: `${PRIORITY_LABELS[ticket.priority]?.color}22`,
                      color: PRIORITY_LABELS[ticket.priority]?.color
                    }}>
                      {PRIORITY_LABELS[ticket.priority]?.label}
                    </span>
                  </div>
                  {ticket.description && (
                    <p style={{ fontSize: 12, color: colors.textMid, margin: '0 0 8px', lineHeight: 1.5 }}>{ticket.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => {
                      const isActive = ticket.status === s
                      const statusColors: Record<string, string> = {
                        open: '#f87171', in_progress: '#f59e0b',
                        resolved: '#4ade80', closed: '#94a3b8'
                      }
                      const statusLabels: Record<string, string> = {
                        open: 'Ouvert', in_progress: 'En cours',
                        resolved: 'Résolu', closed: 'Fermé'
                      }
                      return (
                        <button
                          key={s}
                          onClick={() => void updateTicketStatus(ticket.id, s)}
                          style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                            cursor: isActive ? 'default' : 'pointer', fontFamily: 'inherit',
                            border: `1px solid ${isActive ? statusColors[s] : colors.border}`,
                            background: isActive ? `${statusColors[s]}22` : 'transparent',
                            color: isActive ? statusColors[s] : colors.textDim,
                            transition: 'all 150ms'
                          }}
                        >
                          {statusLabels[s]}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textDim }}>
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR')} · Par {ticket.agentName}
                  </div>
                </div>
              ))}

            </div>
          )}

          {/* ── HISTORIQUE tab ── */}
          {tab === 'historique' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Merge calls and tickets into a timeline */}
              {[
                ...calls.map(c => ({ type: 'call' as const, date: c.createdAt, data: c })),
                ...tickets.map(t => ({ type: 'ticket' as const, date: t.createdAt, data: t }))
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: item.type === 'call' ? 'rgba(55,138,221,0.15)' : 'rgba(245,158,11,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0
                    }}>
                      {item.type === 'call' ? '📞' : '🎫'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        {item.type === 'call'
                          ? `Appel · ${CALL_STATUS_LABELS[(item.data as CustomerCall).status]?.label}`
                          : `Ticket · ${(item.data as CustomerTicket).subject}`}
                      </div>
                      {item.type === 'call' && (item.data as CustomerCall).notes && (
                        <p style={{ fontSize: 12, color: colors.textMid, margin: '2px 0 0' }}>
                          {(item.data as CustomerCall).notes}
                        </p>
                      )}
                      <div style={{ fontSize: 11, color: colors.textDim, marginTop: 3 }}>
                        {new Date(item.date).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              {calls.length === 0 && tickets.length === 0 && (
                <EmptyState emoji="📋" msg="Aucun historique" sub="Les appels et tickets apparaîtront ici" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Call log modal ────────────────────────────────────────────────── */}
      {showCallModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: colors.text }}>
              📞 Appel avec {client.companyName}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.textMid }}>
              {client.companyPhone} · Qualifiez l'appel
            </p>

            <label style={labelStyle}>Résultat de l'appel</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {(Object.entries(CALL_STATUS_LABELS) as [CallStatus, typeof CALL_STATUS_LABELS[CallStatus]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setCallStatus(key)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                    border: `1px solid ${callStatus === key ? val.color : colors.border}`,
                    background: callStatus === key ? `${val.color}22` : 'transparent',
                    color: callStatus === key ? val.color : colors.textMid
                  }}
                >
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>

            <label style={labelStyle}>Notes / Compte-rendu</label>
            <textarea
              placeholder="Résumez l'échange en quelques mots…"
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                borderRadius: 8, border: `1px solid ${colors.border}`,
                background: colors.bg, color: colors.text, fontSize: 13,
                fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: 16
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCallModal(false)} style={secondaryBtn}>
                Annuler
              </button>
              <button onClick={() => void saveCall()} disabled={savingCall} style={primaryBtn}>
                {savingCall ? 'Enregistrement…' : '✓ Enregistrer l\'appel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New ticket modal ──────────────────────────────────────────────── */}
      {showTicketModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: colors.text }}>
              🎫 Nouveau Ticket SAV
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.textMid }}>
              Pour {client.companyName}
            </p>

            <label style={labelStyle}>Sujet *</label>
            <input
              placeholder="Ex: Problème de facturation"
              value={ticketSubject}
              onChange={e => setTicketSubject(e.target.value)}
              style={{ ...inputStyle, marginBottom: 12 }}
            />

            <label style={labelStyle}>Description</label>
            <textarea
              placeholder="Décrivez le problème en détail…"
              value={ticketDesc}
              onChange={e => setTicketDesc(e.target.value)}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                borderRadius: 8, border: `1px solid ${colors.border}`,
                background: colors.bg, color: colors.text, fontSize: 13,
                fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: 12
              }}
            />

            <label style={labelStyle}>Priorité</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(Object.entries(PRIORITY_LABELS) as [TicketPriority, typeof PRIORITY_LABELS[TicketPriority]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setTicketPriority(key)}
                  style={{
                    flex: 1, padding: '7px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
                    border: `1px solid ${ticketPriority === key ? val.color : colors.border}`,
                    background: ticketPriority === key ? `${val.color}22` : 'transparent',
                    color: ticketPriority === key ? val.color : colors.textMid
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowTicketModal(false)} style={secondaryBtn}>
                Annuler
              </button>
              <button
                onClick={() => void saveTicket()}
                disabled={savingTicket || !ticketSubject.trim()}
                style={primaryBtn}
              >
                {savingTicket ? 'Création…' : '+ Créer le ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: '12px 14px'
}
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
}
const modalCard: React.CSSProperties = {
  background: colors.bg2, border: `1px solid ${colors.border}`,
  borderRadius: 16, padding: 24, width: '100%', maxWidth: 440,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: colors.textMid,
  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6
}
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  borderRadius: 8, border: `1px solid ${colors.border}`,
  background: colors.bg, color: colors.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none'
}
const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 16px', borderRadius: 8,
  background: 'var(--color-primary)', border: 'none',
  color: '#fff', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms'
}
const secondaryBtn: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 8,
  background: 'transparent', border: `1px solid ${colors.border}`,
  color: colors.textMid, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit'
}

function callBtn(color: string): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 8, border: `1px solid ${color}`,
    background: `${color}18`, color, fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms'
  }
}

function EmptyState({ emoji, msg, sub }: { emoji: string; msg: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 16px', color: colors.textMid }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
      <p style={{ fontWeight: 600, color: colors.text, margin: '0 0 4px', fontSize: 14 }}>{msg}</p>
      <p style={{ fontSize: 12, margin: 0 }}>{sub}</p>
    </div>
  )
}
