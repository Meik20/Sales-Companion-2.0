'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, Mail, User, Shield, Zap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import type { UserDoc } from '@sales-companion/shared'

type UserWithId = UserDoc & {
  id?: string
  company?: string | null
  sector?: string | null
  region?: string | null
  phone?: string | null
  createdAt?: string | null
  lastLoginAt?: string | null
  managerId?: string | null
}

type Props = {
  isOpen: boolean
  user: UserWithId | null
  onClose: () => void
  onSuccess?: (threadId: string, userName: string) => void
}

const roleBadge: Record<string, 'success' | 'gold' | 'info' | 'default'> = {
  admin: 'gold',
  manager: 'success',
  member: 'info',
  independent: 'default'
}

const planBadge: Record<string, 'default' | 'info' | 'success' | 'gold'> = {
  free: 'default',
  starter: 'info',
  pro: 'success',
  enterprise: 'gold'
}

export function ContactUserModal({ isOpen, user, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState('Message du Support Sales Companion')
  const [message, setMessage] = useState('')
  const [openAfterSend, setOpenAfterSend] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !user) return null

  const displayName = user.name || user.email.split('@')[0] || 'Utilisateur'
  const initial = (displayName[0] ?? 'U').toUpperCase()

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || !subject.trim() || !user) return

    setSending(true)
    setError(null)

    try {
      // Get auth token from current admin
      const { auth } = await import('@/services/firebase/client')
      const token = await auth.currentUser?.getIdToken()

      const res = await fetch('/api/admin/support/create-thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`
        },
        body: JSON.stringify({
          userId: user.uid,
          subject: subject.trim(),
          message: message.trim()
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi.")
      }

      setMessage('')
      onClose()
      if (onSuccess && data.threadId) {
        onSuccess(data.threadId, displayName)
      }
      if (openAfterSend && data.threadId) {
        router.push(`/admin/support?ticket=${data.threadId}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose()
      }}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--card, #131c2e)',
          borderColor: 'var(--border, rgba(255, 255, 255, 0.12))'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.08))' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6' }}
            >
              <Mail size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground m-0">Contacter l&apos;utilisateur</h2>
              <p className="text-xs text-muted-foreground m-0 mt-0.5">
                Créer un ticket de support dédié
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* User Card info */}
        <div
          className="mx-6 mt-5 p-3.5 rounded-xl border flex items-center justify-between gap-3"
          style={{
            background: 'var(--secondary, rgba(255, 255, 255, 0.03))',
            borderColor: 'var(--border, rgba(255, 255, 255, 0.08))'
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm text-white shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)'
              }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-foreground truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              {user.company && (
                <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                  🏢 {user.company}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant={roleBadge[user.role] ?? 'default'}>
              {user.role}
            </Badge>
            <Badge variant={planBadge[user.plan] ?? 'default'}>
              {user.plan.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="p-6 pt-4 flex flex-col gap-4">
          {error && (
            <div
              className="p-3 rounded-lg text-xs font-medium border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#f87171'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Objet du message <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ex: Assistance personnalisée, Mise à niveau de votre compte..."
              required
              disabled={sending}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Votre message <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  if (message.trim() && subject.trim() && !sending) {
                    const form = e.currentTarget.form
                    if (form) form.requestSubmit()
                  }
                }
              }}
              placeholder="Rédigez votre message à l'attention de cet utilisateur..."
              required
              disabled={sending}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
              style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.12))' }}
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
              <span>Appuyez sur Ctrl + Entrée pour envoyer</span>
              <span>{message.length} caractères</span>
            </div>
          </div>

          {/* Info callout */}
          <div
            className="p-3 rounded-xl border flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed"
            style={{
              background: 'rgba(37, 99, 235, 0.05)',
              borderColor: 'rgba(37, 99, 235, 0.18)'
            }}
          >
            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
            <span>
              Ce message sera transmis dans l&apos;espace <strong>Support</strong> de l&apos;utilisateur
              et une notification automatique lui sera envoyée par <strong>email</strong>.
            </span>
          </div>

          {/* Option to open thread after send */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openAfterSend}
              onChange={(e) => setOpenAfterSend(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Ouvrir la conversation dans le Support après l&apos;envoi</span>
          </label>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={sending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={sending || !message.trim() || !subject.trim()}
              className="flex items-center gap-2"
            >
              <Send size={14} className={sending ? 'animate-pulse' : ''} />
              {sending ? 'Envoi en cours…' : 'Envoyer le message'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
