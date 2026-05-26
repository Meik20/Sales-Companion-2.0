'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard } from '@/components/ui/index'
import { Badge } from '@/components/ui/index'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

type SearchLog = {
  id: string
  query: string
  userEmail?: string
  userName?: string
  plan?: string
  resultsCount: number
  sector?: string
  city?: string
  radius?: string
  createdAt?: string
}

const PLAN_BADGE: Record<string, 'default' | 'info' | 'success' | 'gold'> = {
  free: 'default',
  starter: 'info',
  pro: 'success',
  enterprise: 'gold'
}

function useSearchLogs() {
  const { user } = useCurrentUser()
  return useQuery<SearchLog[]>({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token ?? ''}` }
      })
      if (!res.ok) throw new Error('Impossible de charger les logs')
      return res.json()
    },
    enabled: !!user?.uid,
    refetchInterval: 5000
  })
}

export default function AdminLogsPage() {
  const { data: logs = [], isLoading, isError, refetch } = useSearchLogs()
  const { t } = useTranslation()

  return (
    <AppShell>
      <PageHeader title={t('admin.logsTitle')} subtitle={t('admin.logsSubtitle')} />

      <DataCard
        title={t('admin.recentSearches')}
        subtitle={t('admin.last20')}
        actions={
          <button
            onClick={() => refetch()}
            style={{
              padding: '5px 12px',
              background: colors.greenLight,
              color: colors.green,
              border: `1px solid ${colors.successBorder}`,
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t('admin.refresh')}
          </button>
        }
      >
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>
            {t('team.loading')}
          </div>
        )}
        {isError && (
          <div style={{ textAlign: 'center', padding: 40, color: colors.danger, fontSize: 13 }}>
            {t('admin.loadingLogs')}
          </div>
        )}
        {!isLoading && !isError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Utilisateur', 'Email', 'Recherche', 'Résultats', 'Plan', 'Date'].map(
                    (h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px',
                          textAlign: i === 5 ? 'right' : 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.textMid,
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          borderBottom: `2px solid ${colors.border}`
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: '40px 0',
                        color: colors.textMid,
                        fontSize: 13
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                      {t('admin.noActivity')}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background 200ms ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bg2)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: 'rgba(99,102,241,0.1)',
                              color: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              flexShrink: 0
                            }}
                          >
                            {(log.userName || log.userEmail || '?')[0]!.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, color: colors.text, fontSize: 13 }}>
                            {log.userName || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: colors.textMid, fontSize: 12 }}>
                        {log.userEmail || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          color: colors.text,
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }}
                      >
                        {log.query ||
                          (log.sector
                            ? `Secteur: ${log.sector}`
                            : log.city
                              ? `Ville: ${log.city}`
                              : '—')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: log.resultsCount > 0 ? colors.green : colors.textDim,
                            fontWeight: 800,
                            fontSize: 14
                          }}
                        >
                          {log.resultsCount ?? 0}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge
                          variant={PLAN_BADGE[log.plan ?? 'free'] ?? 'default'}
                          style={{ fontSize: 10, textTransform: 'uppercase' }}
                        >
                          {log.plan || 'free'}
                        </Badge>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          color: colors.textMid,
                          fontSize: 11,
                          textAlign: 'right'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 2
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short'
                                })
                              : '—'}
                          </span>
                          <span style={{ opacity: 0.7 }}>
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </AppShell>
  )
}
