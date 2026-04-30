'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminImportsTable } from '@/features/admin/components/AdminImportsTable'

export default function AdminImportsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Historique des imports"
        subtitle="Consultez l'historique de tous les imports de données effectués sur la plateforme."
      />

      <AdminImportsTable />
    </AppShell>
  )
}
