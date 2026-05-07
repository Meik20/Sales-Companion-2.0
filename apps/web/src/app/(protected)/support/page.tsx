'use client'

import { useState, useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firestore } from '@/services/firebase/client'
import { useTranslation } from '@/providers/I18nProvider'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
  getDocs,
} from 'firebase/firestore'
import { colors } from '@/styles/tokens'
import { MessageSquare, Send, Plus, X, ArrowLeft, Headphones, Trash2 } from 'lucide-react'

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
  open:     'var(--color-accent)',
  resolved: 'var(--color-success)',
  closed:   '#9E9E9E',
}

function getStatusLabel(status: string, t: any) {
  if (status === 'open') return t('support.statusOpen')
  if (status === 'resolved') return t('support.statusResolved')
  if (status === 'closed') return t('support.statusClosed')
  return status
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
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [threads, setThreads]       = useState<Thread[]>([])
  const [threadError, setThreadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [inputText, setInputText]   = useState('')
  const [sending, setSending]       = useState(false)
  const [showNew, setShowNew]       = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [creating, setCreating]     = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  const selectedThread = threads.find((t) => t.id === selectedId)
  const isResolved     = selectedThread ? selectedThread.status !== 'open' : false

  // Real-time threads — sort client-side to avoid composite index requirement
  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(firestore, 'support_threads'),
      where('userId', '==', user.uid)
    )
    return onSnapshot(
      q,
      (snap) => {
        setThreadError(null)
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) }))
          .sort((a, b) => {
            const ta = a.updatedAt?.toMillis() ?? 0
            const tb = b.updatedAt?.toMillis() ?? 0
            return tb - ta
          })
        setThreads(list)
      },
      (err) => {
        console.error('Support threads snapshot error:', err)
        setThreadError(t('support.errorLoad'))
      }
    )
  }, [user?.uid])

  // Auto-select first thread
  useEffect(() => {
    if (threads.length > 0 && !selectedId) {
      setSelectedId(threads[0]!.id)
    }
  }, [threads, selectedId])

  // Messages for selected thread
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    const q = query(
      collection(firestore, 'support_threads', selectedId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) })))
      updateDoc(doc(firestore, 'support_threads', selectedId), { unreadByUser: false }).catch(() => {})
    })
  }, [selectedId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newSubject.trim()) return
    setCreating(true)
    try {
      const now = serverTimestamp()
      const ref = await addDoc(collection(firestore, 'support_threads'), {
        userId:       user.uid,
        userEmail:    user.email ?? '',
        userName:     (user as { name?: string }).name ?? user.email ?? t('sidebar.user'),
        subject:      newSubject.trim(),
        status:       'open',
        createdAt:    now,
        updatedAt:    now,
        lastMessage:  '',
        unreadByAdmin: true,
        unreadByUser:  false,
      })
      setSelectedId(ref.id)
      setNewSubject('')
      setShowNew(false)
      setTimeout(() => textareaRef.current?.focus(), 200)
    } catch (err) {
      console.error('Failed to create thread:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleSend() {
    if (!selectedId || !inputText.trim() || sending || !user || isResolved) return
    const text = inputText.trim()
    setInputText('')
    setSending(true)
    try {
      const now = serverTimestamp()
      await addDoc(collection(firestore, 'support_threads', selectedId, 'messages'), {
        content:    text,
        senderId:   user.uid,
        senderRole: 'user',
        createdAt:  now,
      })
      await updateDoc(doc(firestore, 'support_threads', selectedId), {
        lastMessage:  text.slice(0, 80),
        updatedAt:    now,
        unreadByAdmin: true,
        unreadByUser:  false,
      })
    } catch (err) {
      console.error('Failed to send:', err)
      setInputText(text)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  async function handleDeleteThread(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!window.confirm(t('support.confirmDelete'))) return

    try {
      // 1. Delete all messages first (subcollection)
      const messagesRef = collection(firestore, 'support_threads', id, 'messages')
      const messagesSnap = await getDocs(messagesRef)
      const deletePromises = messagesSnap.docs.map(d => deleteDoc(d.ref))
      await Promise.all(deletePromises)

      // 2. Delete the thread itself
      await deleteDoc(doc(firestore, 'support_threads', id))

      if (selectedId === id) {
        setSelectedId(null)
      }
    } catch (err) {
      console.error('Failed to delete thread:', err)
      alert(t('support.errorDelete'))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
  }

  return (
    <AppShell>
      <style dangerouslySetInnerHTML={{ __html: `
        .sup-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          height: calc(100dvh - 132px);
          min-height: 480px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid ${colors.border};
        }
        @media (max-width: 768px) {
          .sup-layout { grid-template-columns: 1fr; height: auto; }
          .sup-list   { display: var(--list-display, flex); }
          .sup-chat   { display: var(--chat-display, flex); }
        }
        .thr-item { width:100%; text-align:left; padding:12px 14px; border:none; cursor:pointer; transition:background 150ms; display:block; border-bottom:1px solid ${colors.border}; }
        .thr-item:hover { background: rgba(55,138,221,0.06); }
        .thr-item.sel  { background: rgba(55,138,221,0.1); border-left: 3px solid var(--color-accent); }
        .msg-user  { background:var(--color-primary); color:#fff; border-radius:18px 18px 4px 18px; align-self:flex-end; }
        .msg-admin { background:${colors.bg3}; color:${colors.text}; border-radius:18px 18px 18px 4px; align-self:flex-start; }
      `}} />

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, padding:'0 2px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Headphones size={22} style={{ color:'var(--color-accent)' }} />
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:colors.text, margin:0, fontFamily:"'Syne',sans-serif" }}>{t('support.title')}</h1>
            <p style={{ fontSize:12.5, color:colors.textMid, margin:'2px 0 0' }}>{t('support.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          style={{
            height:36, padding:'0 14px',
            background: showNew ? colors.bg3 : 'var(--color-primary)',
            color: showNew ? colors.textMid : '#fff',
            border: showNew ? `1px solid ${colors.border}` : 'none',
            borderRadius:10, cursor:'pointer',
            fontWeight:600, fontSize:13, fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:6,
            transition:'all 150ms ease',
          }}
        >
          {showNew ? <><X size={14}/> {t('support.cancel')}</> : <><Plus size={14}/> {t('support.newConversation')}</>}
        </button>
      </div>

      {/* New thread form */}
      {showNew && (
        <form onSubmit={handleCreateThread} style={{
          marginBottom:16, background:colors.surface,
          border:`1px solid ${colors.border}`, borderRadius:12,
          padding:'16px 20px', display:'flex', gap:10, alignItems:'flex-end',
        }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12, fontWeight:600, color:colors.textMid, display:'block', marginBottom:6 }}>
              {t('support.subjectLabel')}
            </label>
            <input
              autoFocus
              type="text"
              placeholder={t('support.subjectPlaceholder')}
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              style={{
                width:'100%', height:40, padding:'0 14px',
                border:`1.5px solid ${colors.border}`, borderRadius:8,
                fontSize:13, fontFamily:'inherit',
                background:colors.bg2, color:colors.text, outline:'none', boxSizing:'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newSubject.trim()}
            style={{
              height:40, padding:'0 20px',
              background: newSubject.trim() ? 'var(--color-primary)' : colors.border,
              color: newSubject.trim() ? '#fff' : colors.textMid,
              border:'none', borderRadius:8,
              fontWeight:700, fontSize:13, fontFamily:'inherit',
              cursor: newSubject.trim() ? 'pointer' : 'not-allowed', flexShrink:0,
            }}
          >{creating ? '…' : t('support.start')}</button>
        </form>
      )}

      {threadError && (
        <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:13 }}>
          {threadError}
        </div>
      )}

      {/* Main layout */}
      <div className="sup-layout">
        {/* ── Left: thread list ── */}
        <div className="sup-list" style={{
          flexDirection:'column', borderRight:`1px solid ${colors.border}`, overflow:'hidden',
        }}>
          <div style={{
            padding:'12px 14px', fontSize:11, fontWeight:700,
            color:colors.textMid, textTransform:'uppercase', letterSpacing:'.06em',
            borderBottom:`1px solid ${colors.border}`, background:colors.bg2,
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <span>{t('support.conversationsList')} ({threads.length})</span>
            {threads.some(t => t.unreadByUser) && (
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', display:'inline-block' }} />
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {threads.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:colors.textMid, fontSize:13 }}>
                <MessageSquare size={32} style={{ opacity:0.3, margin:'0 auto 10px', display:'block' }} />
                {t('support.noConversation')}<br/>
                <span style={{ fontSize:12 }}>{t('support.startNew')}</span>
              </div>
            ) : threads.map((thread) => (
              <button
                key={thread.id}
                className={`thr-item${selectedId === thread.id ? ' sel' : ''}`}
                onClick={() => setSelectedId(thread.id)}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                  <span style={{ fontWeight:600, fontSize:13, color:colors.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                    {thread.unreadByUser && <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#ef4444', marginRight:5, verticalAlign:'middle' }}/>}
                    {thread.subject}
                  </span>
                  <span style={{ fontSize:10, flexShrink:0, color:colors.textDim }}>{fmtTime(thread.updatedAt)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6, marginTop:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                      background:`${STATUS_COLOR[thread.status] ?? colors.border}22`,
                      color: STATUS_COLOR[thread.status] ?? colors.textMid,
                    }}>{getStatusLabel(thread.status, t)}</span>
                    {thread.lastMessage && (
                      <span style={{ fontSize:11, color:colors.textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>
                        {thread.lastMessage}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteThread(e, thread.id)}
                    style={{
                      background:'none', border:'none', cursor:'pointer',
                      color:colors.textDim, padding:4, borderRadius:4,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = colors.textDim)}
                    title={t('support.deleteTitle')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: chat area ── */}
        <div className="sup-chat" style={{ flexDirection:'column', overflow:'hidden' }}>
          {!selectedId ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:colors.textMid, fontSize:13, gap:12, padding:40 }}>
              <MessageSquare size={40} style={{ opacity:0.25 }} />
              <span>{t('support.selectOrStart')}</span>
              <button
                onClick={() => setShowNew(true)}
                style={{ marginTop:8, padding:'8px 20px', background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:13 }}
              >
                + {t('support.newConversation')}
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding:'12px 18px', borderBottom:`1px solid ${colors.border}`, background:colors.bg2, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:colors.textMid, fontSize:18 }}
                    className="mob-back"
                  ><ArrowLeft size={18}/></button>
                  <style dangerouslySetInnerHTML={{ __html:`@media(max-width:768px){.mob-back{display:flex!important;}}` }}/>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:colors.text }}>{selectedThread?.subject}</div>
                    <div style={{ fontSize:11, color:colors.textMid, marginTop:2 }}>
                      {selectedThread?.createdAt?.toDate?.().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                  background:`${STATUS_COLOR[selectedThread?.status ?? 'open']}22`,
                  color: STATUS_COLOR[selectedThread?.status ?? 'open'],
                }}>{getStatusLabel(selectedThread?.status ?? 'open', t)}</span>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'20px 18px', display:'flex', flexDirection:'column', gap:10, background:colors.bg }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign:'center', color:colors.textMid, fontSize:13, marginTop:40 }}>
                    <MessageSquare size={32} style={{ opacity:0.25, margin:'0 auto 10px', display:'block' }} />
                    {t('support.startBySending')}
                  </div>
                ) : messages.map((m) => {
                  const isMe = m.senderRole === 'user'
                  return (
                    <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div className={isMe ? 'msg-user' : 'msg-admin'} style={{ maxWidth:'75%', padding:'10px 14px', fontSize:13.5, lineHeight:1.6, wordBreak:'break-word', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', whiteSpace:'pre-wrap' }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize:10.5, color:colors.textDim, marginTop:3, padding:'0 4px' }}>
                        {isMe ? t('support.me') : t('support.supportTeam')} · {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef}/>
              </div>

              {/* Input zone — always rendered, disabled when resolved */}
              <div style={{ padding:'10px 14px', borderTop:`1px solid ${colors.border}`, background:colors.surface }}>
                {isResolved ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <span style={{ fontSize:13, color:colors.textMid }}>
                      <span style={{ color:'var(--color-success)', fontWeight:600 }}>{t('support.resolvedThread')}</span>{' '}
                      {t('support.needMoreHelp')}
                    </span>
                    <button
                      onClick={() => setShowNew(true)}
                      style={{ flexShrink:0, height:34, padding:'0 14px', background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:12 }}
                    >
                      + {t('support.newConversation')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      placeholder={t('support.typeMessage')}
                      rows={2}
                      style={{
                        flex:1, padding:'10px 14px',
                        border:`1.5px solid ${colors.border}`,
                        borderRadius:20, fontSize:13.5,
                        resize:'none', fontFamily:'inherit',
                        background:colors.bg2, color:colors.text,
                        outline:'none', boxSizing:'border-box', lineHeight:1.5,
                        transition:'border-color 150ms ease',
                      }}
                      onFocus={(e)  => (e.target.style.borderColor = 'var(--color-accent)')}
                      onBlur={(e)   => (e.target.style.borderColor = colors.border)}
                    />
                    <button
                      onClick={() => void handleSend()}
                      disabled={sending || !inputText.trim()}
                      style={{
                        width:42, height:42, flexShrink:0, borderRadius:'50%',
                        background: inputText.trim() ? 'var(--color-primary)' : colors.border,
                        color:'#fff', border:'none',
                        cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        boxShadow: inputText.trim() ? '0 4px 12px rgba(24,95,165,0.35)' : 'none',
                        transition:'all 150ms ease',
                      }}
                    >
                      {sending ? <span style={{ fontSize:14 }}>…</span> : <Send size={16}/>}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
