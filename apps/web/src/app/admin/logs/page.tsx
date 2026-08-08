'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard } from '@/components/ui/index'
import { Badge } from '@/components/ui/index'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
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
    staleTime: 2 * 60 * 1000,   // 2 min de cache
    refetchOnWindowFocus: false  // Le bouton "Actualiser" suffit
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
              background: 'rgba(34,197,94,0.1)',
              color: '#4ade80',
              border: `1px solid ${'rgba(34,197,94,0.3)'}`,
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
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground, #94a3b8)', fontSize: 13 }}>
            {t('team.loading')}
          </div>
        )}
        {isError && (
          <div style={{ textAlign: 'center', padding: 40, color: '#f87171', fontSize: 13 }}>
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
                          color: 'var(--muted-foreground, #94a3b8)',
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          borderBottom: `2px solid ${'var(--border, rgba(255,255,255,0.1))'}`
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
                        color: 'var(--muted-foreground, #94a3b8)',
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
                        borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                        transition: 'background 200ms ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--card, #131c2e)')}
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
                          <span style={{ fontWeight: 700, color: 'var(--foreground, #f1f5f9)', fontSize: 13 }}>
                            {log.userName || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--muted-foreground, #94a3b8)', fontSize: 12 }}>
                        {log.userEmail || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          color: 'var(--foreground, #f1f5f9)',
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
                            color: log.resultsCount > 0 ? '#4ade80' : 'var(--muted-foreground, #64748b)',
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
                          color: 'var(--muted-foreground, #94a3b8)',
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
