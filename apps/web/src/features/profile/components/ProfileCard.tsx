'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { Panel, Badge, MetricCard, StatsGrid } from '@/components/ui/index'
import { ScIcon } from '@/components/ui/ScIcon'
import { colors } from '@/styles/tokens'

const planBadge: Record<string, 'default' | 'info' | 'success' | 'gold'> = {
  free:       'default',
  starter:    'info',
  pro:        'info',
  enterprise: 'gold',
}

const roleLabelKeys: Record<string, string> = {
  admin:       'profile.roles.admin',
  manager:     'profile.roles.manager',
  member:      'profile.roles.member',
  independent: 'profile.roles.independent',
}

export function ProfileCard() {
  const { t } = useTranslation()
  const { user, loading } = useCurrentUser()

  if (loading) {
    return (
      <Panel>
        <p style={{ color: colors.textMid, textAlign: 'center', padding: 32 }}>
          {t('profile.loading')}
        </p>
      </Panel>
    )
  }

  if (!user) return null

  const usagePercent = user.dailyLimit > 0
    ? Math.round((user.dailyUsed / user.dailyLimit) * 100)
    : 0

  const usageColor = usagePercent > 80 ? '#f87171' : usagePercent > 60 ? '#fbbf24' : 'var(--color-primary)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header card */}
      <Panel>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(55,138,221,0.15)',
              border: '2px solid rgba(55,138,221,0.3)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'inherit',
            }}
          >
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </div>

          {/* Infos */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text, fontFamily: 'inherit' }}>
                {user.name || t('profile.defaultName')}
              </h2>
              <Badge variant={planBadge[user.plan] ?? 'default'}>
                {user.plan?.toUpperCase()}
              </Badge>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
              {user.email}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textDim }}>
              {t(roleLabelKeys[user.role] as any) || user.role}
            </p>
          </div>
        </div>
      </Panel>

      {/* Stats */}
      <StatsGrid>
        <MetricCard
          label={t('profile.searchesToday')}
          value={`${user.dailyUsed} / ${user.dailyLimit}`}
          hint={`${usagePercent}% ${t('profile.quotaUsed')}`}
          accent
        />
        <MetricCard
          label={t('profile.dailyQuota')}
          value={user.dailyLimit}
          hint={t('profile.resetDaily')}
        />
        <MetricCard
          label={t('profile.status')}
          value={user.active ? `✓ ${t('profile.active')}` : `✗ ${t('profile.inactive')}`}
        />
      </StatsGrid>

      {/* Barre d'utilisation */}
      <Panel>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {t('profile.dailyQuotaLabel')}
            </span>
            <span style={{ fontSize: 12, color: usageColor, fontWeight: 600 }}>
              {usagePercent}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: colors.bg3,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${usagePercent}%`,
                background: usageColor,
                borderRadius: 999,
                transition: 'width 600ms ease',
              }}
            />
          </div>
        </div>
      </Panel>
    </div>
  )
}
