'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, ErrorState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
import { AdminUsersTable } from '@/features/admin/components/AdminUsersTable'
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers'
import { useDeleteAdminUser } from '@/features/admin/hooks/useDeleteAdminUser'
import { useUpdateAdminUser } from '@/features/admin/hooks/useUpdateAdminUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'

export default function AdminUsersPage() {
  const usersQuery = useAdminUsers()
  const deleteMutation = useDeleteAdminUser()
  const updateMutation = useUpdateAdminUser()
  const { pushToast } = useToast()
  const { t } = useTranslation()

  async function handleDelete(uid: string) {
    try {
      await deleteMutation.mutateAsync(uid)
      pushToast({ type: 'success', title: 'Utilisateur supprimé' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }

  async function handleUpdate(uid: string, data: Record<string, unknown>) {
    try {
      await updateMutation.mutateAsync({ uid, data })
      pushToast({ type: 'success', title: 'Utilisateur mis à jour' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Mise à jour impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }

  const rawUsers = usersQuery.data?.items ?? []
  // Cast to the extended AdminUser type expected by AdminUsersTable
  const users = rawUsers as Parameters<typeof AdminUsersTable>[0]['users']

  return (
    <AppShell>
      <PageHeader title={t('admin.usersTitle')} subtitle={t('admin.usersSubtitle')} />

      <DataCard title={t('admin.allUsers')}>
        {usersQuery.isLoading ? <LoadingState /> : null}
        {usersQuery.isError ? <ErrorState description={t('support.errorLoad')} /> : null}
        {!usersQuery.isLoading && !usersQuery.isError ? (
          <AdminUsersTable users={users} onDelete={handleDelete} onUpdate={handleUpdate} />
        ) : null}
      </DataCard>
    </AppShell>
  )
}
