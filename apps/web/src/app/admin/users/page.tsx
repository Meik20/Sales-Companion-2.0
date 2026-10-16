'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, ErrorState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { AdminUsersTable } from '@/features/admin/components/AdminUsersTable'
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers'
import { useDeleteAdminUser } from '@/features/admin/hooks/useDeleteAdminUser'
import { useUpdateAdminUser } from '@/features/admin/hooks/useUpdateAdminUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'

const PAGE_SIZE = 50

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const usersQuery = useAdminUsers(page, PAGE_SIZE)
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
  const total = usersQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Filtre côté client sur nom / email / rôle
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rawUsers
    return rawUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    )
  }, [rawUsers, search])

  const users = filteredUsers as Parameters<typeof AdminUsersTable>[0]['users']

  return (
    <AppShell>
      <PageHeader title={t('admin.usersTitle')} subtitle={t('admin.usersSubtitle')} />

      <DataCard title={t('admin.allUsers')}>
        {/* Barre de recherche + compteur */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap'
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground, #64748b)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Rechercher par nom, email ou rôle…"
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: 8,
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                background: 'var(--card, #131c2e)',
                color: 'var(--foreground, #f1f5f9)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Compteur */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--muted-foreground, #94a3b8)',
              marginLeft: 'auto'
            }}
          >
            <Users size={13} />
            <span>
              {search
                ? `${filteredUsers.length} résultat${filteredUsers.length !== 1 ? 's' : ''} sur `
                : ''}
              <strong style={{ color: 'var(--foreground, #f1f5f9)' }}>{total}</strong> utilisateur
              {total !== 1 ? 's' : ''} au total
            </span>
          </div>
        </div>

        {usersQuery.isLoading ? <LoadingState /> : null}
        {usersQuery.isError ? <ErrorState description={t('support.errorLoad')} /> : null}
        {!usersQuery.isLoading && !usersQuery.isError ? (
          <AdminUsersTable users={users} onDelete={handleDelete} onUpdate={handleUpdate} />
        ) : null}

        {/* Pagination */}
        {totalPages > 1 && !search && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border, rgba(255,255,255,0.08))'
            }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || usersQuery.isFetching}
              style={{ padding: '6px 10px', borderRadius: 8 }}
            >
              <ChevronLeft size={14} />
            </Button>
            <span style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }}>
              Page <strong style={{ color: 'var(--foreground, #f1f5f9)' }}>{page}</strong> /{' '}
              {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || usersQuery.isFetching}
              style={{ padding: '6px 10px', borderRadius: 8 }}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </DataCard>
    </AppShell>
  )
}
