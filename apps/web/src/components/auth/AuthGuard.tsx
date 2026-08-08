'use client'

import { PropsWithChildren, useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { auth } from '@/services/firebase/client'
import { Mail, RefreshCw, Clock } from 'lucide-react'
import { ScIcon } from '@/components/ui/ScIcon'
import { usePathname, useRouter } from 'next/navigation'
import { routes } from '@/constants/routes'

export function AuthGuard({ children }: PropsWithChildren) {
  const { user, loading } = useCurrentUser()
  const pathname = usePathname()
  const router = useRouter()
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Permet d'afficher la page /upgrade même si le compte manager n'est pas encore actif
  const isUpgradePage = pathname === '/upgrade' || pathname.startsWith('/upgrade?')

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ Email verification finalization
  // Quand Firebase Auth confirme l'email mais que Firestore a encore
  // emailVerificationPending=true, on appelle l'API pour mettre à jour Firestore.
  // ─────────────────────────────────────────────────────────────────────────
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
            // useCurrentUser récupère la mise à jour via onSnapshot — pas besoin de reload
          } catch {
            /* ignore */
          }
          setFinalizing(false)
        })
        .catch(() => setFinalizing(false))
    }
  }, [user, loading])

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ Rédirection automatique manager → /upgrade après vérification email
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || finalizing || !user) return
    if (user.role !== 'manager') return

    const emailVerificationPending = (user as any).emailVerificationPending
    const paymentPending = (user as any).paymentPending

    if (!emailVerificationPending && !user.active && !paymentPending && !isUpgradePage) {
      router.replace(`${routes.upgrade}?from=register`)
    }
  }, [user, loading, finalizing, isUpgradePage, router])

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ Rédirection automatique support_agent vers l'espace CRM unique
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !user) return
    if (user.role !== 'support_agent') return

    const restrictedPaths = ['/pipeline', '/reporting', '/search', '/saved']
    const isRestricted = restrictedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

    if (isRestricted || pathname === '/') {
      router.replace('/crm')
    }
  }, [user, loading, pathname, router])

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
      const token = await firebaseUser.getIdToken()
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) throw new Error("Erreur de l'API")

      setResendCooldown(60)
      setStatus({ type: 'success', message: 'Un nouvel email de vérification a été envoyé avec succès.' })
    } catch (error: any) {
      console.error("Erreur d'envoi de l'email de vérification :", error)
      setStatus({ type: 'error', message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer." })
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        <span
          className="inline-block h-8 w-8 rounded-full border-[3px] border-white/10"
          style={{ borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.8s linear infinite' }}
        />
        <p className="m-0 text-[14px]">Chargement…</p>
      </div>
    )
  }

  if (!user) return null

  // ── Email verification pending screen ────────────────────────────────────
  const isPending = !!(user as { emailVerificationPending?: boolean }).emailVerificationPending
  const firebaseEmailVerified = auth.currentUser?.emailVerified

  if (isPending && !firebaseEmailVerified && !finalizing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.5;} }
        ` }} />
        <div className="w-full max-w-[440px] rounded-[20px] border border-border bg-card p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <ScIcon size={44} style={{ marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />

          <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-primary/10">
            <Mail size={30} className="text-primary" />
          </div>

          <h1 className="mb-2.5 mt-0 text-[20px] font-extrabold text-foreground">
            Vérification email requise
          </h1>
          <p className="mb-6 mt-0 text-[14px] leading-relaxed text-muted-foreground">
            Votre compte a été créé mais votre email
            <br />
            <strong className="text-foreground">{user.email}</strong>
            <br />
            n&apos;est pas encore vérifié. Consultez votre boîte de réception.
          </p>

          <div className="mb-5 rounded-[10px] border border-primary/15 bg-primary/5 px-4 py-3.5 text-left text-[13px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Étapes :</strong>
            <ol className="mb-0 mt-2 pl-4">
              <li>Ouvrez l&apos;email de <strong>Sales Companion 2.0</strong></li>
              <li>Cliquez sur <strong>« Vérifier mon adresse email »</strong></li>
              <li>Revenez ici — votre accès s&apos;ouvrira automatiquement</li>
            </ol>
          </div>

          {status && (
            <div className={`mb-4 rounded-[10px] border px-3.5 py-2.5 text-center text-[13px] ${
              status.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}>
              {status.message}
            </div>
          )}

          <button
            onClick={() => void handleResend()}
            disabled={resendCooldown > 0 || resendLoading}
            className={`flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] border border-border text-[13px] text-muted-foreground transition-all duration-150 ${resendCooldown > 0 ? 'cursor-not-allowed bg-secondary' : 'cursor-pointer bg-transparent hover:bg-secondary'}`}
          >
            <RefreshCw
              size={14}
              style={{ animation: resendLoading ? 'spin 1s linear infinite' : 'none' }}
            />
            {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer l'email de vérification"}
          </button>

          <p className="mt-3.5 text-[11px] text-muted-foreground/60">
            Cette page se rafraîchit automatiquement dès que votre email est confirmé.
          </p>
        </div>
      </div>
    )
  }

  if (finalizing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <span
          className="inline-block h-8 w-8 rounded-full border-[3px] border-white/10"
          style={{ borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.8s linear infinite' }}
        />
        <p className="m-0 text-[14px]">Finalisation de l&apos;activation…</p>
      </div>
    )
  }

  // ── Account pending admin validation (Manager only) ──────────────────────
  const userPaymentPending = (user as any)?.paymentPending === true

  if (user.role === 'manager' && !user.active && userPaymentPending && !isUpgradePage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
        <div className="w-full max-w-[440px] rounded-[20px] border border-border bg-card p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <ScIcon size={44} style={{ marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />

          <div className="mx-auto mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-amber-500/10">
            <Clock size={30} className="text-amber-500" />
          </div>

          <h1 className="mb-2.5 mt-0 text-[20px] font-extrabold text-foreground">
            En attente de validation
          </h1>
          <p className="mb-2 mt-0 text-[14px] leading-relaxed text-muted-foreground">
            Votre paiement a bien été reçu et est en cours de vérification par notre équipe.
          </p>
          <p className="mb-6 mt-0 text-[13px] leading-relaxed text-muted-foreground">
            ⏳ Cette page se met à jour <strong>automatiquement</strong> dès que votre compte est activé.
            Vous n&apos;avez rien à faire.
          </p>

          <div className="mb-5 rounded-[10px] border border-amber-500/20 bg-amber-500/6 px-4 py-3 text-[12px] leading-relaxed text-amber-500">
            📬 Vous recevrez un email de confirmation une fois votre compte activé par l&apos;équipe Sales Companion.
          </div>

          <button
            onClick={() => window.location.href = '/upgrade?from=register'}
            className="flex h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-border bg-transparent text-[13px] text-muted-foreground transition-all duration-150 hover:bg-secondary"
          >
            Modifier ma demande de paiement
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
