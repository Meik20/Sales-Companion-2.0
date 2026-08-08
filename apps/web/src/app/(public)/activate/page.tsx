'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/services/firebase/client'
import { ActivateMemberForm } from '@/features/team/components/ActivateMemberForm'
import { ScIcon } from '@/components/ui/ScIcon'
import { routes } from '@/constants/routes'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

type ActivateStep =
  | 'form' // initial form
  | 'check-email' // email sent, waiting for click
  | 'verified' // email verified, redirecting

function ActivateContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlAccessId = searchParams.get('accessId') ?? searchParams.get('code') ?? ''
  const [accessId, setAccessId] = useState(urlAccessId)
  const [manualAccessId, setManualAccessId] = useState('')
  const [step, setStep] = useState<ActivateStep>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // Poll emailVerified once on the "check-email" screen
  useEffect(() => {
    if (step !== 'check-email') return
    const interval = setInterval(async () => {
      const currentUser = auth.currentUser
      if (!currentUser) return
      await currentUser.reload()
      if (currentUser.emailVerified) {
        // Call the finalize endpoint
        try {
          const token = await currentUser.getIdToken(true)
          await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          })
        } catch {
          /* ignore */
        }
        setStep('verified')
        clearInterval(interval)
        setTimeout(() => router.replace(routes.search), 2000)
      }
    }, 3000) // check every 3 seconds
    return () => clearInterval(interval)
  }, [step, router])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualAccessId.trim()) setAccessId(manualAccessId.trim())
  }

  // Called by ActivateMemberForm after the API creates the Firebase user
  async function handleActivationSuccess(email: string, password: string) {
    setPendingEmail(email)
    try {
      // Sign in silently to get the Firebase user object
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
      // Send verification email
      await sendEmailVerification(firebaseUser, {
        url: `${window.location.origin}${routes.login}`,
        handleCodeInApp: false
      })
      setResendCooldown(60)
      setStep('check-email')
    } catch (err) {
      console.error('Email verification send failed:', err)
      // Still move to check-email — user may have to request manually
      setStep('check-email')
    }
  }

  async function handleResend() {
    const currentUser = auth.currentUser
    if (!currentUser || resendCooldown > 0) return
    setResendLoading(true)
    setStatus(null)
    try {
      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}${routes.login}`,
        handleCodeInApp: false
      })
      setResendCooldown(60)
      setStatus({
        type: 'success',
        message: 'Un nouvel email de vérification a été envoyé avec succès.'
      })
    } catch (err: any) {
      console.error('Resend failed:', err)
      let customError = err?.message || "Une erreur est survenue lors de l'envoi."
      if (err?.code === 'auth/too-many-requests') {
        customError = "Trop de requêtes. Veuillez attendre un moment avant de réessayer."
      } else if (err?.code === 'auth/unauthorized-continue-uri') {
        customError = "L'URL de redirection n'est pas autorisée dans la console Firebase."
      }
      setStatus({
        type: 'error',
        message: customError
      })
    } finally {
      setResendLoading(false)
    }
  }

  // ── Screen: no accessId yet ──────────────────────────────────────────────
  if (!accessId) {
    return (
      <main style={cardPage}>
        <div style={card}>
          <div style={cardHeader}>
            <ScIcon size={48} style={{ marginBottom: 14 }} />
            <h1 style={h1}>{t('auth.companyAccess')}</h1>
            <p style={sub}>{t('auth.enterAccessCode')}</p>
          </div>
          <form
            onSubmit={handleManualSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <FormField label={t('auth.accessId')} required>
              <Input
                type="text"
                placeholder="Ex: dU8k2... ou prenomnom@entreprise"
                value={manualAccessId}
                onChange={(e) => setManualAccessId(e.target.value)}
              />
            </FormField>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              style={{ width: '100%', marginTop: 8 }}
              disabled={!manualAccessId.trim()}
            >
              {t('auth.continue')}
            </Button>
          </form>
        </div>
      </main>
    )
  }

  // ── Screen: check your inbox ─────────────────────────────────────────────
  if (step === 'check-email') {
    return (
      <main style={cardPage}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(55,138,221,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Mail size={32} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h1 style={{ ...h1, marginBottom: 8 }}>{t('auth.checkEmail')}</h1>
            <p style={sub}>
              {t('auth.verificationEmailSent')}
              <br />
              <strong style={{ color: 'var(--foreground, #f1f5f9)' }}>{pendingEmail}</strong>
            </p>
          </div>

          <div
            style={{
              background: 'rgba(55,138,221,0.06)',
              border: `1px solid rgba(55,138,221,0.2)`,
              borderRadius: 12,
              padding: '16px 18px',
              fontSize: 13.5,
              color: 'var(--muted-foreground, #94a3b8)',
              lineHeight: 1.7,
              marginBottom: 20
            }}
          >
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
              {t('auth.howToProceed')}
            </p>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>{t('auth.proceedStep1')}</li>
              <li>{t('auth.proceedStep2')}</li>
              <li>{t('auth.proceedStep3')}</li>
            </ol>
          </div>

          <p style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)', textAlign: 'center', marginBottom: 12 }}>
            {t('auth.noEmail')}
          </p>

          {status && (
            <div
              style={{
                background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: status.type === 'success' ? '#4ade80' : '#f87171',
                textAlign: 'center',
                marginBottom: 16
              }}
            >
              {status.message}
            </div>
          )}

          <button
            onClick={() => void handleResend()}
            disabled={resendCooldown > 0 || resendLoading}
            style={{
              width: '100%',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: resendCooldown > 0 ? 'var(--secondary, #1e2a3b)' : 'transparent',
              border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
              borderRadius: 10,
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              color: 'var(--muted-foreground, #94a3b8)',
              fontSize: 13,
              fontFamily: 'inherit',
              transition: 'all 150ms ease'
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: resendLoading ? 'spin 1s linear infinite' : 'none' }}
            />
            {resendCooldown > 0
              ? t('auth.resendIn').replace('{seconds}', String(resendCooldown))
              : t('auth.resend')}
          </button>

          <p style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)', textAlign: 'center', marginTop: 16 }}>
            {t('auth.pageAutoUpdates')}
          </p>
        </div>
      </main>
    )
  }

  // ── Screen: verified ─────────────────────────────────────────────────────
  if (step === 'verified') {
    return (
      <main style={{ ...cardPage, flexDirection: 'column', gap: 16 }}>
        <CheckCircle size={52} style={{ color: 'var(--color-success)' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground, #f1f5f9)', margin: 0 }}>
          {t('auth.emailVerified')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground, #94a3b8)', margin: 0 }}>{t('auth.accountActive')}</p>
      </main>
    )
  }

  // ── Screen: activation form ───────────────────────────────────────────────
  return (
    <main style={cardPage}>
      <div style={card}>
        <div style={cardHeader}>
          <ScIcon size={48} style={{ marginBottom: 14 }} />
          <h1 style={h1}>{t('auth.activateHeader')}</h1>
          <p style={sub}>{t('auth.activateHeaderSub')}</p>
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(55,138,221,0.08)',
              border: '1px solid rgba(55,138,221,0.2)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12.5,
              color: 'var(--color-accent)'
            }}
          >
            <Mail size={14} />
            <span>{t('auth.emailWillBeSent')}</span>
          </div>
        </div>
        <ActivateMemberForm
          accessId={accessId}
          onSuccess={(email: string, password: string) =>
            void handleActivationSuccess(email, password)
          }
        />
      </div>
    </main>
  )
}

// ── Style constants ───────────────────────────────────────────────────────────
const cardPage: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--background, #0b1120)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px'
}
const card: React.CSSProperties = {
  background: 'var(--card, #131c2e)',
  border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
  borderRadius: 20,
  padding: 40,
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
}
const cardHeader: React.CSSProperties = { textAlign: 'center', marginBottom: 28 }
const h1: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 22,
  fontWeight: 800,
  color: 'var(--foreground, #f1f5f9)',
  fontFamily: "'Syne',sans-serif"
}
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }

export default function ActivatePage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Chargement...</div>}>
      <ActivateContent />
    </Suspense>
  )
}
