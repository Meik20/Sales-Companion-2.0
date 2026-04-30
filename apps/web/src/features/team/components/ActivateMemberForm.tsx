'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { useActivateMember } from '@/features/auth/hooks/useActivateMember'
import { useGetAccessInfo } from '@/features/auth/hooks/useGetAccessInfo'
import { colors } from '@/styles/tokens'

type Props = {
  accessId: string
  onSuccess: () => void
}

export function ActivateMemberForm({ accessId, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: accessInfo, isLoading: isLoadingInfo, isError: isErrorInfo } = useGetAccessInfo(accessId)
  const { mutate: activateMember, isPending } = useActivateMember()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validations
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

    activateMember(
      { accessId, password },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (err: Error) => {
          setError(err.message || 'Erreur lors de l\'activation.')
        },
      }
    )
  }

  if (isLoadingInfo) {
    return (
      <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
        Chargement des informations...
      </div>
    )
  }

  if (isErrorInfo) {
    return (
      <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
        Lien d&apos;activation invalide ou expiré.
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
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: colors.bg1, padding: 14, borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 3 }}>
            Nom
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            {accessInfo.firstname} {accessInfo.lastname}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: colors.textDim, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 3 }}>
            Entreprise
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            {accessInfo.company}
          </div>
        </div>
      </div>

      <FormField label="Mot de passe" required error={error && password ? error : ''}>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          autoComplete="new-password"
        />
      </FormField>

      <FormField
        label="Confirmer le mot de passe"
        required
        error={error && confirmPassword ? error : ''}
      >
        <Input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
          autoComplete="new-password"
        />
      </FormField>

      {error && !password && !confirmPassword && (
        <div style={{ fontSize: 13, color: '#f87171', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div
        style={{
          fontSize: 12,
          color: colors.textMid,
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: '0 0 8px' }}>
          ✓ Au moins 6 caractères
        </p>
        <p style={{ margin: 0 }}>
          ✓ Lettres, chiffres et caractères spéciaux acceptés
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending || !password || !confirmPassword}
        loading={isPending}
        style={{ width: '100%', marginTop: 8 }}
      >
        {isPending ? 'Activation en cours...' : 'Activer mon compte'}
      </Button>
    </form>
  )
}
