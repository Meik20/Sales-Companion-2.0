'use client'

import { useState } from 'react'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionCard } from './SectionCard'
import { useCreateTeamAssignment } from '../hooks/useCreateTeamAssignment'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { colors } from '@/styles/tokens'

export function CreateAssignmentForm() {
  const [pipelineItemId, setPipelineItemId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [error, setError] = useState('')

  const { mutate: createAssignment, isPending } = useCreateTeamAssignment()
  const { data: members } = useTeamMembers()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!pipelineItemId.trim()) {
      setError('Veuillez entrer un ID de prospect')
      return
    }

    if (!memberId.trim()) {
      setError('Veuillez sélectionner un membre')
      return
    }

    createAssignment(
      {
        pipelineItemId: pipelineItemId.trim(),
        memberId: memberId.trim(),
      },
      {
        onSuccess: () => {
          setPipelineItemId('')
          setMemberId('')
          setError('')
        },
        onError: (err: Error) => {
          setError(err.message || 'Erreur lors de la création de l\'assignation')
        },
      }
    )
  }

  return (
    <SectionCard title="Assigner un prospect" subtitle="Attribuez un prospect à un membre de l'équipe">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="ID Prospect" required error={error && !memberId ? error : ''}>
          <Input
            type="text"
            placeholder="ex: prospect_123..."
            value={pipelineItemId}
            onChange={(e) => setPipelineItemId(e.target.value)}
            disabled={isPending}
            style={{
              fontSize: 13,
            }}
          />
        </FormField>

        <FormField label="Membre de l'équipe" required error={error && memberId ? error : ''}>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            disabled={isPending || !members?.length}
            style={{
              fontSize: 13,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.bg,
              color: colors.text,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 300ms ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2ea05a'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,160,90,0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <option value="">Sélectionner un membre...</option>
            {members?.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
        </FormField>

        {error && !pipelineItemId && !memberId && (
          <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isPending || !pipelineItemId.trim() || !memberId.trim()}
          loading={isPending}
          style={{ width: '100%' }}
        >
          {isPending ? 'Assignation en cours...' : 'Assigner le prospect'}
        </Button>
      </form>
    </SectionCard>
  )
}
