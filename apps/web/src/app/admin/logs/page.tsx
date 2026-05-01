'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard } from '@/components/ui/index'
import { Badge } from '@/components/ui/index'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'

type SearchLog = {
  id: string
  query: string
  userEmail?: string
  userName?: string
  plan?: string
  resultsCount?: number
  createdAt?: string
}

const PLAN_BADGE: Record<string, 'default' | 'info' | 'success' | 'gold'> = {
  free: 'default',
  starter: 'info',
  pro: 'success',
  enterprise: 'gold',
}

function useSearchLogs() {
  const { user } = useCurrentUser()
  return useQuery<SearchLog[]>({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      if (!res.ok) throw new Error('Impossible de charger les logs')
      return res.json()
    },
    enabled: !!user?.uid,
    refetchInterval: 30_000,
  })
}

export default function AdminLogsPage() {
  const { data: logs = [], isLoading, isError, refetch } = useSearchLogs()

  return (
    <AppShell>
      <PageHeader
        title="Journal d'activité"
        subtitle="20 dernières recherches effectuées sur la plateforme."
      />

      <DataCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Recherches récentes</span>
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
                cursor: 'pointer',
              }}
            >
              ↻ Actualiser
            </button>
          </span>
        }
      >
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>
            Chargement...
          </div>
        )}
        {isError && (
          <div style={{ textAlign: 'center', padding: 40, color: colors.danger, fontSize: 13 }}>
            Impossible de charger les logs.
          </div>
        )}
        {!isLoading && !isError && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Utilisateur', 'Email', 'Requête', 'Résultats', 'Plan', 'Date'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.textMid,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: 'center', padding: '40px 0', color: colors.textMid, fontSize: 13 }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                      Aucune activité enregistrée pour l'instant.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: `1px solid ${colors.border}` }}
                    >
                      <td style={{ padding: '11px 12px', fontWeight: 600, color: colors.text }}>
                        {log.userName || '—'}
                      </td>
                      <td style={{ padding: '11px 12px', color: colors.textMid, fontSize: 12 }}>
                        {log.userEmail || '—'}
                      </td>
                      <td
                        style={{
                          padding: '11px 12px',
                          color: colors.textMid,
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {log.query || '—'}
                      </td>
                      <td style={{ padding: '11px 12px', fontWeight: 600, color: colors.green }}>
                        {log.resultsCount ?? 0}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <Badge variant={PLAN_BADGE[log.plan ?? 'free'] ?? 'default'}>
                          {log.plan || 'free'}
                        </Badge>
                      </td>
                      <td style={{ padding: '11px 12px', color: colors.textMid, fontSize: 12 }}>
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
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
