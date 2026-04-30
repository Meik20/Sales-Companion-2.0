'use client'

import { useTeamMembers, TeamMember } from '../hooks/useTeamMembers'
import { SectionCard } from './SectionCard'
import { colors } from '@/styles/tokens'

export function TeamMembersSection() {
  const { data: members, isLoading, isError } = useTeamMembers()

  if (isLoading) {
    return (
      <SectionCard title="Membres de l'équipe" subtitle={`${0} membres actifs`}>
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          Chargement...
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title="Membres de l'équipe" subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          Impossible de charger les membres
        </div>
      </SectionCard>
    )
  }

  const activeMembers = members?.filter((m) => m.active) || []

  return (
    <SectionCard
      title="Membres de l'équipe"
      subtitle={`${activeMembers.length} membre${activeMembers.length > 1 ? 's' : ''} actif${activeMembers.length > 1 ? 's' : ''}`}
    >
      {activeMembers.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: colors.textMid,
            padding: 20,
            fontSize: 13,
          }}
        >
          Aucun membre n'a été assigné à cette équipe.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeMembers.map((member) => (
            <MemberCard key={member.uid} member={member} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function MemberCard({ member }: { member: TeamMember }) {
  const usagePercent = Math.round((member.dailyUsed / member.dailyLimit) * 100)

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
          {member.name}
        </div>
        <div style={{ fontSize: 12, color: colors.textMid }}>{member.email}</div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 12,
              color: colors.textMid,
              marginBottom: 4,
            }}
          >
            Quota quotidien
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {member.dailyUsed} / {member.dailyLimit}
          </div>
          <div
            style={{
              width: 100,
              height: 4,
              background: colors.border,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                height: '100%',
                background:
                  usagePercent > 80 ? '#f87171' : usagePercent > 50 ? '#fbbf24' : '#2ea05a',
                transition: 'width 300ms ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: colors.textMid, marginTop: 3 }}>
            {usagePercent}%
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: member.active ? '#2ea05a' : '#9ca3af',
            }}
          />
          <span style={{ fontSize: 11, color: colors.textMid }}>
            {member.active ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>
    </div>
  )
}
