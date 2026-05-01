'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firestore } from '@/services/firebase/client'
import {
  collection, query, orderBy, limit, getDocs,
  doc, updateDoc, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { colors } from '@/styles/tokens'

type Thread = {
  id: string
  subject?: string
  userName?: string
  userEmail?: string
  status?: 'open' | 'resolved' | 'closed'
  lastMessage?: string
  updatedAt?: Timestamp
  unreadByAdmin?: boolean
}

type Message = {
  id: string
  content: string
  senderRole: 'user' | 'admin'
  createdAt?: Timestamp
}

const STATUS_LABEL: Record<string, string> = { open: 'En cours', resolved: 'Résolu', closed: 'Fermé' }
const STATUS_COLOR: Record<string, string> = { open: '#1E88E5', resolved: '#43A047', closed: '#9E9E9E' }

export default function AdminSupportPage() {
  const { user } = useCurrentUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => { if (user) loadThreads() }, [user])

  async function loadThreads() {
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(firestore, 'support_threads'), orderBy('updatedAt', 'desc'), limit(50))
      )
      setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) })))
    } finally { setLoading(false) }
  }

  async function openThread(thread: Thread) {
    setSelected(thread)
    setMessages([])
    setReplyText('')
    await updateDoc(doc(firestore, 'support_threads', thread.id), { unreadByAdmin: false })
    const snap = await getDocs(
      query(collection(firestore, 'support_threads', thread.id, 'messages'), orderBy('createdAt', 'asc'))
    )
    setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })))
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setSending(true)
    try {
      const now = serverTimestamp()
      await addDoc(collection(firestore, 'support_threads', selected.id, 'messages'), {
        content: replyText.trim(), senderId: 'admin', senderRole: 'admin', createdAt: now,
      })
      await updateDoc(doc(firestore, 'support_threads', selected.id), {
        lastMessage: replyText.trim().slice(0, 80), updatedAt: now,
        unreadByUser: true, unreadByAdmin: false, status: 'open',
      })
      setReplyText('')
      await openThread(selected)
    } finally { setSending(false) }
  }

  async function resolveThread() {
    if (!selected) return
    await updateDoc(doc(firestore, 'support_threads', selected.id), {
      status: 'resolved', updatedAt: serverTimestamp(),
    })
    await loadThreads()
    setSelected(null)
  }

  const fmtDate = (ts?: Timestamp) =>
    ts?.toDate ? ts.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <AppShell>
      <PageHeader title="Support" subtitle={`${threads.length} ticket${threads.length !== 1 ? 's' : ''}`} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Thread list */}
        <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, maxHeight: 640, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>Tickets</span>
            <button onClick={loadThreads} style={{ background: colors.greenLight, color: colors.green, border: `1px solid ${colors.successBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ↻ Actualiser
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>Chargement...</div>
            ) : threads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>Aucun ticket.
              </div>
            ) : threads.map((t) => {
              const status = t.status ?? 'open'
              const color = STATUS_COLOR[status] ?? STATUS_COLOR.open
              return (
                <button key={t.id} onClick={() => openThread(t)} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, background: selected?.id === t.id ? colors.greenLight : t.unreadByAdmin ? '#FFF8E1' : 'transparent', border: 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: colors.text }}>
                      {t.subject ?? '—'}{t.unreadByAdmin && <span style={{ display: 'inline-block', width: 7, height: 7, background: '#E53935', borderRadius: '50%', verticalAlign: 'middle', marginLeft: 6 }} />}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${color}22`, color }}>{STATUS_LABEL[status] ?? status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMid, marginBottom: 2 }}>👤 {t.userName || t.userEmail || '—'}</div>
                  <div style={{ fontSize: 12, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lastMessage ?? ''}</div>
                  <div style={{ fontSize: 11, color: colors.textDim, marginTop: 3 }}>{fmtDate(t.updatedAt)}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Thread detail */}
        <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, maxHeight: 640, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 14, color: colors.text }}>
            {selected ? (selected.subject ?? 'Détail') : 'Sélectionnez un ticket'}
          </div>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMid, fontSize: 13 }}>← Sélectionnez un ticket</div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map((m) => {
                  const isUser = m.senderRole === 'user'
                  const time = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end' }}>
                      <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '4px 14px 14px 14px' : '14px 4px 14px 14px', background: isUser ? colors.bg3 : colors.green, color: isUser ? colors.text : '#fff', fontSize: 13, lineHeight: 1.6 }}>{m.content}</div>
                      <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{isUser ? '👤 Utilisateur' : '🎧 Admin'} · {time}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Votre réponse… (Ctrl+Entrée pour envoyer)" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }} style={{ flex: 1, padding: '10px 12px', border: `1.5px solid ${colors.border}`, borderRadius: 8, fontSize: 13, resize: 'none', minHeight: 60, fontFamily: 'inherit', outline: 'none' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={sendReply} disabled={sending || !replyText.trim()} style={{ padding: '10px 16px', background: colors.green, color: '#fff', border: 'none', borderRadius: 8, cursor: sending ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit', opacity: !replyText.trim() ? 0.5 : 1 }}>
                    Envoyer
                  </button>
                  {selected.status !== 'resolved' && (
                    <button onClick={resolveThread} style={{ padding: '8px 12px', background: colors.greenLight, color: colors.green, border: `1px solid ${colors.successBorder}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                      ✅ Résoudre
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
