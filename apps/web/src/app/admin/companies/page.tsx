'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminCompaniesTable } from '@/features/admin/components/AdminCompaniesTable'

export default function AdminCompaniesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Gestion des entreprises"
        subtitle="Consultez et gérez toutes les entreprises importées dans la plateforme."
      />

      <AdminCompaniesTable />
    </AppShell>
  )
}
