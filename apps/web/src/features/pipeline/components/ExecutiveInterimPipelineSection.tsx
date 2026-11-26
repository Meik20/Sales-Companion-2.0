'use client'

import { DataCard, Badge } from '@/components/ui/index'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { useOrgPipeline, type OrgManagerStats } from '@/features/pipeline/hooks/useOrgPipeline'
import { TeamManagerPerformanceCard } from '@/features/pipeline/components/TeamManagerPerformanceCard'
import { ManagerPipelineList } from '@/features/pipeline/components/ManagerPipelineList'
import { useTranslation } from '@/providers/I18nProvider'
import { Layers } from 'lucide-react'

interface ExecutiveInterimPipelineSectionProps {
  coordinator: OrgManagerStats
  interimDisplay: string
  period: string
  orgCountry: string
  members: any[]
  userUid?: string
}

/**
 * Affiche le pipeline d'intérim d'un Coordinateur de manière strictement isolée
 * dans la vue Executive, permettant une consultation concomitante Titulaire + Intérim
 * sans jamais mélanger les données des deux zones.
 */
export function ExecutiveInterimPipelineSection({
  coordinator,
  interimDisplay,
  period,
  orgCountry,
  members,
  userUid
}: ExecutiveInterimPipelineSectionProps) {
  const { t, lang } = useTranslation()
  const interimQuery = useOrgPipeline({
    period,
    segment: interimDisplay
  })

  return (
    <div className="mt-4">
      <DataCard
        title={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Layers size={15} className="text-amber-500" />
            <span>
              {lang === 'en'
                ? `Interim Pipeline – ${interimDisplay}`
                : `Pipeline Intérim – ${interimDisplay}`}
            </span>
            <Badge variant="warning" className="text-[11px] font-bold">
              {lang === 'en' ? 'Interim' : 'Intérim'}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {lang === 'en'
                ? `Covered by ${coordinator.name}`
                : `Assuré par ${coordinator.name}`}
            </span>
          </div>
        }
        subtitle={
          lang === 'en'
            ? 'Isolated interim perimeter — never merged with the titular zone'
            : 'Périmètre d’intérim isolé — jamais mélangé avec la zone titulaire'
        }
      >
        {interimQuery.isLoading ? <LoadingState /> : null}
        {!interimQuery.isLoading && (
          <TeamManagerPerformanceCard
            managers={interimQuery.data?.managers}
            items={
              (interimQuery.data?.items?.filter(
                (i) =>
                  (i as any).managerOrgRole !== 'senior_manager' &&
                  (i as any).managerOrgRole !== 'executive' &&
                  (i as any).managerUid !== userUid
              ) ?? []) as Parameters<typeof TeamManagerPerformanceCard>[0]['items']
            }
            membersCount={interimQuery.data?.totalSalespeopleCount ?? 0}
            supervisorsCount={interimQuery.data?.totalSupervisorsCount}
            currency={interimQuery.data?.currency}
            selectedPeriod={period}
            countryCode={orgCountry}
            observedSegment={interimDisplay}
          />
        )}
        {!interimQuery.isLoading && !interimQuery.data?.items?.length ? (
          <EmptyState
            illustration="/illustrations/empty-states/empty-pipeline.png"
            title={t('pipeline.noProspect')}
            description={
              lang === 'en'
                ? `No registered opportunities in interim zone ${interimDisplay}.`
                : `Aucune opportunité enregistrée sur le périmètre d'intérim ${interimDisplay}.`
            }
          />
        ) : null}
        {interimQuery.data?.items?.length ? (
          <ManagerPipelineList
            items={
              interimQuery.data.items as Parameters<typeof ManagerPipelineList>[0]['items']
            }
            members={members}
            managerUid={userUid}
            showTargets={false}
            isOrgView
            managers={interimQuery.data?.managers}
            observedSegment={interimDisplay}
          />
        ) : null}
      </DataCard>
    </div>
  )
}
