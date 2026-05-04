'use client'

import { useTeamAssignments, TeamAssignment } from '../hooks/useTeamAssignments'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { SectionCard } from './SectionCard'
import { colors } from '@/styles/tokens'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

type ProspectInfo = {
  id: string
  companyName: string
}

export function AssignmentsTable() {
  const { data: assignments, isLoading, isError } = useTeamAssignments()
  const { data: members } = useTeamMembers()
  const [prospectMap, setProspectMap] = useState<Record<string, ProspectInfo>>({})

  // Fetch prospect details for all prospectIds
  useEffect(() => {
    if (!assignments || assignments.length === 0) return

    const loadProspects = async () => {
      const allProspectIds = new Set<string>()
      assignments.forEach(a => {
        a.prospectIds?.forEach(pid => allProspectIds.add(pid))
      })

      const map: Record<string, ProspectInfo> = {}
      for (const prospectId of allProspectIds) {
        try {
          const docRef = doc(db, 'pipeline', prospectId)
          const snapshot = await getDoc(docRef)
          if (snapshot.exists()) {
            const data = snapshot.data()
            map[prospectId] = {
              id: prospectId,
              companyName: data.companyName || 'Unknown'
            }
          }
        } catch (e) {
          console.error(`Failed to load prospect ${prospectId}:`, e)
        }
      }
      setProspectMap(map)
    }

    void loadProspects()
  }, [assignments])

  const getMemberName = (assigneeUid: string) => {
    return members?.find((m) => m.uid === assigneeUid)?.name || 'Inconnu'
  }

  const getMemberEmail = (assigneeUid: string) => {
    return members?.find((m) => m.uid === assigneeUid)?.email || ''
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

  // Flatten assignments: one row per prospect
  const rows: Array<{
    assignmentId: string
    prospectId: string
    assigneeUid: string
    companyName: string
    createdAt: string
  }> = []

  ;(assignments || []).forEach(assignment => {
    assignment.prospectIds?.forEach(prospectId => {
      rows.push({
        assignmentId: assignment.id,
        prospectId,
        assigneeUid: assignment.assigneeUid || '',
        companyName: prospectMap[prospectId]?.companyName || 'Chargement...',
        createdAt: assignment.createdAt
      })
    })
  })

  const sortedRows = rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <SectionCard
      title="Assignations actives"
      subtitle={`${sortedRows.length} prospect${sortedRows.length > 1 ? 's' : ''} assigné${sortedRows.length > 1 ? 's' : ''}`}
    >
      {sortedRows.length === 0 ? (
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
              {sortedRows.map((row) => (
                <AssignmentRow
                  key={`${row.assignmentId}-${row.prospectId}`}
                  companyName={row.companyName}
                  memberName={getMemberName(row.assigneeUid)}
                  memberEmail={getMemberEmail(row.assigneeUid)}
                  createdAt={row.createdAt}
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
  companyName,
  memberName,
  memberEmail,
  createdAt,
}: {
  companyName: string
  memberName: string
  memberEmail: string
  createdAt: string
}) {
  const createdDate = new Date(createdAt)
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
        {companyName}
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
