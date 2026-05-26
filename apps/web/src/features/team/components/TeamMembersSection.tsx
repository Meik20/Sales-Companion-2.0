'use client'

import { useTeamMembers, TeamMember } from '../hooks/useTeamMembers'
import { SectionCard } from './SectionCard'
import { colors, shadows } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import {
  User,
  Mail,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  UserCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/index'

export function TeamMembersSection() {
  const { data: members, isLoading, isError } = useTeamMembers()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <SectionCard title={t('team.teamMembers')} subtitle={`${0} ${t('team.activeMembersCount')}`}>
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          {t('team.loading')}
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title={t('team.teamMembers')} subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          {t('support.errorLoad')}
        </div>
      </SectionCard>
    )
  }

  const activeMembers = members?.filter((m) => m.active) || []

  return (
    <SectionCard
      title={t('team.teamMembers')}
      subtitle={`${activeMembers.length} ${t('team.activeMembersCount')}`}
    >
      {activeMembers.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: colors.textMid,
            padding: 20,
            fontSize: 13
          }}
        >
          {t('team.noMemberAssigned')}
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
  const { t } = useTranslation()

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        transition: 'all 200ms ease',
        flexWrap: 'wrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(99,102,241,0.1)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            flexShrink: 0,
            border: '1px solid rgba(99,102,241,0.2)'
          }}
        >
          {member.name[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 2 }}>
            {member.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.textMid,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Mail size={12} style={{ opacity: 0.6 }} />
            {member.email}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
        {/* Quota Section */}
        <div style={{ width: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.textMid,
                textTransform: 'uppercase'
              }}
            >
              {t('team.dailyQuota')}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: colors.text }}>
              {member.dailyUsed}
              <span style={{ color: colors.textDim, fontWeight: 400 }}>/{member.dailyLimit}</span>
            </span>
          </div>
          <div
            style={{
              height: 6,
              width: '100%',
              background: colors.bg2,
              borderRadius: 10,
              overflow: 'hidden',
              border: `1px solid ${colors.border}`
            }}
          >
            <div
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                height: '100%',
                background:
                  usagePercent > 80 ? '#f87171' : usagePercent > 50 ? '#fbbf24' : '#6366f1',
                borderRadius: 10,
                transition: 'width 500ms ease-out'
              }}
            />
          </div>
        </div>

        {/* Status Section */}
        <div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>
          <Badge
            variant={member.active ? 'success' : 'default'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 700
            }}
          >
            {member.active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {member.active ? t('team.active').toUpperCase() : t('team.inactive').toUpperCase()}
          </Badge>
        </div>
      </div>
    </div>
  )
}
