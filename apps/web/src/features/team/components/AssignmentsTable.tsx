'use client'

import { useTeamAssignments, TeamAssignment } from '../hooks/useTeamAssignments'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { SectionCard } from './SectionCard'
import { colors } from '@/styles/tokens'

export function AssignmentsTable() {
  const { data: assignments, isLoading, isError } = useTeamAssignments()
  const { data: members } = useTeamMembers()

  const getMemberName = (memberId: string) => {
    return members?.find((m) => m.uid === memberId)?.name || 'Inconnu'
  }

  const getMemberEmail = (memberId: string) => {
    return members?.find((m) => m.uid === memberId)?.email || ''
  }

  if (isLoading) {
    return (
      <SectionCard title="Assignations actives" subtitle={`${0} assignations`}>
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          Chargement...
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

  const sortedAssignments = [...(assignments || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <SectionCard
      title="Assignations actives"
      subtitle={`${sortedAssignments.length} assignation${sortedAssignments.length > 1 ? 's' : ''}`}
    >
      {sortedAssignments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: colors.textMid,
            padding: 20,
            fontSize: 13,
          }}
        >
          Aucune assignation n'a encore été créée.
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 0',
                    color: colors.textMid,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                >
                  Prospect
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px 12px 0',
                    color: colors.textMid,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                >
                  Assigné à
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '12px 0',
                    color: colors.textMid,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  memberName={getMemberName(assignment.memberId)}
                  memberEmail={getMemberEmail(assignment.memberId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function AssignmentRow({
  assignment,
  memberName,
  memberEmail,
}: {
  assignment: TeamAssignment
  memberName: string
  memberEmail: string
}) {
  const createdDate = new Date(assignment.createdAt)
  const dateStr = createdDate.toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.border}`,
        transition: 'background-color 300ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg2
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <td style={{ padding: '12px 0', color: colors.text, fontWeight: 500 }}>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#2ea05a',
            wordBreak: 'break-all',
          }}
        >
          {assignment.pipelineItemId}
        </div>
      </td>
      <td
        style={{
          padding: '12px 16px 12px 0',
          color: colors.text,
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: 2 }}>{memberName}</div>
        <div style={{ fontSize: 12, color: colors.textMid }}>{memberEmail}</div>
      </td>
      <td
        style={{
          padding: '12px 0',
          color: colors.textMid,
          textAlign: 'right',
        }}
      >
        {dateStr}
      </td>
    </tr>
  )
}
