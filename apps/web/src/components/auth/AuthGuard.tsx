'use client'

import { PropsWithChildren, useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { auth } from '@/services/firebase/client'
import { sendEmailVerification } from 'firebase/auth'
import { colors } from '@/styles/tokens'
import { Mail, RefreshCw } from 'lucide-react'
import { ScIcon } from '@/components/ui/ScIcon'

export function AuthGuard({ children }: PropsWithChildren) {
  const { user, loading } = useCurrentUser()
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Check if the Firebase user has verified their email — if yes, finalize activation
  useEffect(() => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser || loading) return

    const isPending = (user as { emailVerificationPending?: boolean } | null)
      ?.emailVerificationPending

    if (firebaseUser.emailVerified && isPending) {
      setFinalizing(true)
      firebaseUser
        .getIdToken(true)
        .then(async (token) => {
          try {
            await fetch('/api/auth/verify-email', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            })
            // Force page reload to re-fetch user doc with activated: true
            window.location.reload()
          } catch {
            /* ignore */
          }
          setFinalizing(false)
        })
        .catch(() => setFinalizing(false))
    }
  }, [user, loading])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function handleResend() {
    const firebaseUser = auth.currentUser
    if (!firebaseUser || resendCooldown > 0) return
    setResendLoading(true)
    setStatus(null)
    try {
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login',
        handleCodeInApp: false
      }
      await sendEmailVerification(firebaseUser, actionCodeSettings)
      setResendCooldown(60)
      setStatus({
        type: 'success',
        message: 'Un nouvel email de vérification a été envoyé avec succès.'
      })
    } catch (error: any) {
      console.error("Erreur d'envoi de l'email de vérification :", error)
      let customError = error?.message || "Une erreur est survenue lors de l'envoi."
      if (error?.code === 'auth/too-many-requests') {
        customError = "Trop de requêtes. Veuillez attendre un moment avant de réessayer."
      } else if (error?.code === 'auth/unauthorized-continue-uri') {
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

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/')
    }
  }, [user, loading])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          color: colors.textMid
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: colors.greenMid,
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ margin: 0, fontSize: 14 }}>Chargement…</p>
      </div>
    )
  }

  if (!user) return null

  // ── Email verification pending screen ─────────────────────────────────────
  // SUSPENDU: On désactive temporairement le blocage
  const isPending = false // (user as { emailVerificationPending?: boolean }).emailVerificationPending
  const firebaseEmailVerified = auth.currentUser?.emailVerified

  if (isPending && !firebaseEmailVerified && !finalizing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px'
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.5;} }
        `
          }}
        />
        <div
          style={{
            background: colors.bg2,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 40,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            textAlign: 'center'
          }}
        >
          <ScIcon size={44} style={{ marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />

          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(55,138,221,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}
          >
            <Mail size={30} style={{ color: 'var(--color-accent)' }} />
          </div>

          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: colors.text,
              fontFamily: "'Syne',sans-serif",
              margin: '0 0 10px'
            }}
          >
            Vérification email requise
          </h1>
          <p style={{ fontSize: 14, color: colors.textMid, lineHeight: 1.7, margin: '0 0 24px' }}>
            Votre compte a été créé mais votre email
            <br />
            <strong style={{ color: colors.text }}>{user.email}</strong>
            <br />
            n&apos;est pas encore vérifié. Consultez votre boîte de réception.
          </p>

          <div
            style={{
              background: 'rgba(55,138,221,0.05)',
              border: '1px solid rgba(55,138,221,0.15)',
              borderRadius: 10,
              padding: '14px 16px',
              fontSize: 13,
              color: colors.textMid,
              lineHeight: 1.7,
              textAlign: 'left',
              marginBottom: 20
            }}
          >
            <strong style={{ color: colors.text }}>Étapes :</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 16 }}>
              <li>
                Ouvrez l&apos;email de <strong>Sales Companion 2.0</strong>
              </li>
              <li>
                Cliquez sur <strong>« Vérifier mon adresse email »</strong>
              </li>
              <li>Revenez ici — votre accès s&apos;ouvrira automatiquement</li>
            </ol>
          </div>

          {status && (
            <div
              style={{
                background: status.type === 'success' ? colors.successBg : colors.dangerBg,
                border: `1px solid ${status.type === 'success' ? colors.successBorder : colors.dangerBorder}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: status.type === 'success' ? colors.success : colors.danger,
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
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: resendCooldown > 0 ? colors.bg3 : 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              color: colors.textMid,
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
              ? `Renvoyer dans ${resendCooldown}s`
              : "Renvoyer l'email de vérification"}
          </button>

          <p style={{ fontSize: 11, color: colors.textDim, marginTop: 14 }}>
            Cette page se rafraîchit automatiquement dès que votre email est confirmé.
          </p>
        </div>
      </div>
    )
  }

  if (finalizing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          color: colors.textMid
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ margin: 0, fontSize: 14 }}>Finalisation de l&apos;activation…</p>
      </div>
    )
  }

  return <>{children}</>
}
