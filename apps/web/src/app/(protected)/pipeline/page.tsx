'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { DataCard, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useManagerPipeline } from '@/features/pipeline/hooks/useManagerPipeline'
import { ManagerPipelineList } from '@/features/pipeline/components/ManagerPipelineList'
import { useUserPipeline } from '@/features/pipeline/hooks/useUserPipeline'
import { CreatePipelineItemForm } from '@/features/pipeline/components/CreatePipelineItemForm'
import { UserPipelineList } from '@/features/pipeline/components/UserPipelineList'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useState } from 'react'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

export default function PipelinePage() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const managerPipelineQuery = useManagerPipeline()
  const userPipelineQuery = useUserPipeline()
  const updateMutation = useUpdatePipelineItem()
  const [showForm, setShowForm] = useState(false)

  async function handleStatusChange(id: string, status: 'prospection' | 'negociation' | 'conclue') {
    await updateMutation.mutateAsync({ id, data: { status } })
  }

  const items = userPipelineQuery.data ?? []
  const counts = {
    prospection: items.filter((i) => ['prospection', 'prospect'].includes(i.status as string)).length,
    negociation: items.filter((i) => ['negociation', 'negotiation'].includes(i.status as string)).length,
    conclue:     items.filter((i) => ['conclue', 'conclusion'].includes(i.status as string)).length,
  }

  return (
    <AppShell>
      <PageHeader
        title={t('pipeline.title')}
        subtitle={t('pipeline.subtitle')}
        actions={
          user?.role !== 'manager' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? t('pipeline.cancel') : t('pipeline.addProspect')}
            </Button>
          ) : undefined
        }
      />

      {/* Stats rapides */}
      {(user?.role === 'member' || user?.role === 'independent') ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { label: t('pipeline.prospection'), count: counts.prospection, color: '#60a5fa', variant: 'info' as const },
            { label: t('pipeline.negotiation'), count: counts.negociation, color: '#fbbf24', variant: 'warning' as const },
            { label: t('pipeline.closed'),     count: counts.conclue,     color: '#4ade80', variant: 'success' as const },
          ].map(({ label, count, color, variant }) => (
            <div
              key={label}
              style={{
                background: colors.bg2,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: '14px 18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Syne',sans-serif" }}>
                {count}
              </div>
              <Badge variant={variant}>{label}</Badge>
            </div>
          ))}
        </div>
      ) : null}

      {/* Vue manager */}
      {user?.role === 'manager' ? (
        <DataCard
          title={t('pipeline.teamView')}
          subtitle={t('pipeline.teamSubtitle')}
        >
          {managerPipelineQuery.isLoading ? <LoadingState /> : null}
          {!managerPipelineQuery.isLoading && !managerPipelineQuery.data?.length ? (
            <EmptyState title={t('pipeline.noProspect')} description={t('pipeline.teamNoProspect')} icon="📊" />
          ) : null}
          {managerPipelineQuery.data?.length ? (
            <ManagerPipelineList items={managerPipelineQuery.data} />
          ) : null}
        </DataCard>
      ) : null}

      {/* Vue member/independent */}
      {(user?.role === 'member' || user?.role === 'independent') ? (
        <>
          {showForm ? (
            <DataCard title={t('pipeline.addProspectTitle')} subtitle={t('pipeline.addProspectSubtitle')}>
              <CreatePipelineItemForm onSuccess={() => setShowForm(false)} />
            </DataCard>
          ) : null}

          <DataCard title={t('pipeline.myPipeline')}>
            {userPipelineQuery.isLoading ? <LoadingState /> : null}
            {!userPipelineQuery.isLoading && items.length === 0 ? (
              <EmptyState
                title={t('pipeline.emptyPipeline')}
                description={t('pipeline.emptyPipelineDesc')}
                icon="📋"
              />
            ) : null}
            {items.length > 0 ? (
              <UserPipelineList items={items} onStatusChange={handleStatusChange} />
            ) : null}
          </DataCard>
        </>
      ) : null}
    </AppShell>
  )
}
