'use client'

import { useCompanyStats } from '../hooks/useCompanyStats'
import { SectionCard } from '@/features/team/components/SectionCard'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

function BarChart({
  data,
  title,
  maxValue,
}: {
  data: Array<{ label: string; value: number }>
  title: string
  maxValue: number
}) {
  return (
    <div style={{ flex: 1, minWidth: '200px' }}>
      <h3
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: colors.textMid,
          marginBottom: 12,
          letterSpacing: '.04em',
        }}
      >
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item, index) => (
          <div key={index}>
            <div
              style={{
                fontSize: 12,
                color: colors.text,
                marginBottom: 4,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: colors.green }}>{item.value}</span>
            </div>
            <div
              style={{
                height: 6,
                background: colors.bg2,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(5, (item.value / maxValue) * 100)}%`,
                  background: colors.green,
                  borderRadius: 3,
                  transition: 'width 300ms ease-out',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CompanyStatsChart() {
  const { data, isLoading, isError } = useCompanyStats()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <SectionCard title={t('admin.companyStats') || "Statistiques des entreprises"}>
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          {t('team.loading')}
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title={t('admin.companyStats') || "Statistiques des entreprises"}>
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          {t('support.errorLoad') || "Impossible de charger les statistiques"}
        </div>
      </SectionCard>
    )
  }

  if (!data) {
    return null
  }

  const maxSector = Math.max(...data.bySector.map((item) => item.count), 1)
  const maxRegion = Math.max(...data.byRegion.map((item) => item.count), 1)

  return (
    <SectionCard
      title={t('admin.companyStats') || "Statistiques des entreprises"}
      subtitle={`${t('admin.totalCompanies')}: ${data.total} ${t('sidebar.companies').toLowerCase()}`}
    >
      <div
        style={{
          display: 'flex',
          gap: 32,
          flexWrap: 'wrap',
          paddingTop: 12,
        }}
      >
        <BarChart
          title={t('admin.bySector') || "Par secteur"}
          data={data.bySector
            .slice(0, 8)
            .map((item) => ({
              label: item.sector || t('admin.notSpecified') || "Non spécifié",
              value: item.count,
            }))}
          maxValue={maxSector}
        />
        <BarChart
          title={t('admin.byRegion') || "Par région"}
          data={data.byRegion
            .slice(0, 8)
            .map((item) => ({
              label: item.region,
              value: item.count,
            }))}
          maxValue={maxRegion}
        />
      </div>
    </SectionCard>
  )
}
