'use client'

import { useState } from 'react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getErrorMessage } from '@/lib/errors'
import { useCreatePipelineItem } from '../hooks/useCreatePipelineItem'
import { colors } from '@/styles/tokens'

type Props = {
  onSuccess?: () => void
}

const STATUS_OPTIONS = [
  { value: 'prospection', label: 'Prospection' },
  { value: 'negociation', label: 'Négociation' },
  { value: 'conclue',     label: 'Conclue' },
]

export function CreatePipelineItemForm({ onSuccess }: Props) {
  const { user } = useCurrentUser()
  const mutation = useCreatePipelineItem()

  const [companyName,   setCompanyName]   = useState('')
  const [companyCity,   setCompanyCity]   = useState('')
  const [companySector, setCompanySector] = useState('')
  const [note,          setNote]          = useState('')
  const [nextAction,    setNextAction]    = useState('')
  const [status,        setStatus]        = useState<'prospection' | 'negociation' | 'conclue'>('prospection')
  const [error,         setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { setError('Utilisateur introuvable'); return }
    if (!companyName.trim()) { setError('Le nom de l\'entreprise est requis'); return }

    setError(null)
    try {
      await mutation.mutateAsync({
        userId:        user.uid,
        managerUid:    user.role === 'member' ? (user.managerUid ?? null) : user.uid,
        companyId:     null,
        companyName:   companyName.trim(),
        companySector: companySector || undefined,
        companyCity:   companyCity   || undefined,
        status,
        note:          note          || undefined,
        nextAction:    nextAction    || undefined,
        nextDate:      null,
        createdAt:     null,
        updatedAt:     null,
      })
      setCompanyName('')
      setCompanyCity('')
      setCompanySector('')
      setNote('')
      setNextAction('')
      setStatus('prospection')
      onSuccess?.()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <FormField label="Entreprise" required>
          <Input
            placeholder="Nom de l'entreprise"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </FormField>

        <FormField label="Ville">
          <Input
            placeholder="Douala, Yaoundé…"
            value={companyCity}
            onChange={(e) => setCompanyCity(e.target.value)}
          />
        </FormField>

        <FormField label="Secteur">
          <Input
            placeholder="BTP, Commerce…"
            value={companySector}
            onChange={(e) => setCompanySector(e.target.value)}
          />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <FormField label="Statut">
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value as typeof status)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${status === opt.value ? 'rgba(46,160,90,0.5)' : colors.border}`,
                  background: status === opt.value ? 'rgba(27,122,62,0.15)' : 'transparent',
                  color: status === opt.value ? colors.greenMid : colors.textMid,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 200ms ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Note">
          <Input
            placeholder="Observations…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>

        <FormField label="Prochaine action">
          <Input
            placeholder="Rappel, démo, RDV…"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
          />
        </FormField>
      </div>

      {error ? (
        <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="md" loading={mutation.isPending}>
          Ajouter au pipeline
        </Button>
      </div>
    </form>
  )
}
