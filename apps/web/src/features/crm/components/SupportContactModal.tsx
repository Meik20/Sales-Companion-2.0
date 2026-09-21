'use client'

import { useState } from 'react'
import { X, Send, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { CrmClient } from '../types'

type Props = {
  client: CrmClient
  onClose: () => void
}

type SendState = 'idle' | 'sending' | 'success' | 'error'

export function SupportContactModal({ client, onClose }: Props) {
  const { user } = useCurrentUser()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const clientEmail = client.email || client.companyEmail || ''
  const clientName = client.contactName || client.companyName || 'le client'

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return
    if (!clientEmail) {
      setErrorMsg('Ce client ne possède pas d\'adresse email renseignée.')
      setSendState('error')
      return
    }

    setSendState('sending')
    setErrorMsg('')

    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/crm/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: client.id,
          clientEmail,
          clientName,
          subject: subject.trim(),
          message: message.trim()
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi.')
      }

      setSendState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue.')
      setSendState('error')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Mail size={16} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">
                  Envoyer un message
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  À&nbsp;: <span className="font-semibold text-foreground/80">{clientName}</span>
                  {clientEmail && <span className="ml-1 opacity-60">({clientEmail})</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          {sendState === 'success' ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <CheckCircle2 size={44} strokeWidth={1.5} className="text-emerald-500" />
              <p className="text-[15px] font-bold text-foreground">Message envoyé !</p>
              <p className="text-[13px] text-muted-foreground">
                L'email a bien été transmis à <strong>{clientName}</strong>.
                <br />L'action est enregistrée dans la timeline du client.
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl border border-border bg-secondary px-5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-secondary/80"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              {/* No email warning */}
              {!clientEmail && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-400">
                  <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                  <span>Aucune adresse email renseignée pour ce client. Ajoutez-en une dans sa fiche avant d'envoyer.</span>
                </div>
              )}

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Objet
                </label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ex : Suivi de votre dossier client"
                  disabled={sendState === 'sending' || !clientEmail}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={6}
                  placeholder={`Bonjour ${clientName},\n\n`}
                  disabled={sendState === 'sending' || !clientEmail}
                  className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary disabled:opacity-50"
                />
              </div>

              {/* Error */}
              {sendState === 'error' && errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-400">
                  <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  L'email sera envoyé avec votre adresse en reply-to.
                </p>
                <button
                  onClick={handleSend}
                  disabled={
                    !subject.trim() ||
                    !message.trim() ||
                    sendState === 'sending' ||
                    !clientEmail
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendState === 'sending' ? (
                    <>
                      <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send size={14} strokeWidth={2} />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
