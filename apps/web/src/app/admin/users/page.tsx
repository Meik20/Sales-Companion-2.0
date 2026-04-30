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

export default function AdminUsersPage() {
  const usersQuery   = useAdminUsers()
  const deleteMutation = useDeleteAdminUser()
  const updateMutation = useUpdateAdminUser()
  const { pushToast } = useToast()

  async function handleDelete(uid: string) {
    try {
      await deleteMutation.mutateAsync(uid)
      pushToast({ type: 'success', title: 'Utilisateur supprimé' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
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
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  const users = usersQuery.data?.items ?? []

  return (
    <AppShell>
      <PageHeader
        title="Gestion des utilisateurs"
        subtitle={`${users.length} compte${users.length > 1 ? 's' : ''} enregistré${users.length > 1 ? 's' : ''}`}
      />

      <DataCard title="Liste des utilisateurs">
        {usersQuery.isLoading ? <LoadingState /> : null}
        {usersQuery.isError ? (
          <ErrorState description="Impossible de charger la liste des utilisateurs." />
        ) : null}
        {!usersQuery.isLoading && !usersQuery.isError ? (
          <AdminUsersTable users={users} onDelete={handleDelete} onUpdate={handleUpdate} />
        ) : null}
      </DataCard>
    </AppShell>
  )
}
