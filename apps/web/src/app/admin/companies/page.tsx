'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminCompaniesTable } from '@/features/admin/components/AdminCompaniesTable'
import { CompanyStatsChart } from '@/features/admin/components/CompanyStatsChart'
import { useTranslation } from '@/providers/I18nProvider'

export default function AdminCompaniesPage() {
  const { t } = useTranslation()

  return (
    <AppShell>
      <PageHeader
        title={t('admin.companiesTitle')}
        subtitle={t('admin.companiesSubtitle')}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <CompanyStatsChart />
        <AdminCompaniesTable />
      </div>
    </AppShell>
  )
}
