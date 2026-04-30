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

export default function PipelinePage() {
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
    prospection: items.filter((i) => i.status === 'prospection').length,
    negociation: items.filter((i) => i.status === 'negociation').length,
    conclue:     items.filter((i) => i.status === 'conclue').length,
  }

  return (
    <AppShell>
      <PageHeader
        title="Pipeline"
        subtitle="Suivi de la prospection jusqu'à la conclusion."
        actions={
          user?.role !== 'manager' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? '✕ Annuler' : '+ Ajouter un prospect'}
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
            { label: 'Prospection', count: counts.prospection, color: '#60a5fa', variant: 'info' as const },
            { label: 'Négociation', count: counts.negociation, color: '#fbbf24', variant: 'warning' as const },
            { label: 'Conclue',     count: counts.conclue,     color: '#4ade80', variant: 'success' as const },
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
          title="Vue équipe"
          subtitle="Pipeline consolidé de toute votre équipe."
        >
          {managerPipelineQuery.isLoading ? <LoadingState /> : null}
          {!managerPipelineQuery.isLoading && !managerPipelineQuery.data?.length ? (
            <EmptyState title="Aucun prospect" description="Votre équipe n'a pas encore de prospects." icon="📊" />
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
            <DataCard title="Ajouter un prospect" subtitle="Renseignez les informations du nouveau contact.">
              <CreatePipelineItemForm onSuccess={() => setShowForm(false)} />
            </DataCard>
          ) : null}

          <DataCard title="Mon pipeline">
            {userPipelineQuery.isLoading ? <LoadingState /> : null}
            {!userPipelineQuery.isLoading && items.length === 0 ? (
              <EmptyState
                title="Pipeline vide"
                description='Ajoutez un prospect via "Ajouter un prospect" ou depuis la recherche.'
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
