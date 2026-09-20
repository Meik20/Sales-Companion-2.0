'use client'

import { useTeamMembers, TeamMember } from '../hooks/useTeamMembers'
import { SectionCard } from './SectionCard'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Mail,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { Badge } from '@/components/ui/index'
import { EmptyState } from '@/components/feedback'

export function TeamMembersSection() {
  const { data: members, isLoading, isError } = useTeamMembers()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <SectionCard title={t('team.teamMembers')} subtitle={`${0} ${t('team.activeMembersCount')}`}>
        <div style={{ textAlign: 'center', color: 'var(--muted-foreground, #94a3b8)', padding: 20 }}>
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
  const totalUsed = activeMembers.reduce((acc, m) => acc + m.dailyUsed, 0)
  const totalLimit = activeMembers.reduce((acc, m) => acc + m.dailyLimit, 0)
  const teamUsagePercent = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0

  return (
    <SectionCard
      title={t('team.teamMembers')}
      subtitle={`${activeMembers.length} ${t('team.activeMembersCount')}`}
    >
      {/* Résumé d'équipe */}
      {activeMembers.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
            padding: '14px 18px',
            background: 'var(--card, #131c2e)',
            borderRadius: 12,
            border: '1px solid var(--border, rgba(255,255,255,0.1))'
          }}
        >
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              Activité équipe (aujourd&apos;hui)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground, #f1f5f9)' }}>
              {totalUsed}
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-foreground, #64748b)' }}> / {totalLimit} recherches</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: teamUsagePercent > 80 ? '#f87171' : teamUsagePercent > 50 ? '#fbbf24' : '#34d399'
            }}
          >
            {teamUsagePercent > 80 ? <TrendingUp size={16} /> : teamUsagePercent > 50 ? <Minus size={16} /> : <TrendingDown size={16} />}
            {teamUsagePercent}% utilisé
          </div>
        </div>
      )}

      {activeMembers.length === 0 ? (
        <EmptyState
          illustration="/illustrations/empty-states/empty-team.png"
          title={t('team.emptyTeam' as any) || 'Équipe vide'}
          description={t('team.noMemberAssigned') || 'Invitez des membres pour collaborer et suivre les performances.'}
          illustrationSize="sm"
        />
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
  const usagePercent = member.dailyLimit > 0 ? Math.round((member.dailyUsed / member.dailyLimit) * 100) : 0
  const { t } = useTranslation()

  // Couleur progressive selon l'usage
  const quotaColor =
    usagePercent > 80 ? '#f87171' :
    usagePercent > 50 ? '#fbbf24' :
    '#818cf8'

  const avatarBg =
    usagePercent > 80 ? 'rgba(248,113,113,0.12)' :
    usagePercent > 50 ? 'rgba(251,191,36,0.12)' :
    'rgba(99,102,241,0.12)'

  const avatarColor =
    usagePercent > 80 ? '#f87171' :
    usagePercent > 50 ? '#fbbf24' :
    '#818cf8'

  return (
    <div
      style={{
        background: 'var(--secondary, #1e2a3b)',
        border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        transition: 'all 200ms ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'
      }}
    >
      {/* Ligne principale : Avatar + Nom + Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 180 }}>
          {/* Avatar avec initiale */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: avatarBg,
              color: avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 800,
              flexShrink: 0,
              border: `1px solid ${avatarColor}33`,
              transition: 'all 300ms ease'
            }}
          >
            {member.name[0]?.toUpperCase()}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground, #f1f5f9)', marginBottom: 3 }}>
              {member.name}
            </div>
            <a
              href={`mailto:${member.email}`}
              style={{
                fontSize: 12,
                color: 'var(--muted-foreground, #94a3b8)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'color 150ms ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#60a5fa')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground, #94a3b8)')}
            >
              <Mail size={11} style={{ opacity: 0.7 }} />
              {member.email}
            </a>
          </div>
        </div>

        {/* Badge statut */}
        <Badge
          variant={member.active ? 'success' : 'default'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {member.active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          {member.active ? t('team.active').toUpperCase() : t('team.inactive').toUpperCase()}
        </Badge>
      </div>

      {/* Quota journalier — barre élargie et toujours visible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--muted-foreground, #94a3b8)',
              textTransform: 'uppercase',
              letterSpacing: '.08em'
            }}
          >
            {t('team.dailyQuota')}
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: quotaColor }}>
            {member.dailyUsed}
            <span style={{ color: 'var(--muted-foreground, #64748b)', fontWeight: 400, fontSize: 11 }}>
              /{member.dailyLimit}
            </span>
            <span style={{ marginLeft: 6, fontSize: 10, color: quotaColor, fontWeight: 700 }}>
              ({usagePercent}%)
            </span>
          </span>
        </div>
        {/* Barre de progression */}
        <div
          style={{
            height: 7,
            width: '100%',
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            overflow: 'hidden',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
          }}
        >
          <div
            style={{
              width: `${Math.min(usagePercent, 100)}%`,
              height: '100%',
              background: usagePercent > 80
                ? 'linear-gradient(90deg, #f87171, #ef4444)'
                : usagePercent > 50
                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                  : 'linear-gradient(90deg, #818cf8, #6366f1)',
              borderRadius: 10,
              transition: 'width 500ms ease-out, background 300ms ease'
            }}
          />
        </div>
        {usagePercent >= 100 && (
          <div style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>
            ⚠ Quota journalier épuisé
          </div>
        )}
        {usagePercent >= 80 && usagePercent < 100 && (
          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
            ⚡ Proche de la limite
          </div>
        )}
      </div>
    </div>
  )
}
