'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { confirmPasswordReset, applyActionCode, checkActionCode } from 'firebase/auth'
import { auth } from '@/services/firebase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { colors } from '@/styles/tokens'
import { mapAuthError } from '@/features/auth/utils/error-mapper'

function AuthActionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const mode = searchParams.get('mode') // 'resetPassword' | 'verifyEmail' | 'recoverEmail'
  const oobCode = searchParams.get('oobCode')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Password reset state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailAddress, setEmailAddress] = useState<string | null>(null)

  // Auto-verify email if mode is verifyEmail
  useEffect(() => {
    if (mode === 'verifyEmail' && oobCode) {
      setLoading(true)
      applyActionCode(auth, oobCode)
        .then(() => {
          setSuccess(true)
          setLoading(false)
        })
        .catch((err: unknown) => {
          console.error(err)
          setError("Ce lien de validation est invalide ou a déjà expiré.")
          setLoading(false)
        })
    } else if (mode === 'resetPassword' && oobCode) {
      // Check the action code to verify it's valid and get the associated email
      checkActionCode(auth, oobCode)
        .then((info) => {
          setEmailAddress(info.data.email || null)
        })
        .catch((err: unknown) => {
          console.error(err)
          setError("Le lien de réinitialisation est invalide ou a expiré.")
        })
    }
  }, [mode, oobCode])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oobCode) return

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await confirmPasswordReset(auth, oobCode, password)
      setSuccess(true)
      setLoading(false)
    } catch (err: unknown) {
      console.error(err)
      setError(mapAuthError(err))
      setLoading(false)
    }
  }

  // Common Layout Card wrapper
  const renderCard = (title: string, children: React.ReactNode) => (
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        background: colors.bg2,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 20,
        padding: '40px 32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <ScIcon size={44} className="sc-icon" />
      </div>
      <h1
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 24,
          fontWeight: 800,
          textAlign: 'center',
          color: colors.text,
          marginBottom: 8
        }}
      >
        {title}
      </h1>
      {children}
    </div>
  )

  // 1. Loading State
  if (loading && mode === 'verifyEmail') {
    return renderCard("Validation de l'e-mail", (
      <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textMid }}>
        <p>Validation de votre adresse e-mail en cours...</p>
      </div>
    ))
  }

  // 2. Invalid or missing action code
  if (!mode || !oobCode) {
    return renderCard("Action requise", (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ color: colors.textMid, fontSize: 14, marginBottom: 24 }}>
          Aucune action valide n&apos;a été détectée. Veuillez utiliser le lien reçu par e-mail.
        </p>
        <Button onClick={() => router.push('/login')} style={{ width: '100%' }}>
          Retour à la connexion
        </Button>
      </div>
    ))
  }

  // 3. Email Verification flow
  if (mode === 'verifyEmail') {
    if (success) {
      return renderCard("E-mail validé !", (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: '#4ade80', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Félicitations ! Votre adresse e-mail a été validée avec succès. Vous pouvez maintenant vous connecter à la plateforme.
          </p>
          <Button onClick={() => router.push('/login')} variant="primary" style={{ width: '100%' }}>
            Se connecter
          </Button>
        </div>
      ))
    }

    return renderCard("Erreur de validation", (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <p style={{ color: '#f87171', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {error || "Le code de validation est invalide ou a expiré."}
        </p>
        <Button onClick={() => router.push('/login')} variant="outline" style={{ width: '100%' }}>
          Retour à la connexion
        </Button>
      </div>
    ))
  }

  // 4. Password Reset flow
  if (mode === 'resetPassword') {
    if (success) {
      return renderCard("Mot de passe modifié !", (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: '#4ade80', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <Button onClick={() => router.push('/login')} variant="primary" style={{ width: '100%' }}>
            Se connecter
          </Button>
        </div>
      ))
    }

    return renderCard("Réinitialisation", (
      <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {emailAddress && (
          <p style={{ fontSize: 13, color: colors.textMid, textAlign: 'center', marginBottom: 8 }}>
            Pour le compte : <strong>{emailAddress}</strong>
          </p>
        )}

        <FormField label="Nouveau mot de passe" required>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Confirmer le nouveau mot de passe" required>
          <Input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </FormField>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              fontSize: 13,
              color: '#f87171'
            }}
          >
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 8 }}>
          Enregistrer le nouveau mot de passe
        </Button>

        <Link href="/login" style={{ textAlign: 'center', fontSize: 13, color: colors.greenMid, textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>
          Retour à la connexion
        </Link>
      </form>
    ))
  }

  // 5. Fallback for other modes
  return renderCard("Action d'authentification", (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <p style={{ color: colors.textMid, fontSize: 14, marginBottom: 24 }}>
        Traitement de votre demande d&apos;authentification...
      </p>
      <Button onClick={() => router.push('/login')} style={{ width: '100%' }}>
        Retour à la connexion
      </Button>
    </div>
  ))
}

export default function AuthActionPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px'
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: '-200px',
          left: '-200px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(27,122,62,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Suspense fallback={<div>Chargement...</div>}>
          <AuthActionContent />
        </Suspense>
      </div>
    </main>
  )
}
