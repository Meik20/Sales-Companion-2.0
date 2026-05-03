'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { useGetAccessInfo } from '@/features/auth/hooks/useGetAccessInfo'
import { colors } from '@/styles/tokens'

type Props = {
  accessId: string
  onSuccess: () => void
}

export function ActivateMemberForm({ accessId, onSuccess }: Props) {
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                   = useState<string | null>(null)
  const [isPending, setIsPending]           = useState(false)

  const {
    data: accessInfo,
    isLoading: isLoadingInfo,
    isError: isErrorInfo,
    error: infoError,
  } = useGetAccessInfo(accessId)

  // L'email peut venir du document Firestore OU être saisi par le membre
  const resolvedEmail = accessInfo?.email || email.trim()
  const needsEmail    = !accessInfo?.email

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validations
    if (needsEmail && !email.trim()) {
      setError('Veuillez saisir votre adresse email.')
      return
    }
    if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Format d\'adresse email invalide.')
      return
    }
    if (!password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsPending(true)
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId, email: resolvedEmail, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'activation. Réessayez.')
    } finally {
      setIsPending(false)
    }
  }

  /* ── États de chargement / erreur du lien ── */
  if (isLoadingInfo) {
    return (
      <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
        Vérification du lien d&apos;activation…
      </div>
    )
  }

  if (isErrorInfo) {
    const errMsg = infoError instanceof Error ? infoError.message : 'Lien d\'activation invalide ou expiré.'
    return (
      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 10,
        padding: '16px 18px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
        <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 8, fontSize: 15 }}>Accès impossible</div>
        <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>{errMsg}</div>
        <div style={{ fontSize: 12, color: colors.textMid, marginTop: 12 }}>
          Si le problème persiste, contactez votre manager pour obtenir un nouveau lien.
        </div>
      </div>
    )
  }

  if (!accessInfo) {
    return (
      <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
        Impossible de charger les informations d&apos;accès.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Récapitulatif de l'accès */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        background: colors.bg, padding: 14, borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 3 }}>
            Identifiant d&apos;accès
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {accessId}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 3 }}>
            Nom
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            {accessInfo.firstname} {accessInfo.lastname}
          </div>
        </div>
        {accessInfo.company && (
          <div>
            <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 3 }}>
              Entreprise
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{accessInfo.company}</div>
          </div>
        )}
        {/* Email pré-renseigné depuis Firestore */}
        {accessInfo.email && (
          <div>
            <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 3 }}>
              Email (depuis votre profil)
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.green }}>
              {accessInfo.email}
            </div>
          </div>
        )}
      </div>

      {/* Saisie email uniquement si absent dans Firestore */}
      {needsEmail && (
        <FormField
          label="Votre adresse email"
          required
          hint="Votre email n'est pas encore enregistré — saisissez-le pour valider votre compte."
        >
          <Input
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            autoComplete="email"
          />
        </FormField>
      )}

      <FormField label="Nouveau mot de passe" required>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="Confirmer le mot de passe" required>
        <Input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
          autoComplete="new-password"
        />
      </FormField>

      {/* Bloc d'erreur global */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '12px 14px',
          fontSize: 13, color: '#ef4444', lineHeight: 1.5,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ fontSize: 12, color: colors.textMid, lineHeight: 1.7 }}>
        <p style={{ margin: '0 0 4px' }}>✓ Au moins 6 caractères</p>
        <p style={{ margin: 0 }}>✓ Lettres, chiffres et caractères spéciaux acceptés</p>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending || !password || !confirmPassword || (needsEmail && !email.trim())}
        loading={isPending}
        style={{ width: '100%', marginTop: 8 }}
      >
        {isPending ? 'Activation en cours...' : 'Activer mon compte'}
      </Button>
    </form>
  )
}
