'use client'

import { useState, useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firestore } from '@/services/firebase/client'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { colors } from '@/styles/tokens'

type Thread = {
  id: string
  subject: string
  status: 'open' | 'resolved' | 'closed'
  createdAt?: Timestamp
  updatedAt?: Timestamp
  lastMessage?: string
  unreadByUser?: boolean
}

type Message = {
  id: string
  content: string
  senderId: string
  senderRole: 'user' | 'admin'
  createdAt?: Timestamp
}

const STATUS_COLOR: Record<string, string> = {
  open: colors.green,
  resolved: '#43A047',
  closed: '#9E9E9E',
}
const STATUS_LABEL: Record<string, string> = {
  open: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
}

function fmtTime(ts?: Timestamp) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function SupportPage() {
  const { user } = useCurrentUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [creating, setCreating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedThread = threads.find((t) => t.id === selectedId)

  // Real-time threads listener
  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(firestore, 'support_threads'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    )
    return onSnapshot(q, (snap) => {
      setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) })))
    })
  }, [user?.uid])

  // Real-time messages listener for selected thread
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    const q = query(
      collection(firestore, 'support_threads', selectedId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })))
      // Mark as read
      updateDoc(doc(firestore, 'support_threads', selectedId), { unreadByUser: false }).catch(() => {})
    })
  }, [selectedId])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto select first thread on load
  useEffect(() => {
    if (threads.length > 0 && !selectedId) {
      const first = threads[0]
      if (first) setSelectedId(first.id)
    }
  }, [threads, selectedId])

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newSubject.trim()) return
    setCreating(true)
    try {
      const now = serverTimestamp()
      const ref = await addDoc(collection(firestore, 'support_threads'), {
        userId: user.uid,
        userEmail: user.email ?? '',
        userName: user.name ?? user.email ?? 'Utilisateur',
        subject: newSubject.trim(),
        status: 'open',
        createdAt: now,
        updatedAt: now,
        lastMessage: '',
        unreadByAdmin: true,
        unreadByUser: false,
      })
      setSelectedId(ref.id)
      setNewSubject('')
      setShowNew(false)
    } catch (err) {
      console.error('Failed to create thread:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleSend() {
    if (!selectedId || !inputText.trim() || sending || !user) return
    if (selectedThread?.status !== 'open') return
    const text = inputText.trim()
    setInputText('')
    setSending(true)
    try {
      const now = serverTimestamp()
      await addDoc(collection(firestore, 'support_threads', selectedId, 'messages'), {
        content: text,
        senderId: user.uid,
        senderRole: 'user',
        createdAt: now,
      })
      await updateDoc(doc(firestore, 'support_threads', selectedId), {
        lastMessage: text.slice(0, 80),
        updatedAt: now,
        unreadByAdmin: true,
        unreadByUser: false,
      })
    } catch (err) {
      console.error('Failed to send message:', err)
      setInputText(text) // restore if failed
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const isClosed = selectedThread?.status !== 'open'

  return (
    <AppShell>
      <style dangerouslySetInnerHTML={{ __html: `
        .support-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          height: calc(100dvh - 120px);
          min-height: 500px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid ${colors.border};
          background: ${colors.surface};
        }
        @media (max-width: 768px) {
          .support-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          .thread-list-col { display: ${selectedId ? 'none' : 'flex'}; }
          .chat-col { display: ${selectedId ? 'flex' : 'none'}; }
        }
        .thread-item:hover { background: ${colors.bg3}; }
        .thread-item.active { background: ${colors.greenLight}; }
        .msg-bubble-user {
          background: ${colors.green};
          color: #fff;
          border-radius: 18px 18px 4px 18px;
          align-self: flex-end;
        }
        .msg-bubble-admin {
          background: ${colors.bg3};
          color: ${colors.text};
          border-radius: 18px 18px 18px 4px;
          align-self: flex-start;
        }
        .send-btn:hover:not(:disabled) { background: ${colors.greenDark} !important; transform: scale(1.05); }
        .send-btn { transition: all 150ms ease; }
      `}} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 2px' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text, margin: 0, fontFamily: "'Syne',sans-serif" }}>💬 Support</h1>
          <p style={{ fontSize: 12.5, color: colors.textMid, margin: '4px 0 0' }}>Suivez vos conversations avec notre équipe</p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          style={{
            height: 36, padding: '0 16px',
            background: showNew ? colors.bg3 : colors.green,
            color: showNew ? colors.textMid : '#fff',
            border: showNew ? `1px solid ${colors.border}` : 'none',
            borderRadius: 10, cursor: 'pointer',
            fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
            transition: 'all 150ms ease',
          }}
        >
          {showNew ? '✕ Annuler' : '+ Nouvelle conversation'}
        </button>
      </div>

      {/* Formulaire nouvelle conversation */}
      {showNew && (
        <form onSubmit={handleCreateThread} style={{
          marginBottom: 16, background: colors.surface,
          border: `1px solid ${colors.border}`, borderRadius: 12,
          padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMid, display: 'block', marginBottom: 6 }}>
              Sujet de votre demande
            </label>
            <input
              autoFocus
              type="text"
              placeholder="Ex: Problème d'accès, Question sur mon plan…"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              style={{
                width: '100%', height: 40, padding: '0 14px',
                border: `1.5px solid ${colors.border}`, borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit',
                background: colors.bg2, color: colors.text, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newSubject.trim()}
            style={{
              height: 40, padding: '0 20px',
              background: newSubject.trim() ? colors.green : colors.border,
              color: newSubject.trim() ? '#fff' : colors.textMid,
              border: 'none', borderRadius: 8,
              fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              cursor: newSubject.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0, transition: 'all 150ms ease',
            }}
          >
            {creating ? '⏳' : 'Démarrer'}
          </button>
        </form>
      )}

      {/* Layout principal */}
      <div className="support-layout">
        {/* ─── Colonne threads ─── */}
        <div className="thread-list-col" style={{
          display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px', fontSize: 11, fontWeight: 700,
            color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em',
            borderBottom: `1px solid ${colors.border}`, background: colors.bg2,
          }}>
            Conversations ({threads.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threads.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: colors.textMid, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                Aucune conversation<br />
                <span style={{ fontSize: 12 }}>Démarrez une nouvelle conversation avec le support.</span>
              </div>
            ) : threads.map((t) => (
              <button
                key={t.id}
                className={`thread-item${selectedId === t.id ? ' active' : ''}`}
                onClick={() => setSelectedId(t.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px',
                  borderBottom: `1px solid ${colors.border}`,
                  background: selectedId === t.id ? colors.greenLight : 'transparent',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 150ms ease',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{
                    fontWeight: 600, fontSize: 13, color: colors.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {t.unreadByUser && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#E53935', marginRight: 5, verticalAlign: 'middle' }} />}
                    {t.subject}
                  </span>
                  <span style={{ fontSize: 10, flexShrink: 0, color: colors.textDim }}>
                    {fmtTime(t.updatedAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px',
                    borderRadius: 4, background: `${STATUS_COLOR[t.status] ?? colors.green}22`,
                    color: STATUS_COLOR[t.status] ?? colors.green,
                  }}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  {t.lastMessage && (
                    <span style={{
                      fontSize: 11.5, color: colors.textDim,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {t.lastMessage}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Zone de chat ─── */}
        <div className="chat-col" style={{
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {!selectedId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMid, fontSize: 13, gap: 12, padding: 40 }}>
              <span style={{ fontSize: 40 }}>💬</span>
              <span>Sélectionnez une conversation ou démarrez-en une nouvelle.</span>
            </div>
          ) : (
            <>
              {/* Header du chat */}
              <div style={{
                padding: '12px 18px', borderBottom: `1px solid ${colors.border}`,
                background: colors.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Bouton retour mobile */}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="mobile-back-btn"
                    style={{
                      display: 'none', // shown via CSS media query
                      background: 'none', border: 'none',
                      cursor: 'pointer', color: colors.textMid,
                      fontSize: 18, padding: '0 6px 0 0',
                    }}
                  >←</button>
                  <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 768px) { .mobile-back-btn { display: block !important; } }` }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
                      {selectedThread?.subject}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
                      {selectedThread?.createdAt?.toDate?.().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: `${STATUS_COLOR[selectedThread?.status ?? 'open']}22`,
                  color: STATUS_COLOR[selectedThread?.status ?? 'open'],
                }}>
                  {STATUS_LABEL[selectedThread?.status ?? 'open']}
                </span>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '20px 18px',
                display: 'flex', flexDirection: 'column', gap: 10,
                background: colors.bg,
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: colors.textMid, fontSize: 13, marginTop: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                    Démarrez la conversation en envoyant un message ci-dessous.
                  </div>
                ) : messages.map((m) => {
                  const isMe = m.senderRole === 'user'
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div
                        className={isMe ? 'msg-bubble-user' : 'msg-bubble-admin'}
                        style={{
                          maxWidth: '75%',
                          padding: '10px 14px',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10.5, color: colors.textDim, marginTop: 3, padding: '0 4px' }}>
                        {isMe ? 'Moi' : '🎧 Support'} · {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Zone de saisie */}
              {isClosed ? (
                <div style={{
                  padding: '12px 18px', borderTop: `1px solid ${colors.border}`,
                  background: colors.bg2, textAlign: 'center',
                  color: colors.textMid, fontSize: 13,
                }}>
                  <span style={{ fontSize: 16 }}>✅</span> Cette conversation est <strong>résolue</strong>. Ouvrez une nouvelle conversation si nécessaire.
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px', borderTop: `1px solid ${colors.border}`,
                  background: colors.surface, display: 'flex', alignItems: 'flex-end', gap: 8,
                }}>
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    placeholder="Écrivez votre message… (Entrée pour envoyer)"
                    rows={2}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: `1.5px solid ${colors.border}`,
                      borderRadius: 20,
                      fontSize: 13.5,
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: colors.bg2,
                      color: colors.text,
                      outline: 'none',
                      boxSizing: 'border-box',
                      lineHeight: 1.5,
                      transition: 'border-color 150ms ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.green}
                    onBlur={(e) => e.target.style.borderColor = colors.border}
                  />
                  <button
                    className="send-btn"
                    onClick={() => void handleSend()}
                    disabled={sending || !inputText.trim()}
                    style={{
                      width: 42, height: 42, flexShrink: 0,
                      borderRadius: '50%',
                      background: inputText.trim() ? colors.green : colors.border,
                      color: '#fff',
                      border: 'none',
                      cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: inputText.trim() ? '0 4px 12px rgba(27,122,62,0.35)' : 'none',
                    }}
                  >
                    {sending ? (
                      <span style={{ fontSize: 14 }}>⏳</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
