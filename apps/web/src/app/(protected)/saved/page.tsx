'use client'

import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState, ErrorState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
import { SavedSearchesList } from '@/features/saved-searches/components/SavedSearchesList'
import { useSavedSearches } from '@/features/saved-searches/hooks/useSavedSearches'
import { useDeleteSavedSearch } from '@/features/saved-searches/hooks/useDeleteSavedSearch'
import { useToast } from '@/hooks/useToast'

export default function SavedPage() {
  const router = useRouter()
  const savedSearchesQuery = useSavedSearches()
  const deleteMutation = useDeleteSavedSearch()
  const { pushToast } = useToast()

  function handleRestore(filters: Record<string, unknown>) {
    const params = new URLSearchParams()
    if (typeof filters.query === 'string') params.set('query', filters.query)
    if (typeof filters.sector === 'string') params.set('sector', filters.sector)
    if (typeof filters.region === 'string') params.set('region', filters.region)
    if (typeof filters.city === 'string') params.set('city', filters.city)
    router.push(`/search?${params.toString()}`)
    pushToast({ type: 'success', title: 'Recherche restaurée' })
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      pushToast({ type: 'success', title: 'Recherche supprimée' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  const items = savedSearchesQuery.data ?? []

  return (
    <AppShell>
      <PageHeader
        title="Recherches sauvegardées"
        subtitle="Relancez vos recherches favorites en un clic."
      />

      <DataCard
        title="Mes recherches"
        subtitle={items.length ? `${items.length} recherche${items.length > 1 ? 's' : ''} sauvegardée${items.length > 1 ? 's' : ''}` : undefined}
      >
        {savedSearchesQuery.isLoading ? <LoadingState /> : null}
        {savedSearchesQuery.isError ? (
          <ErrorState description="Impossible de charger les recherches sauvegardées." />
        ) : null}
        {!savedSearchesQuery.isLoading && !savedSearchesQuery.isError && items.length === 0 ? (
          <EmptyState
            title="Aucune recherche sauvegardée"
            description={`Utilisez le bouton "Sauvegarder" lors d'une recherche pour retrouver vos filtres ici.`}
            icon="🔖"
          />
        ) : null}
        {items.length > 0 ? (
          <SavedSearchesList items={items} onRestore={handleRestore} onDelete={handleDelete} />
        ) : null}
      </DataCard>
    </AppShell>
  )
}
