'use client'

import { useState, useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { firestore } from '@/services/firebase/client'
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore'
import { Trash2, CheckCircle2, Sparkles, Send, Mail, RefreshCw, X } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

type Thread = {
  id: string
  subject?: string
  userName?: string
  userEmail?: string
  userId?: string // ← identifiant Firebase UID de l'utilisateur
  status?: 'open' | 'resolved' | 'closed'
  lastMessage?: string
  updatedAt?: Timestamp
  unreadByAdmin?: boolean
  type?: string
  companyName?: string
  phone?: string
  sector?: string
  isGuest?: boolean
  domainExemptionStatus?: 'approved' | 'pending' | null
  domainExemptionToken?: string
  profileChangeStatus?: 'approved' | 'rejected' | 'pending' | null
  profileChangeToken?: string
  profileChangeRejectedReason?: string
}

type Message = {
  id: string
  content: string
  senderRole: 'user' | 'admin'
  createdAt?: Timestamp
}

const STATUS_LABEL: Record<string, string> = {
  open: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé'
}
const STATUS_COLOR: Record<string, string> = {
  open: '#1E88E5',
  resolved: '#0284c7',
  closed: '#9E9E9E'
}

export default function AdminSupportPage() {
  const { user } = useCurrentUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')
  const { t } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Debounce search term (500ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Défilement automatique vers le bas lors de l'arrivée d'un message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Écoute temps réel des tickets de support
  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)
    const q = query(
      collection(firestore, 'support_threads'),
      orderBy('updatedAt', 'desc'),
      limit(200)
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setThreads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) })))
        setLoading(false)
      },
      (err) => {
        console.error('Failed to listen to support threads:', err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [user?.uid])

  // Écoute temps réel des messages du ticket sélectionné
  useEffect(() => {
    if (!selected?.id) {
      setMessages([])
      return
    }

    const q = query(
      collection(firestore, 'support_threads', selected.id, 'messages'),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const serverMessages = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Message, 'id'>)
        }))
        setMessages((prev) => {
          // Conserver les messages optimistes non encore confirmés par le serveur
          const pendingOptimistic = prev.filter(
            (m) =>
              m.id.startsWith('temp-') &&
              !serverMessages.some((sm) => sm.content === m.content && sm.senderRole === m.senderRole)
          )
          return [...serverMessages, ...pendingOptimistic]
        })
      },
      (err) => {
        console.error('Support messages snapshot error:', err)
      }
    )

    return () => unsubscribe()
  }, [selected?.id])

  async function handleApproveDomain(thread: Thread) {
    if (!user || !thread.userEmail) return
    const confirmMsg = `Confirmez-vous la validation de la dérogation pour ${thread.userName || thread.userEmail} (${thread.companyName || 'Entreprise'}) ?\n\nUn email contenant le lien d'inscription sécurisé lui sera envoyé immédiatement.`
    if (!window.confirm(confirmMsg)) return

    setApproving(true)
    setError(null)
    setActionSuccess(null)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/admin/support/approve-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          threadId: thread.id,
          email: thread.userEmail,
          name: thread.userName,
          companyName: thread.companyName,
          sector: thread.sector
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'approbation.")
      }

      setActionSuccess(`✅ Dérogation validée ! Le lien d'inscription a été envoyé par email à ${thread.userEmail}.`)
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              status: 'resolved',
              domainExemptionStatus: 'approved',
              domainExemptionToken: data.token
            }
          : null
      )
      await loadThreads()
      if (selected) {
        await openThread({
          ...selected,
          status: 'resolved',
          domainExemptionStatus: 'approved',
          domainExemptionToken: data.token
        })
      }
    } catch (err: any) {
      console.error('Approve domain error:', err)
      setError(err.message || "Erreur lors de l'envoi du lien d'inscription.")
    } finally {
      setApproving(false)
    }
  }

  async function handleApproveProfileChange(thread: Thread) {
    if (!user || !thread.id) return
    const confirmMsg = `Confirmez-vous la validation de la modification de profil pour ${thread.userName || thread.userEmail} (${thread.companyName || 'Entreprise'}) ?\n\nUn lien sécurisé valable 24h lui sera envoyé par email et dans cette discussion.`
    if (!window.confirm(confirmMsg)) return

    setApproving(true)
    setError(null)
    setActionSuccess(null)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/admin/support/approve-profile-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ threadId: thread.id })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'approbation.")
      }

      setActionSuccess(`✅ Modification de profil validée ! Lien envoyé par email et dans la discussion.`)
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              status: 'resolved',
              profileChangeStatus: 'approved',
              profileChangeToken: data.token
            }
          : null
      )
    } catch (err: any) {
      console.error('Approve profile error:', err)
      setError(err.message || "Erreur lors de l'approbation.")
    } finally {
      setApproving(false)
    }
  }

  async function handleRejectProfileChange(thread: Thread) {
    if (!user || !thread.id) return
    const reason = window.prompt(
      'Indiquez le motif du refus (optionnel) :',
      "Informations non conformes aux politiques de gouvernance d'entreprise."
    )
    if (reason === null) return

    setApproving(true)
    setError(null)
    setActionSuccess(null)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/admin/support/reject-profile-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ threadId: thread.id, reason })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du rejet.')
      }

      setActionSuccess(`❌ Demande rejetée. L'utilisateur a été notifié par email et dans la discussion.`)
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              status: 'resolved',
              profileChangeStatus: 'rejected',
              profileChangeRejectedReason: reason
            }
          : null
      )
    } catch (err: any) {
      console.error('Reject profile error:', err)
      setError(err.message || 'Erreur lors du rejet.')
    } finally {
      setApproving(false)
    }
  }

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
    } finally {
      setLoading(false)
    }
  }

  async function openThread(thread: Thread) {
    setSelected(thread)
    setReplyText('')
    setError(null)
    try {
      await updateDoc(doc(firestore, 'support_threads', thread.id), { unreadByAdmin: false })
    } catch {
      // Non-bloquant
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim() || sending) return
    const textToSend = replyText.trim()
    setSending(true)
    setError(null)

    // 1. Affichage instantané immédiat (mise à jour optimiste 0ms)
    const tempId = 'temp-' + Date.now()
    const optimisticMsg: Message = {
      id: tempId,
      content: textToSend,
      senderRole: 'admin',
      createdAt: Timestamp.now()
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setReplyText('')

    // Mise à jour immédiate du résumé dans la liste des tickets
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selected.id
          ? { ...t, lastMessage: textToSend.slice(0, 80), updatedAt: Timestamp.now() }
          : t
      )
    )

    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/support/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          threadId: selected.id,
          message: textToSend
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.message || "Erreur lors de l'envoi de la réponse")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi"
      setError(msg)
      // Annulation du message optimiste en cas d'échec
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setReplyText(textToSend)
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteThread(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (
      !window.confirm(
        'Voulez-vous vraiment supprimer définitivement ce ticket et tous ses messages ?'
      )
    )
      return

    try {
      if (user) {
        const token = await user.getIdToken()
        const res = await fetch('/api/admin/support/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ threadId: id })
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Erreur lors de la suppression')
        }
      } else {
        // Fallback SDK direct
        const messagesSnap = await getDocs(collection(firestore, 'support_threads', id, 'messages'))
        const deletePromises = messagesSnap.docs.map((d) => deleteDoc(d.ref))
        await Promise.all(deletePromises)
        await deleteDoc(doc(firestore, 'support_threads', id))
      }

      if (selected?.id === id) setSelected(null)
      await loadThreads()
    } catch (err) {
      console.error('Failed to delete thread:', err)
      setError('Erreur lors de la suppression du ticket.')
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!selected) return
    if (!window.confirm('Voulez-vous vraiment supprimer ce message ?')) return

    try {
      if (user) {
        const token = await user.getIdToken()
        const res = await fetch('/api/admin/support/delete-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ threadId: selected.id, messageId })
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Erreur lors de la suppression')
        }
      } else {
        await deleteDoc(doc(firestore, 'support_threads', selected.id, 'messages', messageId))
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      await loadThreads()
    } catch (err) {
      console.error('Failed to delete message:', err)
      setError('Erreur lors de la suppression du message.')
    }
  }

  async function resolveThread() {
    if (!selected) return
    setError(null)
    try {
      await updateDoc(doc(firestore, 'support_threads', selected.id), {
        status: 'resolved',
        updatedAt: serverTimestamp()
      })
      setSelected((prev) => (prev ? { ...prev, status: 'resolved' } : null))
      await loadThreads()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la résolution'
      setError(msg)
      console.error('Failed to resolve thread:', err)
    }
  }

  const fmtDate = (ts?: Timestamp) =>
    ts?.toDate
      ? ts
          .toDate()
          .toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })
      : ''

  // Filtrage local avec debounced search
  const filteredThreads = threads.filter((t) => {
    const matchStatus =
      filterStatus === 'all' || t.status === filterStatus || (filterStatus === 'open' && !t.status)
    const term = debouncedSearch.toLowerCase()
    const matchSearch =
      !term ||
      (t.subject ?? '').toLowerCase().includes(term) ||
      (t.userName ?? '').toLowerCase().includes(term) ||
      (t.userEmail ?? '').toLowerCase().includes(term) ||
      (t.companyName ?? '').toLowerCase().includes(term) ||
      (t.phone ?? '').toLowerCase().includes(term) ||
      (t.userId ?? '').toLowerCase().includes(term)
    return matchStatus && matchSearch
  })

  const unreadCount = threads.filter((t) => t.unreadByAdmin).length

  return (
    <AppShell>
      <PageHeader
        title={t('admin.supportTitle')}
        subtitle={`${threads.length} ticket${threads.length !== 1 ? 's' : ''}${unreadCount > 0 ? ` · ${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : ''}`}
      />

      {/* Message d'erreur */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 8,
            background: 'rgba(229, 57, 53, 0.1)',
            border: '1px solid #E53935',
            color: '#C62828',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#C62828',
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Message de succès */}
      {actionSuccess && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 8,
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            color: '#60a5fa',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            ×
          </button>
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
            flex: 1,
            minWidth: 200,
            height: 38,
            padding: '0 12px',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            background: 'var(--secondary, #1e2a3b)',
            color: 'var(--foreground, #f1f5f9)',
            outline: 'none'
          }}
        />
        {(['all', 'open', 'resolved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              border: `1px solid ${filterStatus === s ? 'rgba(37,99,235,0.5)' : 'var(--border, rgba(255,255,255,0.1))'}`,
              background: filterStatus === s ? 'rgba(37,99,235,0.12)' : 'var(--secondary, #1e2a3b)',
              color: filterStatus === s ? '#60a5fa' : 'var(--muted-foreground, #94a3b8)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {s === 'all'
              ? t('admin.allTickets')
              : s === 'open'
                ? `🔵 ${t('admin.openTickets')}`
                : `✅ ${t('admin.closedTickets')}`}
          </button>
        ))}
        <button
          onClick={loadThreads}
          style={{
            height: 38,
            padding: '0 14px',
            background: 'rgba(37,99,235,0.1)',
            color: '#60a5fa',
            border: `1px solid ${'rgba(37,99,235,0.3)'}`,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {t('admin.refresh')}
        </button>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}
      >
        {/* ── Liste des threads ─────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--secondary, #1e2a3b)',
            borderRadius: 12,
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            maxHeight: 680,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
              fontSize: 12,
              color: 'var(--muted-foreground, #94a3b8)'
            }}
          >
            {filteredThreads.length} ticket{filteredThreads.length !== 1 ? 's' : ''} affichés
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div
                style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground, #94a3b8)', fontSize: 13 }}
              >
                {t('team.loading')}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div
                style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground, #94a3b8)', fontSize: 13 }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                {t('admin.noTickets')}
              </div>
            ) : (
              filteredThreads.map((t) => {
                const status = t.status ?? 'open'
                const color = STATUS_COLOR[status] ?? STATUS_COLOR.open
                return (
                  <button
                    key={t.id}
                    onClick={() => openThread(t)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '13px 16px',
                      borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                      background:
                        selected?.id === t.id
                          ? 'rgba(37,99,235,0.1)'
                          : t.unreadByAdmin
                            ? '#FFFDE7'
                            : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 150ms ease'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: 'var(--foreground, #f1f5f9)',
                          flex: 1,
                          paddingRight: 8,
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 4
                        }}
                      >
                        <span>{t.subject ?? '—'}</span>
                        {t.type === 'corporate_domain_request' && (
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: '1px 5px',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: '#facc15',
                              borderRadius: 4,
                              fontWeight: 700
                            }}
                          >
                            🏢 Dérogation Domaine
                          </span>
                        )}
                        {t.type === 'profile_change_request' && (
                          <span
                            style={{
                              fontSize: 9.5,
                              padding: '1px 5px',
                              background: 'rgba(37, 99, 235, 0.15)',
                              color: '#60a5fa',
                              borderRadius: 4,
                              fontWeight: 700
                            }}
                          >
                            ⚙️ Modif Profil
                          </span>
                        )}
                        {t.unreadByAdmin && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: 7,
                              height: 7,
                              background: '#E53935',
                              borderRadius: '50%',
                              verticalAlign: 'middle',
                              marginLeft: 2
                            }}
                          />
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: `${color}22`,
                          color,
                          flexShrink: 0
                        }}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted-foreground, #94a3b8)', marginBottom: 2 }}>
                      👤 {t.userName || t.userEmail || '—'}
                      {t.companyName && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· 🏢 {t.companyName}</span>}
                    </div>
                    {t.lastMessage && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--muted-foreground, #64748b)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 280
                        }}
                      >
                        {t.lastMessage}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4
                      }}
                    >
                      <div style={{ fontSize: 10.5, color: 'var(--muted-foreground, #64748b)' }}>
                        {fmtDate(t.updatedAt)}
                      </div>
                      <button
                        onClick={(e) => handleDeleteThread(e, t.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--muted-foreground, #64748b)',
                          padding: 4,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 150ms ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground, #64748b)')}
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Panneau de détail ─────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--secondary, #1e2a3b)',
            borderRadius: 12,
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            maxHeight: 680,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {!selected ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted-foreground, #94a3b8)',
                fontSize: 13,
                padding: 40
              }}
            >
              ← Cliquez sur un ticket pour lire le message
            </div>
          ) : (
            <>
              {/* En-tête du ticket */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                  background: 'var(--card, #131c2e)'
                }}
              >
                <div
                  style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground, #f1f5f9)', marginBottom: 10 }}
                >
                  {selected.subject ?? 'Ticket'}
                </div>

                {/* Fiche utilisateur */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'rgba(27,122,62,0.06)',
                    border: '1px solid rgba(46,160,90,0.2)',
                    borderRadius: 8
                  }}
                >
                  {/* UID */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted-foreground, #64748b)',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        marginBottom: 2
                      }}
                    >
                      Identifiant (UID)
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'var(--foreground, #f1f5f9)',
                        wordBreak: 'break-all',
                        padding: '2px 6px',
                        background: 'var(--secondary, #1e2a3b)',
                        borderRadius: 4,
                        border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                        cursor: 'copy'
                      }}
                      onClick={() => navigator.clipboard.writeText(selected.userId ?? '')}
                      title="Cliquer pour copier l'ID"
                    >
                      {selected.userId ?? '—'}
                    </div>
                  </div>
                  {/* Nom */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted-foreground, #64748b)',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        marginBottom: 2
                      }}
                    >
                      Nom
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
                      {selected.userName || '—'}
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted-foreground, #64748b)',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        marginBottom: 2
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                      {selected.userEmail || '—'}
                    </div>
                  </div>
                  {/* Entreprise */}
                  {selected.companyName && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--muted-foreground, #64748b)',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          marginBottom: 2
                        }}
                      >
                        Entreprise
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
                        🏢 {selected.companyName}
                      </div>
                    </div>
                  )}
                  {/* Téléphone */}
                  {selected.phone && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--muted-foreground, #64748b)',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          marginBottom: 2
                        }}
                      >
                        Téléphone / WhatsApp
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>
                        <a href={`tel:${selected.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          📱 {selected.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {/* Secteur */}
                  {selected.sector && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--muted-foreground, #64748b)',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          marginBottom: 2
                        }}
                      >
                        Secteur
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--foreground, #f1f5f9)' }}>
                        {selected.sector}
                      </div>
                    </div>
                  )}
                  {/* Statut */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--muted-foreground, #64748b)',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        marginBottom: 2
                      }}
                    >
                      Statut
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: `${STATUS_COLOR[selected.status ?? 'open']}22`,
                        color: STATUS_COLOR[selected.status ?? 'open']
                      }}
                    >
                      {STATUS_LABEL[selected.status ?? 'open']}
                    </span>
                  </div>
                </div>

                {(selected.type === 'corporate_domain_request' || selected.isGuest) && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '12px 14px',
                      borderRadius: 8,
                      background:
                        selected.domainExemptionStatus === 'approved'
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'rgba(234, 179, 8, 0.08)',
                      border: `1px solid ${
                        selected.domainExemptionStatus === 'approved'
                          ? 'rgba(37, 99, 235, 0.3)'
                          : 'rgba(234, 179, 8, 0.3)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            selected.domainExemptionStatus === 'approved' ? '#60a5fa' : '#facc15',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 2
                        }}
                      >
                        {selected.domainExemptionStatus === 'approved' ? (
                          <>
                            <CheckCircle2 size={15} />
                            <span>Dérogation validée & Email d'invitation envoyé</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} />
                            <span>Demande de création de compte Manager sans domaine propre</span>
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                        {selected.domainExemptionStatus === 'approved'
                          ? `Le demandeur a reçu son lien sécurisé pour créer son compte Manager (${selected.userEmail}).`
                          : "Cliquez sur le bouton ci-contre pour valider l'accès et envoyer automatiquement le lien d'inscription par email."}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApproveDomain(selected)}
                      disabled={approving}
                      style={{
                        padding: '8px 16px',
                        background:
                          selected.domainExemptionStatus === 'approved'
                            ? 'rgba(37, 99, 235, 0.15)'
                            : '#2563eb',
                        color: selected.domainExemptionStatus === 'approved' ? '#60a5fa' : '#ffffff',
                        border:
                          selected.domainExemptionStatus === 'approved'
                            ? '1px solid rgba(37, 99, 235, 0.4)'
                            : 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: approving ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow:
                          selected.domainExemptionStatus === 'approved'
                            ? 'none'
                            : '0 2px 10px rgba(37, 99, 235, 0.3)',
                        transition: 'all 150ms ease',
                        flexShrink: 0
                      }}
                    >
                      {approving ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Validation en cours…</span>
                        </>
                      ) : selected.domainExemptionStatus === 'approved' ? (
                        <>
                          <Mail size={13} />
                          <span>Renvoyer le lien par email</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Valider & Envoyer le lien par email</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {selected.type === 'profile_change_request' && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '14px 16px',
                      borderRadius: 8,
                      background:
                        selected.profileChangeStatus === 'approved'
                          ? 'rgba(37, 99, 235, 0.08)'
                          : selected.profileChangeStatus === 'rejected'
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(37, 99, 235, 0.06)',
                      border: `1px solid ${
                        selected.profileChangeStatus === 'approved'
                          ? 'rgba(37, 99, 235, 0.3)'
                          : selected.profileChangeStatus === 'rejected'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : 'rgba(37, 99, 235, 0.25)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color:
                            selected.profileChangeStatus === 'approved'
                              ? '#60a5fa'
                              : selected.profileChangeStatus === 'rejected'
                                ? '#f87171'
                                : '#60a5fa',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 3
                        }}
                      >
                        {selected.profileChangeStatus === 'approved' ? (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Demande de modification approuvée (Lien 24h envoyé)</span>
                          </>
                        ) : selected.profileChangeStatus === 'rejected' ? (
                          <>
                            <X size={16} />
                            <span>Demande de modification rejetée</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>Demande d'autorisation de modification du profil d'entreprise</span>
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted-foreground, #94a3b8)', lineHeight: 1.5 }}>
                        {selected.profileChangeStatus === 'approved'
                          ? `Le client a reçu son lien sécurisé de déverrouillage par email (${selected.userEmail}) et dans ce fil de discussion.`
                          : selected.profileChangeStatus === 'rejected'
                            ? `Motif de rejet : ${selected.profileChangeRejectedReason || 'Informations non conformes.'}`
                            : "Après échange avec le client, validez ou rejetez sa demande. Si vous validez, un lien sécurisé valable 24h lui sera instantanément envoyé par email et dans cette messagerie."}
                      </div>
                    </div>

                    {/* Boutons d'action (Valider / Rejeter) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {selected.profileChangeStatus !== 'approved' && selected.profileChangeStatus !== 'rejected' && (
                        <>
                          {/* Bouton Rejeter */}
                          <button
                            onClick={() => handleRejectProfileChange(selected)}
                            disabled={approving}
                            style={{
                              padding: '8px 14px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: approving ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 150ms ease'
                            }}
                          >
                            <X size={13} />
                            <span>Rejeter</span>
                          </button>

                          {/* Bouton Valider */}
                          <button
                            onClick={() => handleApproveProfileChange(selected)}
                            disabled={approving}
                            style={{
                              padding: '8px 16px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: approving ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
                              transition: 'all 150ms ease'
                            }}
                          >
                            {approving ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Validation en cours…</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Valider la demande</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {selected.profileChangeStatus === 'approved' && (
                        <button
                          onClick={() => handleApproveProfileChange(selected)}
                          disabled={approving}
                          style={{
                            padding: '8px 14px',
                            background: 'rgba(37, 99, 235, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(37, 99, 235, 0.4)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: approving ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Mail size={13} />
                          <span>Renvoyer le lien par email</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 24,
                      color: 'var(--muted-foreground, #94a3b8)',
                      fontSize: 13
                    }}
                  >
                    Aucun message dans ce ticket.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUser = m.senderRole === 'user'
                    const time = m.createdAt?.toDate
                      ? m.createdAt
                          .toDate()
                          .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : ''
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isUser ? 'flex-start' : 'flex-end'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '78%',
                            padding: '10px 14px',
                            borderRadius: isUser ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                            background: isUser ? 'var(--secondary, #1e2a3b)' : '#2563eb',
                            color: isUser ? 'var(--foreground, #f1f5f9)' : '#fff',
                            fontSize: 13,
                            lineHeight: 1.65,
                            wordBreak: 'break-word',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                          }}
                        >
                          {m.content}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 10.5,
                            color: 'var(--muted-foreground, #64748b)',
                            marginTop: 3
                          }}
                        >
                          <span>
                            {isUser ? `👤 ${selected.userName || 'Utilisateur'}` : '🎧 Support'} · {time}
                          </span>
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'inherit',
                              padding: '2px 4px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              opacity: 0.6,
                              transition: 'all 150ms ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444'
                              e.currentTarget.style.opacity = '1'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'inherit'
                              e.currentTarget.style.opacity = '0.6'
                            }}
                            title="Supprimer ce message"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Zone de réponse */}
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                  display: 'flex',
                  gap: 8
                }}
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Votre réponse… (Ctrl+Entrée pour envoyer)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void sendReply()
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: `1.5px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                    borderRadius: 8,
                    fontSize: 13,
                    resize: 'none',
                    minHeight: 64,
                    fontFamily: 'inherit',
                    outline: 'none',
                    background: 'var(--card, #131c2e)',
                    color: 'var(--foreground, #f1f5f9)'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={() => void sendReply()}
                    disabled={sending || !replyText.trim()}
                    style={{
                      padding: '10px 16px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: sending ? 'wait' : 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      opacity: !replyText.trim() ? 0.5 : 1,
                      transition: 'opacity 150ms ease'
                    }}
                  >
                    {sending ? '⏳' : '↑ Envoyer'}
                  </button>
                  {selected.status !== 'resolved' && (
                    <button
                      onClick={() => void resolveThread()}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(37,99,235,0.1)',
                        color: '#60a5fa',
                        border: `1px solid ${'rgba(37,99,235,0.3)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'inherit'
                      }}
                    >
                      ✅ {t('admin.resolve')}
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
