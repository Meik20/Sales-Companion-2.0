'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { useAuthActions } from '../hooks/useAuthActions'
import { mapAuthError } from '../utils/error-mapper'
import { routes } from '@/constants/routes'
import { colors } from '@/styles/tokens'

export function LoginForm() {
  const { loginWithEmail } = useAuthActions()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Activation mode
  const [isActivationMode, setIsActivationMode] = useState(false)
  const [accessId, setAccessId] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (isActivationMode) {
      if (!accessId || !email || !password || !confirmPassword) {
        setError('Veuillez remplir tous les champs.')
        return
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api'
        const res = await fetch(`${backendUrl.replace('/api', '')}/api/team/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessId, email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.message || "Erreur d'activation")
        
        // Connexion automatique
        await loginWithEmail(email, password)
        router.replace(routes.search)
      } catch (err: any) {
        setError(err.message || 'Erreur réseau')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      await loginWithEmail(email, password)
      router.replace(routes.search)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ScIcon size={48} interactive style={{ marginBottom: 16 }} />
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 22,
            fontWeight: 800,
            color: colors.text,
            fontFamily: "'Syne',sans-serif",
            letterSpacing: '-.03em',
          }}
        >
          {isActivationMode ? 'Activer mon accès' : 'Connexion'}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
          {isActivationMode ? 'Renseignez l\'ID fourni par votre manager.' : 'Bienvenue sur Sales Companion'}
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isActivationMode && (
          <FormField label="Identifiant d'accès (Access ID)" required>
            <Input
              type="text"
              placeholder="Ex: jeandupont@entreprise"
              value={accessId}
              onChange={(e) => setAccessId(e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Email" required>
          <Input
            type="email"
            placeholder="vous@exemple.cm"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField label={isActivationMode ? "Nouveau mot de passe" : "Mot de passe"} required>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            autoComplete={isActivationMode ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {isActivationMode && (
          <FormField label="Confirmer le mot de passe" required>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormField>
        )}

        {error ? (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              fontSize: 13,
              color: '#f87171',
            }}
          >
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 4 }}>
          {isActivationMode ? 'Activer mon compte' : 'Se connecter'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          style={{ width: '100%' }}
          onClick={() => {
            setIsActivationMode(!isActivationMode)
            setError(null)
          }}
        >
          {isActivationMode ? 'Retour à la connexion' : 'J\'ai un accès équipe à activer'}
        </Button>
      </form>

      {!isActivationMode && (
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: colors.textMid }}>
          Pas encore de compte ?{' '}
          <Link
            href={routes.register}
            style={{ color: colors.greenMid, fontWeight: 600 }}
          >
            Créer un compte
          </Link>
        </p>
      )}
    </div>
  )
}
