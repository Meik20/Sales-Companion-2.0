'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTeamAssignments } from '../hooks/useTeamAssignments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SectionCard } from './SectionCard'
import { colors, shadows } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  Calendar,
  MapPin,
  ArrowRight,
  ShieldCheck,
  History
} from 'lucide-react'

export function AssignmentsTable() {
  const { data: assignments = [], isLoading, isError, refetch } = useTeamAssignments()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<{
    uidFixed: number
    nameFixed: number
    deletedDupes?: number
    deletedStale?: number
    skipped: number
    errors: string[]
  } | null>(null)

  const handleRepair = async () => {
    if (!user) return
    setRepairing(true)
    setRepairResult(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/assignments/repair', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      setRepairResult(
        json as {
          uidFixed: number
          nameFixed: number
          deletedDupes?: number
          deletedStale?: number
          skipped: number
          errors: string[]
        }
      )
      // Refresh pipeline and assignments caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['team-assignments'] }),
        refetch()
      ])
    } catch {
      setRepairResult({
        uidFixed: 0,
        nameFixed: 0,
        skipped: 0,
        errors: [t('team.repairNetworkError')]
      })
    } finally {
      setRepairing(false)
    }
  }

  if (isLoading) {
    return (
      <SectionCard title={t('team.activeAssignments')} subtitle={`0 ${t('team.prospectAssigned')}`}>
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          {t('team.loading')}
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title={t('team.activeAssignments')} subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          {t('support.errorLoad')}
        </div>
      </SectionCard>
    )
  }

  const count = assignments.length

  return (
    <SectionCard
      title={t('team.activeAssignments')}
      subtitle={`${count} ${t('team.prospectAssigned')}`}
    >
      {/* Repair banner — shown if there are legacy assignments */}
      <div style={{ marginBottom: 16 }}>
        {repairResult && (
          <div
            style={{
              marginBottom: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background:
                repairResult.uidFixed > 0 || repairResult.nameFixed > 0
                  ? 'rgba(46,160,90,0.1)'
                  : 'rgba(99,102,241,0.08)',
              border: `1px solid ${repairResult.uidFixed > 0 || repairResult.nameFixed > 0 ? 'rgba(46,160,90,0.25)' : 'rgba(99,102,241,0.2)'}`,
              fontSize: 12.5,
              color:
                repairResult.uidFixed > 0 || repairResult.nameFixed > 0 ? '#2ea05a' : colors.textMid
            }}
          >
            {repairResult.uidFixed > 0 ||
            repairResult.nameFixed > 0 ||
            (repairResult.deletedDupes || 0) > 0 ||
            (repairResult.deletedStale || 0) > 0
              ? [
                  repairResult.uidFixed > 0 &&
                    `✓ ${repairResult.uidFixed} ${t('team.repairSuccessSync')}`,
                  repairResult.nameFixed > 0 &&
                    `✓ ${repairResult.nameFixed} ${t('team.repairSuccessName')}`,
                  (repairResult.deletedDupes || 0) > 0 &&
                    `✓ ${repairResult.deletedDupes} doublons supprimés`,
                  (repairResult.deletedStale || 0) > 0 &&
                    `✓ ${repairResult.deletedStale} éléments obsolètes retirés`
                ]
                  .filter(Boolean)
                  .join(' · ')
              : t('team.repairSkipped')}
            {repairResult.errors.length > 0 && (
              <div style={{ marginTop: 4, color: '#f87171', fontSize: 11 }}>
                {repairResult.errors.length} {t('team.repairErrors')} : {repairResult.errors[0]}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleRepair}
          disabled={repairing}
          style={{
            fontSize: 12,
            padding: '8px 16px',
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.textMid,
            cursor: repairing ? 'wait' : 'pointer',
            transition: 'all 200ms ease',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            boxShadow: shadows.sm
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.bg2
            e.currentTarget.style.color = colors.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.surface
            e.currentTarget.style.color = colors.textMid
          }}
        >
          <Wrench size={14} style={{ animation: repairing ? 'spin 2s linear infinite' : 'none' }} />
          {repairing ? t('team.repairingPipelines') : t('team.repairPipelines')}
        </button>
      </div>

      {count === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20, fontSize: 13 }}>
          {t('team.noAssignmentCreated')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {[
                  { label: t('team.prospect'), icon: <Building2 size={12} /> },
                  { label: t('pipeline.assignedTo'), icon: <User size={12} /> },
                  { label: t('team.date'), icon: <Calendar size={12} /> }
                ].map((h, i) => (
                  <th
                    key={h.label}
                    style={{
                      textAlign: i === 2 ? 'right' : 'left',
                      padding: '12px 0',
                      color: colors.textMid,
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: i === 2 ? 'flex-end' : 'flex-start',
                        gap: 6
                      }}
                    >
                      {h.icon}
                      {h.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const date = new Date(a.createdAt)
                const dateStr = date.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'all 200ms ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg3)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Prospect / Company */}
                    <td style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'rgba(99,102,241,0.1)',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: colors.text }}>
                            {a.companyName || a.pipelineItemId}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
                            {t('team.prospectAssignedSub')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Member */}
                    <td style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'rgba(34,197,94,0.1)',
                            color: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800
                          }}
                        >
                          {(a.memberName || a.memberId || '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>
                            {a.memberName || a.memberId?.toLowerCase()}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMid }}>{a.memberEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td
                      style={{
                        padding: '16px 0',
                        color: colors.textMid,
                        textAlign: 'right',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {dateStr.split(' ')[0]} {dateStr.split(' ')[1]}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>
                        {dateStr.split(' ').slice(2).join(' ')}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
