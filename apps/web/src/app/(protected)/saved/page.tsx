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
import { useTranslation } from '@/providers/I18nProvider'

export default function SavedPage() {
  const router = useRouter()
  const { t } = useTranslation()
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
    pushToast({ type: 'success', title: t('saved.restoreSuccess') })
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      pushToast({ type: 'success', title: t('saved.deleteSuccess') })
    } catch (error) {
      pushToast({
        type: 'error',
        title: t('saved.deleteError'),
        description: error instanceof Error ? error.message : t('saved.unknownError'),
      })
    }
  }

  const items = savedSearchesQuery.data ?? []

  return (
    <AppShell>
      <PageHeader
        title={t('saved.title')}
        subtitle={t('saved.subtitle')}
      />

      <DataCard
        title={t('saved.mySearches')}
        subtitle={items.length ? `${items.length} ${t('saved.searchesSaved')}` : undefined}
      >
        {savedSearchesQuery.isLoading ? <LoadingState /> : null}
        {savedSearchesQuery.isError ? (
          <ErrorState description={t('saved.errorLoad')} />
        ) : null}
        {!savedSearchesQuery.isLoading && !savedSearchesQuery.isError && items.length === 0 ? (
          <EmptyState
            title={t('saved.noSearch')}
            description={t('saved.noSearchDesc')}
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
