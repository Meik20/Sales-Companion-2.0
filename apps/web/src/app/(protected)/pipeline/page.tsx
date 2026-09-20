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
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/providers/I18nProvider'

export default function PipelinePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useCurrentUser()
  const managerPipelineQuery = useManagerPipeline()
  const userPipelineQuery = useUserPipeline()
  const updateMutation = useUpdatePipelineItem()
  const { data: members = [] } = useTeamMembers()
  const [showForm, setShowForm] = useState(false)

  const stageParam = searchParams.get('stage')?.toLowerCase()
  const activeStage =
    stageParam === 'prospection' || stageParam === 'prospect'
      ? 'prospection'
      : stageParam === 'negociation' || stageParam === 'negotiation'
        ? 'negociation'
        : stageParam === 'conclue' || stageParam === 'conclusion'
          ? 'conclue'
          : null

  async function handleStatusChange(id: string, status: 'prospection' | 'negociation' | 'conclue') {
    await updateMutation.mutateAsync({ id, data: { status } })
  }

  function handleStageClick(stageId: 'prospection' | 'negociation' | 'conclue') {
    if (activeStage === stageId) {
      router.push('/pipeline')
    } else {
      router.push(`/pipeline?stage=${stageId}`)
    }
  }

  const items = userPipelineQuery.data ?? []
  const counts = {
    prospection: items.filter((i) => ['prospection', 'prospect'].includes(i.status as string))
      .length,
    negociation: items.filter((i) => ['negociation', 'negotiation'].includes(i.status as string))
      .length,
    conclue: items.filter((i) => ['conclue', 'conclusion'].includes(i.status as string)).length
  }

  const filteredItems = activeStage
    ? items.filter((i) => {
        if (activeStage === 'prospection') return ['prospection', 'prospect'].includes(i.status as string)
        if (activeStage === 'negociation') return ['negociation', 'negotiation'].includes(i.status as string)
        if (activeStage === 'conclue') return ['conclue', 'conclusion'].includes(i.status as string)
        return true
      })
    : items

  return (
    <AppShell>
      <PageHeader
        title={t('pipeline.title')}
        subtitle={t('pipeline.subtitle')}
        actions={
          user?.role !== 'manager' ? (
            <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t('pipeline.cancel') : t('pipeline.addProspect')}
            </Button>
          ) : undefined
        }
      />

      {/* Stats rapides */}
      {user?.role === 'member' || user?.role === 'independent' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20
          }}
        >
          {[
            {
              id: 'prospection' as const,
              label: t('pipeline.prospection'),
              count: counts.prospection,
              color: '#60a5fa',
              variant: 'info' as const
            },
            {
              id: 'negociation' as const,
              label: t('pipeline.negotiation'),
              count: counts.negociation,
              color: '#fbbf24',
              variant: 'warning' as const
            },
            {
              id: 'conclue' as const,
              label: t('pipeline.closed'),
              count: counts.conclue,
              color: '#0284c7',
              variant: 'success' as const
            }
          ].map(({ id, label, count, color, variant }) => {
            const isSelected = activeStage === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleStageClick(id)}
                className={`group transition-all duration-200 cursor-pointer text-center relative rounded-xl ${
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md'
                    : 'hover:border-primary/50 hover:shadow-sm'
                }`}
                style={{
                  background: isSelected ? 'var(--secondary, #1e293b)' : 'var(--card, #131c2e)',
                  border: isSelected ? `2px solid ${color}` : '1px solid var(--border, rgba(255,255,255,0.1))',
                  padding: '14px 18px',
                  outline: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color,
                    fontFamily: "'Syne',sans-serif",
                    lineHeight: 1
                  }}
                >
                  {count}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge variant={variant}>{label}</Badge>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title={t('search.clearStageFilter')}
                    >
                      ●
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Vue manager */}
      {user?.role === 'manager' ? (
        <DataCard title={t('pipeline.teamView')} subtitle={t('pipeline.teamSubtitle')}>
          {managerPipelineQuery.isLoading ? <LoadingState /> : null}
          {!managerPipelineQuery.isLoading && !managerPipelineQuery.data?.length ? (
            <EmptyState
              illustration="/illustrations/empty-states/empty-pipeline.png"
              title={t('pipeline.noProspect')}
              description={t('pipeline.teamNoProspect')}
            />
          ) : null}
          {managerPipelineQuery.data?.length ? (
            <ManagerPipelineList
              items={managerPipelineQuery.data}
              members={members}
              managerUid={user?.uid}
            />
          ) : null}
        </DataCard>
      ) : null}

      {/* Vue member/independent */}
      {user?.role === 'member' || user?.role === 'independent' ? (
        <>
          {showForm ? (
            <DataCard
              title={t('pipeline.addProspectTitle')}
              subtitle={t('pipeline.addProspectSubtitle')}
            >
              <CreatePipelineItemForm onSuccess={() => setShowForm(false)} />
            </DataCard>
          ) : null}

          <DataCard
            title={t('pipeline.myPipeline')}
            subtitle={
              activeStage
                ? `${t('search.filterByStage')} ${
                    activeStage === 'prospection'
                      ? t('pipeline.prospection')
                      : activeStage === 'negociation'
                        ? t('pipeline.negotiation')
                        : t('pipeline.closed')
                  } (${filteredItems.length})`
                : undefined
            }
            actions={
              activeStage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/pipeline')}
                  style={{ fontSize: 12, height: 30, padding: '0 10px' }}
                >
                  ✕ {t('search.clearStageFilter')}
                </Button>
              ) : undefined
            }
          >
            {userPipelineQuery.isLoading ? <LoadingState /> : null}
            {!userPipelineQuery.isLoading && items.length === 0 ? (
              <EmptyState
                illustration="/illustrations/empty-states/empty-pipeline.png"
                title={t('pipeline.emptyPipeline')}
                description={t('pipeline.emptyPipelineDesc')}
                action={{
                  label: t('pipeline.addProspectTitle') || 'Ajouter une opportunité',
                  onClick: () => setShowForm(true),
                  variant: 'primary'
                }}
              />
            ) : null}
            {!userPipelineQuery.isLoading && items.length > 0 && filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: 12, fontSize: 14 }}>
                  {t('search.noProspectInStage')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/pipeline')}
                >
                  {t('search.showAllProspects')}
                </Button>
              </div>
            ) : null}
            {filteredItems.length > 0 ? (
              <UserPipelineList items={filteredItems} onStatusChange={handleStatusChange} />
            ) : null}
          </DataCard>
        </>
      ) : null}
    </AppShell>
  )
}
