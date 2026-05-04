'use client'

import { useTeamAssignments } from '../hooks/useTeamAssignments'
import { SectionCard } from './SectionCard'
import { colors } from '@/styles/tokens'

export function AssignmentsTable() {
  const { data: assignments = [], isLoading, isError } = useTeamAssignments()

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
