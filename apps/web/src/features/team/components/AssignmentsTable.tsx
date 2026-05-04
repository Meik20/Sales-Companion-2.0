'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTeamAssignments } from '../hooks/useTeamAssignments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SectionCard } from './SectionCard'
import { colors } from '@/styles/tokens'

export function AssignmentsTable() {
  const { data: assignments = [], isLoading, isError, refetch } = useTeamAssignments()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<{ repaired: number; patched: number; skipped: number; errors: string[] } | null>(null)

  const handleRepair = async () => {
    if (!user) return
    setRepairing(true)
    setRepairResult(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/assignments/repair', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setRepairResult(json as { repaired: number; patched: number; skipped: number; errors: string[] })
      // Refresh pipeline and assignments caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['team-assignments'] }),
        refetch(),
      ])
    } catch {
      setRepairResult({ repaired: 0, skipped: 0, errors: ['Erreur réseau'] })
    } finally {
      setRepairing(false)
    }
  }

  if (isLoading) {
    return (
      <SectionCard title="Assignations actives" subtitle="0 assignation">
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          Chargement…
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title="Assignations actives" subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          Impossible de charger les assignations
        </div>
      </SectionCard>
    )
  }

  const count = assignments.length

  return (
    <SectionCard
      title="Assignations actives"
      subtitle={`${count} prospect${count > 1 ? 's' : ''} assigné${count > 1 ? 's' : ''}`}
    >
      {/* Repair banner — shown if there are legacy assignments */}
      <div style={{ marginBottom: 16 }}>
        {repairResult && (
          <div style={{
            marginBottom: 10, padding: '10px 14px', borderRadius: 8,
            background: (repairResult.repaired > 0 || repairResult.patched > 0) ? 'rgba(46,160,90,0.1)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${(repairResult.repaired > 0 || repairResult.patched > 0) ? 'rgba(46,160,90,0.25)' : 'rgba(99,102,241,0.2)'}`,
            fontSize: 12.5, color: (repairResult.repaired > 0 || repairResult.patched > 0) ? '#2ea05a' : colors.textMid,
          }}>
            {repairResult.repaired > 0 || repairResult.patched > 0
              ? [
                  repairResult.repaired > 0 && `✓ ${repairResult.repaired} item${repairResult.repaired > 1 ? 's' : ''} pipeline créé${repairResult.repaired > 1 ? 's' : ''}`,
                  repairResult.patched  > 0 && `✓ ${repairResult.patched} nom${repairResult.patched > 1 ? 's' : ''} corrigé${repairResult.patched > 1 ? 's' : ''}`,
                ].filter(Boolean).join(' · ')
              : `✓ Tous les pipelines sont déjà synchronisés (${repairResult.skipped} ignorés)`}
            {repairResult.errors.length > 0 && (
              <div style={{ marginTop: 4, color: '#f87171', fontSize: 11 }}>
                {repairResult.errors.length} erreur(s) : {repairResult.errors[0]}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleRepair}
          disabled={repairing}
          style={{
            fontSize: 11.5, padding: '6px 12px', borderRadius: 8,
            border: `1px solid ${colors.border}`, background: 'transparent',
            color: colors.textMid, cursor: repairing ? 'wait' : 'pointer',
            transition: 'all 200ms ease', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg2; e.currentTarget.style.color = colors.text }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.textMid }}
        >
          {repairing ? '⏳ Réparation…' : '🔧 Réparer les pipelines membres'}
        </button>
      </div>

      {count === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20, fontSize: 13 }}>
          Aucune assignation n&apos;a encore été créée.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Prospect', 'Assigné à', 'Date'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i === 2 ? 'right' : 'left',
                      padding: i === 1 ? '12px 16px 12px 0' : '12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const date = new Date(a.createdAt)
                const dateStr = date.toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background 200ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Prospect / Company */}
                    <td style={{ padding: '12px 0', color: colors.text }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {a.companyName || a.pipelineItemId}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
                        Prospect assigné
                      </div>
                    </td>

                    {/* Member */}
                    <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {a.memberName || a.memberId}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMid }}>{a.memberEmail}</div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px 0', color: colors.textMid, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {dateStr}
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

