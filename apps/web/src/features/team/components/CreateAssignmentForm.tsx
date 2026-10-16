'use client'

import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { SectionCard } from './SectionCard'
import { useCreateAssignmentForm } from '../hooks/useCreateAssignmentForm'
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
  assignedTo?: string | null
  memberName?: string | null
  userId?: string | null
  managerUid?: string | null
  sourceProspectId?: string | null
}

const SELECT_STYLE: React.CSSProperties = {
  fontSize: 14,
  padding: '12px 14px',
  borderRadius: 12,
  border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
  background: 'var(--card, #131c2e)',
  color: 'var(--foreground, #f1f5f9)',
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
  const {
    pipelineItemId,
    setPipelineItemId,
    memberId,
    setMemberId,
    error,
    successCount,
    availableProspects,
    loadingPipeline,
    members,
    isPending,
    hasBulk,
    handleSingleSubmit,
    handleBulkSubmit
  } = useCreateAssignmentForm({ selectedProspects, onAssigned })

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
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.2)',
            fontSize: 13,
            color: '#2563eb',
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
                color: 'var(--muted-foreground, #94a3b8)',
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
                background: 'var(--secondary, #1e2a3b)',
                border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
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
                    color: 'var(--foreground, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: 'white',
                    borderRadius: 8,
                    border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
                  }}
                >
                  <Building size={14} style={{ color: '#60a5fa', opacity: 0.7 }} />
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  {p.city && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--muted-foreground, #94a3b8)',
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
                color: 'var(--muted-foreground, #94a3b8)',
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
                onBlur={(e) => blurStyle(e.currentTarget, 'var(--border, rgba(255,255,255,0.1))')}
              >
                <option value="">
                  {loadingPipeline
                    ? t('team.loading')
                    : availableProspects.length === 0
                      ? t('team.noProspectAvailable')
                      : t('team.selectProspect')}
                </option>
                {availableProspects.map((p) => (
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
                  color: 'var(--muted-foreground, #64748b)'
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
              color: 'var(--muted-foreground, #94a3b8)',
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
              onBlur={(e) => blurStyle(e.currentTarget, 'var(--border, rgba(255,255,255,0.1))')}
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
                color: 'var(--muted-foreground, #64748b)'
              }}
            >
              <ChevronDown size={18} />
            </div>
          </div>
          {(members?.length || 0) === 0 && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--muted-foreground, #64748b)',
                margin: '4px 0 0',
                paddingLeft: 4
              }}
            >
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
