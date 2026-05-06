'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firestore } from '@/services/firebase/client'
import {
  collection, query, orderBy, limit, getDocs,
  doc, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { colors } from '@/styles/tokens'
import { Trash2 } from 'lucide-react'

type Thread = {
  id: string
  subject?: string
  userName?: string
  userEmail?: string
  userId?: string        // ← identifiant Firebase UID de l'utilisateur
  status?: 'open' | 'resolved' | 'closed'
  lastMessage?: string
  updatedAt?: Timestamp
  unreadByAdmin?: boolean
  type?: string
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
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')

  // Debounce search term (500ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => { if (user?.uid) loadThreads() }, [user?.uid])

  async function loadThreads() {
    setLoading(true)
    setError(null)
    try {
      const snap = await getDocs(
        query(collection(firestore, 'support_threads'), orderBy('updatedAt', 'desc'), limit(200))
      )
      setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) })))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement'
      setError(msg)
      console.error('Failed to load threads:', err)
    } finally { setLoading(false) }
  }

  async function openThread(thread: Thread) {
    setSelected(thread)
    setMessages([])
    setReplyText('')
    setError(null)
    try {
      await updateDoc(doc(firestore, 'support_threads', thread.id), { unreadByAdmin: false })
      const snap = await getDocs(
        query(collection(firestore, 'support_threads', thread.id, 'messages'), orderBy('createdAt', 'asc'))
      )
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'ouverture du ticket'
      setError(msg)
      console.error('Failed to open thread:', err)
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setSending(true)
    setError(null)
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi'
      setError(msg)
      console.error('Failed to send reply:', err)
    } finally { setSending(false) }
  }

  async function handleDeleteThread(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement ce ticket et tous ses messages ?')) return

    try {
      // 1. Delete messages
      const messagesSnap = await getDocs(collection(firestore, 'support_threads', id, 'messages'))
      const deletePromises = messagesSnap.docs.map(d => deleteDoc(d.ref))
      await Promise.all(deletePromises)

      // 2. Delete thread
      await deleteDoc(doc(firestore, 'support_threads', id))

      if (selected?.id === id) setSelected(null)
      await loadThreads()
    } catch (err) {
      console.error('Failed to delete thread:', err)
      setError('Erreur lors de la suppression du ticket.')
    }
  }

  async function resolveThread() {
    if (!selected) return
    setError(null)
    try {
      await updateDoc(doc(firestore, 'support_threads', selected.id), {
        status: 'resolved', updatedAt: serverTimestamp(),
      })
      setSelected((prev) => prev ? { ...prev, status: 'resolved' } : null)
      await loadThreads()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la résolution'
      setError(msg)
      console.error('Failed to resolve thread:', err)
    }
  }

  const fmtDate = (ts?: Timestamp) =>
    ts?.toDate ? ts.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  // Filtrage local avec debounced search
  const filteredThreads = threads.filter((t) => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus || (filterStatus === 'open' && !t.status)
    const term = debouncedSearch.toLowerCase()
    const matchSearch = !term || (t.subject ?? '').toLowerCase().includes(term)
      || (t.userName ?? '').toLowerCase().includes(term)
      || (t.userEmail ?? '').toLowerCase().includes(term)
      || (t.userId ?? '').toLowerCase().includes(term)
    return matchStatus && matchSearch
  })

  const unreadCount = threads.filter((t) => t.unreadByAdmin).length

  return (
    <AppShell>
      <PageHeader
        title="Support"
        subtitle={`${threads.length} ticket${threads.length !== 1 ? 's' : ''}${unreadCount > 0 ? ` · ${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : ''}`}
      />

      {/* Message d'erreur */}
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 8,
          background: 'rgba(229, 57, 53, 0.1)', border: '1px solid #E53935',
          color: '#C62828', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{
            background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: 16
          }}>×</button>
        </div>
      )}

      {/* Barre de recherche + filtre statut */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par sujet, nom, email, ID…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1, minWidth: 200, height: 38, padding: '0 12px',
            border: `1px solid ${colors.border}`, borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', background: colors.surface,
            color: colors.text, outline: 'none',
          }}
        />
        {(['all', 'open', 'resolved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              height: 38, padding: '0 14px', borderRadius: 8,
              border: `1px solid ${filterStatus === s ? 'rgba(46,160,90,0.5)' : colors.border}`,
              background: filterStatus === s ? 'rgba(27,122,62,0.12)' : colors.surface,
              color: filterStatus === s ? colors.green : colors.textMid,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {s === 'all' ? 'Tous' : s === 'open' ? '🔵 En cours' : '✅ Résolus'}
          </button>
        ))}
        <button
          onClick={loadThreads}
          style={{
            height: 38, padding: '0 14px',
            background: colors.greenLight, color: colors.green,
            border: `1px solid ${colors.successBorder}`, borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ↻ Actualiser
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Liste des threads ─────────────────────────────────────── */}
        <div style={{
          background: colors.surface, borderRadius: 12,
          border: `1px solid ${colors.border}`, maxHeight: 680,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontSize: 12, color: colors.textMid }}>
            {filteredThreads.length} ticket{filteredThreads.length !== 1 ? 's' : ''} affichés
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>Chargement...</div>
            ) : filteredThreads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                Aucun ticket trouvé.
              </div>
            ) : filteredThreads.map((t) => {
              const status = t.status ?? 'open'
              const color = STATUS_COLOR[status] ?? STATUS_COLOR.open
              return (
                <button
                  key={t.id}
                  onClick={() => openThread(t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '13px 16px',
                    borderBottom: `1px solid ${colors.border}`,
                    background: selected?.id === t.id
                      ? colors.greenLight
                      : t.unreadByAdmin ? '#FFFDE7' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    transition: 'background 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: colors.text, flex: 1, paddingRight: 8 }}>
                      {t.subject ?? '—'}
                      {t.unreadByAdmin && (
                        <span style={{
                          display: 'inline-block', width: 7, height: 7,
                          background: '#E53935', borderRadius: '50%',
                          verticalAlign: 'middle', marginLeft: 6,
                        }} />
                      )}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 4, background: `${color}22`, color,
                      flexShrink: 0,
                    }}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: colors.textMid, marginBottom: 2 }}>
                    👤 {t.userName || t.userEmail || '—'}
                  </div>
                  {t.lastMessage && (
                    <div style={{
                      fontSize: 11.5, color: colors.textDim,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: 280,
                    }}>
                      {t.lastMessage}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 10.5, color: colors.textDim }}>
                      {fmtDate(t.updatedAt)}
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(e, t.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: colors.textDim, padding: 4, borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = colors.textDim)}
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Panneau de détail ─────────────────────────────────────── */}
        <div style={{
          background: colors.surface, borderRadius: 12,
          border: `1px solid ${colors.border}`, maxHeight: 680,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMid, fontSize: 13, padding: 40 }}>
              ← Cliquez sur un ticket pour lire le message
            </div>
          ) : (
            <>
              {/* En-tête du ticket */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, background: colors.bg2 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 10 }}>
                  {selected.subject ?? 'Ticket'}
                </div>

                {/* Fiche utilisateur */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 8, padding: '10px 12px',
                  background: 'rgba(27,122,62,0.06)',
                  border: '1px solid rgba(46,160,90,0.2)',
                  borderRadius: 8,
                }}>
                  {/* UID */}
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                      Identifiant (UID)
                    </div>
                    <div style={{
                      fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600,
                      color: colors.text, wordBreak: 'break-all',
                      padding: '2px 6px', background: colors.bg3,
                      borderRadius: 4, border: `1px solid ${colors.border}`,
                      cursor: 'copy',
                    }}
                      onClick={() => navigator.clipboard.writeText(selected.userId ?? '')}
                      title="Cliquer pour copier l'ID"
                    >
                      {selected.userId ?? '—'}
                    </div>
                  </div>
                  {/* Nom */}
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                      Nom
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                      {selected.userName || '—'}
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                      Email
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMid }}>
                      {selected.userEmail || '—'}
                    </div>
                  </div>
                  {/* Statut */}
                  <div>
                    <div style={{ fontSize: 10, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                      Statut
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: `${STATUS_COLOR[selected.status ?? 'open']}22`,
                      color: STATUS_COLOR[selected.status ?? 'open'],
                    }}>
                      {STATUS_LABEL[selected.status ?? 'open']}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: colors.textMid, fontSize: 13 }}>
                    Aucun message dans ce ticket.
                  </div>
                ) : messages.map((m) => {
                  const isUser = m.senderRole === 'user'
                  const time = m.createdAt?.toDate
                    ? m.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : ''
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '78%', padding: '10px 14px',
                        borderRadius: isUser ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                        background: isUser ? colors.bg3 : colors.green,
                        color: isUser ? colors.text : '#fff',
                        fontSize: 13, lineHeight: 1.65,
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10.5, color: colors.textDim, marginTop: 3 }}>
                        {isUser ? `👤 ${selected.userName || 'Utilisateur'}` : '🎧 Support'} · {time}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Zone de réponse */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Votre réponse… (Ctrl+Entrée pour envoyer)"
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void sendReply() }}
                  style={{
                    flex: 1, padding: '10px 12px',
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: 8, fontSize: 13, resize: 'none',
                    minHeight: 64, fontFamily: 'inherit', outline: 'none',
                    background: colors.bg2, color: colors.text,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={() => void sendReply()}
                    disabled={sending || !replyText.trim()}
                    style={{
                      padding: '10px 16px', background: colors.green,
                      color: '#fff', border: 'none', borderRadius: 8,
                      cursor: sending ? 'wait' : 'pointer',
                      fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                      opacity: !replyText.trim() ? 0.5 : 1,
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    {sending ? '⏳' : '↑ Envoyer'}
                  </button>
                  {selected.status !== 'resolved' && (
                    <button
                      onClick={() => void resolveThread()}
                      style={{
                        padding: '8px 12px', background: colors.greenLight,
                        color: colors.green,
                        border: `1px solid ${colors.successBorder}`,
                        borderRadius: 8, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}
                    >
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
