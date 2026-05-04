'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { SectionCard } from './SectionCard'
import { useCreateTeamAssignment } from '../hooks/useCreateTeamAssignment'
import { useActiveTeamMembers } from '../hooks/useTeamMembers'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import type { Prospect } from '@/features/imports/components/ManagerProspectsList'

type Props = {
  /** Prospects pre-selected from ManagerProspectsList */
  selectedProspects?: Prospect[]
  /** Called after all assignments have been created */
  onAssigned?: () => void
}

type PipelineItem = {
  id: string
  companyName: string
  status: string
}

const SELECT_STYLE: React.CSSProperties = {
  fontSize: 13,
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: colors.bg,
  color: colors.text,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 300ms ease',
  width: '100%',
}

function focusStyle(el: HTMLSelectElement) {
  el.style.borderColor = '#2ea05a'
  el.style.boxShadow = '0 0 0 3px rgba(46,160,90,0.1)'
}
function blurStyle(el: HTMLSelectElement, border: string) {
  el.style.borderColor = border
  el.style.boxShadow = 'none'
}

export function CreateAssignmentForm({ selectedProspects = [], onAssigned }: Props) {
  const [pipelineItemId, setPipelineItemId] = useState('')
  const [memberId, setMemberId]             = useState('')
  const [error, setError]                   = useState('')
  const [successCount, setSuccessCount]     = useState(0)

  const [pipelineProspects, setPipelineProspects] = useState<PipelineItem[]>([])
  const [loadingPipeline, setLoadingPipeline]     = useState(false)

  const { user } = useCurrentUser()
  const { mutate: createAssignment, isPending } = useCreateTeamAssignment()
  const { data: members } = useActiveTeamMembers()
  const queryClient = useQueryClient()


  // Load pipeline prospects
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setPipelineProspects([])
        setLoadingPipeline(false)
        return
      }

      try {
        setLoadingPipeline(true)
        const token = await user.getIdToken()
        const res = await fetch('/api/pipeline/manager', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setPipelineProspects(data ?? [])
        }
      } catch {
        // silently ignore
      } finally {
        setLoadingPipeline(false)
      }
    }
    void load()
  }, [user])

  // ── Mode: single assignment (from pipeline dropdown) ──────────────────────
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pipelineItemId.trim()) { setError('Veuillez sélectionner un prospect'); return }
    if (!memberId.trim())       { setError('Veuillez sélectionner un membre');   return }

    createAssignment(
      { pipelineItemId: pipelineItemId.trim(), memberId: memberId.trim() },
      {
        onSuccess: () => {
          setPipelineItemId('')
          setMemberId('')
          setError('')
          setSuccessCount((n) => n + 1)
          onAssigned?.()
        },
        onError: (err: Error) => {
          setError(err.message || "Erreur lors de la création de l'assignation")
        },
      }
    )
  }

  // ── Mode: bulk assignment (from ManagerProspectsList checkboxes) ───────────
  const hasBulk = selectedProspects.length > 0

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!memberId.trim()) { setError('Veuillez sélectionner un membre'); return }

    const token = await user?.getIdToken()
    let done = 0
    for (const prospect of selectedProspects) {
      const res = await fetch('/api/team/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pipelineItemId: prospect.id,
          memberId: memberId.trim(),
        }),
      })
      if (res.ok) done++
    }
    setSuccessCount((n) => n + done)
    setMemberId('')
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['team-assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] }),
    ])
    onAssigned?.()
  }


  return (
    <SectionCard
      title="Assigner un prospect"
      subtitle={
        hasBulk
          ? `${selectedProspects.length} prospect${selectedProspects.length > 1 ? 's' : ''} sélectionné${selectedProspects.length > 1 ? 's' : ''} depuis la liste`
          : "Attribuez un prospect à un membre de l'équipe"
      }
    >
      {successCount > 0 && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(46,160,90,0.1)', border: '1px solid rgba(46,160,90,0.25)',
          fontSize: 13, color: '#2ea05a', fontWeight: 600,
        }}>
          ✓ {successCount} assignation{successCount > 1 ? 's' : ''} créée{successCount > 1 ? 's' : ''} avec succès
        </div>
      )}

      <form
        onSubmit={hasBulk ? handleBulkSubmit : handleSingleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* ── Bulk mode: show the selected prospect names ── */}
        {hasBulk ? (
          <FormField label="Prospects sélectionnés" required>
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${colors.border}`, background: colors.bg,
              maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {selectedProspects.map((p) => (
                <div key={p.id} style={{ fontSize: 12.5, color: colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#2ea05a', fontSize: 11 }}>▸</span>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  {p.city && <span style={{ color: colors.textMid }}>— {p.city}</span>}
                </div>
              ))}
            </div>
          </FormField>
        ) : (
          /* ── Single mode: pipeline dropdown ── */
          <FormField label="Prospect" required error={error && !memberId ? error : ''}>
            <select
              value={pipelineItemId}
              onChange={(e) => setPipelineItemId(e.target.value)}
              disabled={isPending || loadingPipeline}
              style={SELECT_STYLE}
              onFocus={(e) => focusStyle(e.currentTarget)}
              onBlur={(e) => blurStyle(e.currentTarget, colors.border)}
            >
              <option value="">
                {loadingPipeline ? 'Chargement…' : pipelineProspects.length === 0 ? 'Aucun prospect disponible' : 'Sélectionner un prospect…'}
              </option>
              {pipelineProspects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.companyName} ({p.status})
                </option>
              ))}
            </select>
          </FormField>
        )}

        {/* ── Member selector — always shows only ACTIVE members ── */}
        <FormField label="Membre de l'équipe" required error={error && memberId ? error : ''}>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            disabled={isPending || members.length === 0}
            style={SELECT_STYLE}
            onFocus={(e) => focusStyle(e.currentTarget)}
            onBlur={(e) => blurStyle(e.currentTarget, colors.border)}
          >
            <option value="">
              {members.length === 0 ? 'Aucun membre actif' : 'Sélectionner un membre…'}
            </option>
            {members.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
          {members.length === 0 && (
            <p style={{ fontSize: 11, color: colors.textMid, margin: '4px 0 0' }}>
              Aucun membre actif. Les membres doivent activer leur compte avant d&apos;être assignables.
            </p>
          )}
        </FormField>

        {error && !pipelineItemId && !memberId && (
          <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={
            isPending ||
            !memberId.trim() ||
            (!hasBulk && !pipelineItemId.trim())
          }
          loading={isPending}
          style={{ width: '100%' }}
        >
          {isPending
            ? 'Assignation en cours…'
            : hasBulk
            ? `Assigner ${selectedProspects.length} prospect${selectedProspects.length > 1 ? 's' : ''}`
            : 'Assigner le prospect'}
        </Button>
      </form>
    </SectionCard>
  )
}
