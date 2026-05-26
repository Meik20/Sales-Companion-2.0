'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { SectionCard } from './SectionCard'
import { useCreateTeamAssignment } from '../hooks/useCreateTeamAssignment'
import { useActiveTeamMembers } from '../hooks/useTeamMembers'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors, shadows } from '@/styles/tokens'
import type { Prospect } from '@/features/imports/components/ManagerProspectsList'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Users,
  Building2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ListFilter,
  Trash2,
  Building,
  MapPin,
  Search
} from 'lucide-react'

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
  fontSize: 14,
  padding: '12px 14px',
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  background: colors.bg2,
  color: colors.text,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 200ms ease',
  width: '100%',
  appearance: 'none',
  outline: 'none',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
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
  const { t } = useTranslation()
  const [pipelineItemId, setPipelineItemId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [error, setError] = useState('')
  const [successCount, setSuccessCount] = useState(0)

  const [pipelineProspects, setPipelineProspects] = useState<PipelineItem[]>([])
  const [loadingPipeline, setLoadingPipeline] = useState(false)

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
            Authorization: `Bearer ${token}`
          }
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
    if (!pipelineItemId.trim()) {
      setError(t('team.selectProspect'))
      return
    }
    if (!memberId.trim()) {
      setError(t('team.selectMember'))
      return
    }

    const selectedP = pipelineProspects.find((p) => p.id === pipelineItemId)
    createAssignment(
      {
        pipelineItemId: pipelineItemId.trim(),
        memberId: memberId.trim(),
        companyName: selectedP?.companyName
      },
      {
        onSuccess: () => {
          setPipelineItemId('')
          setMemberId('')
          setError('')
          setSuccessCount((n) => n + 1)
          onAssigned?.()
        },
        onError: (err: Error) => {
          setError(err.message || t('support.errorLoad')) // fallback error msg
        }
      }
    )
  }

  // ── Mode: bulk assignment (from ManagerProspectsList checkboxes) ───────────
  const hasBulk = selectedProspects.length > 0

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!memberId.trim()) {
      setError(t('team.selectMember'))
      return
    }

    const token = await user?.getIdToken()
    let done = 0
    for (const prospect of selectedProspects) {
      const res = await fetch('/api/team/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          pipelineItemId: prospect.id,
          memberId: memberId.trim(),
          companyName: prospect.name || prospect.companyName || (prospect as any).raisonSociale
        })
      })
      if (res.ok) done++
    }
    setSuccessCount((n) => n + done)
    setMemberId('')
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
      queryClient.invalidateQueries({ queryKey: ['team-assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    ])
    onAssigned?.()
  }

  return (
    <SectionCard
      title={t('team.assignProspect')}
      subtitle={
        hasBulk
          ? `${selectedProspects.length} ${t('team.assignProspectBulk')}`
          : t('team.assignProspectSingle')
      }
    >
      {successCount > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 13,
            color: '#16a34a',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'slideDown 200ms ease'
          }}
        >
          <CheckCircle2 size={16} />
          {successCount} {t('team.successCreated')}
        </div>
      )}

      <form
        onSubmit={hasBulk ? handleBulkSubmit : handleSingleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* ── Bulk mode: show the selected prospect names ── */}
        {hasBulk ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.textMid,
                textTransform: 'uppercase',
                paddingLeft: 4
              }}
            >
              {t('team.selectedProspects')}
            </label>
            <div
              style={{
                padding: '12px',
                borderRadius: 12,
                background: colors.bg3,
                border: `1px solid ${colors.border}`,
                maxHeight: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)'
              }}
            >
              {selectedProspects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    fontSize: 12.5,
                    color: colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: 'white',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <Building size={14} style={{ color: colors.info, opacity: 0.7 }} />
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  {p.city && (
                    <span
                      style={{
                        fontSize: 11,
                        color: colors.textMid,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      <MapPin size={10} /> {p.city}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Single mode: pipeline dropdown ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.textMid,
                textTransform: 'uppercase',
                paddingLeft: 4
              }}
            >
              {t('team.prospect')}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={pipelineItemId}
                onChange={(e) => setPipelineItemId(e.target.value)}
                disabled={isPending || loadingPipeline}
                style={SELECT_STYLE}
                onFocus={(e) => focusStyle(e.currentTarget)}
                onBlur={(e) => blurStyle(e.currentTarget, colors.border)}
              >
                <option value="">
                  {loadingPipeline
                    ? t('team.loading')
                    : pipelineProspects.length === 0
                      ? t('team.noProspectAvailable')
                      : t('team.selectProspect')}
                </option>
                {pipelineProspects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.companyName} ({p.status})
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: colors.textDim
                }}
              >
                <ChevronDown size={18} />
              </div>
            </div>
            {error && !pipelineItemId && (
              <div style={{ fontSize: 11, color: '#f87171', paddingLeft: 4 }}>{error}</div>
            )}
          </div>
        )}

        {/* ── Member selector — always shows only ACTIVE members ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.textMid,
              textTransform: 'uppercase',
              paddingLeft: 4
            }}
          >
            {t('team.teamMember')}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={isPending || (members?.length || 0) === 0}
              style={SELECT_STYLE}
              onFocus={(e) => focusStyle(e.currentTarget)}
              onBlur={(e) => blurStyle(e.currentTarget, colors.border)}
            >
              <option value="">
                {(members?.length || 0) === 0 ? t('team.noActiveMember') : t('team.selectMember')}
              </option>
              {(members || []).map((m: any) => (
                <option key={m.uid} value={m.uid}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: colors.textDim
              }}
            >
              <ChevronDown size={18} />
            </div>
          </div>
          {(members?.length || 0) === 0 && (
            <p style={{ fontSize: 11, color: colors.textDim, margin: '4px 0 0', paddingLeft: 4 }}>
              {t('team.noActiveMemberDesc')}
            </p>
          )}
          {error && memberId === '' && (
            <div style={{ fontSize: 11, color: '#f87171', paddingLeft: 4 }}>{error}</div>
          )}
        </div>

        {error && !pipelineItemId && !memberId && (
          <div style={{ fontSize: 12, color: '#f87171' }}>{error}</div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isPending || !memberId.trim() || (!hasBulk && !pipelineItemId.trim())}
          loading={isPending}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 800,
            marginTop: 8
          }}
        >
          {isPending ? (
            t('team.assigning')
          ) : hasBulk ? (
            <>
              <UserPlus size={18} style={{ marginRight: 8 }} />
              {t('team.assignSelectedBtn')} ({selectedProspects.length})
            </>
          ) : (
            <>
              <UserPlus size={18} style={{ marginRight: 8 }} />
              {t('team.assignProspectBtn')}
            </>
          )}
        </Button>
      </form>
    </SectionCard>
  )
}
