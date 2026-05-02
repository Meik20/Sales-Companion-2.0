'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminCompaniesTable } from '@/features/admin/components/AdminCompaniesTable'
import { CompanyStatsChart } from '@/features/admin/components/CompanyStatsChart'

export default function AdminCompaniesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Gestion des entreprises"
        subtitle="Consultez et gérez toutes les entreprises importées dans la plateforme."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <CompanyStatsChart />
        <AdminCompaniesTable />
      </div>
    </AppShell>
  )
}
