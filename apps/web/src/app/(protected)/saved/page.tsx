'use client'

import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState, ErrorState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
import { SavedSearchesList } from '@/features/saved-searches/components/SavedSearchesList'
import { useSavedSearches } from '@/features/saved-searches/hooks/useSavedSearches'
import { useDeleteSavedSearch } from '@/features/saved-searches/hooks/useDeleteSavedSearch'
import { SavedCompaniesList } from '@/features/saved-companies/components/SavedCompaniesList'
import { useSavedCompanies } from '@/features/saved-companies/hooks/useSavedCompanies'
import { useDeleteSavedCompany } from '@/features/saved-companies/hooks/useDeleteSavedCompany'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'

export default function SavedPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { pushToast } = useToast()

  // Saved Searches
  const savedSearchesQuery = useSavedSearches()
  const deleteSearchMutation = useDeleteSavedSearch()

  function handleRestoreSearch(filters: Record<string, unknown>) {
    const params = new URLSearchParams()
    if (typeof filters.query === 'string') params.set('query', filters.query)
    if (typeof filters.sector === 'string') params.set('sector', filters.sector)
    if (typeof filters.region === 'string') params.set('region', filters.region)
    if (typeof filters.city === 'string') params.set('city', filters.city)
    router.push(`/search?${params.toString()}`)
    pushToast({ type: 'success', title: t('saved.restoreSuccess') })
  }

  async function handleDeleteSearch(id: string) {
    try {
      await deleteSearchMutation.mutateAsync(id)
      pushToast({ type: 'success', title: t('saved.deleteSuccess') })
    } catch (error) {
      pushToast({
        type: 'error',
        title: t('saved.deleteError'),
        description: error instanceof Error ? error.message : t('saved.unknownError')
      })
    }
  }

  const searchItems = savedSearchesQuery.data ?? []

  // Saved Companies
  const savedCompaniesQuery = useSavedCompanies()
  const deleteCompanyMutation = useDeleteSavedCompany()

  async function handleDeleteCompany(id: string) {
    try {
      await deleteCompanyMutation.mutateAsync(id)
      pushToast({ type: 'success', title: t('saved.deleteCompanySuccess') })
    } catch (error) {
      pushToast({
        type: 'error',
        title: t('saved.deleteCompanyError'),
        description: error instanceof Error ? error.message : t('saved.unknownError')
      })
    }
  }

  const companyItems = savedCompaniesQuery.data ?? []

  return (
    <AppShell>
      <PageHeader title={t('saved.title')} subtitle={t('saved.subtitle')} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Saved Companies Section */}
        <DataCard
          title={t('saved.myCompanies')}
          subtitle={companyItems.length ? `${companyItems.length} entreprises` : undefined}
        >
          {savedCompaniesQuery.isLoading ? <LoadingState /> : null}
          {savedCompaniesQuery.isError ? (
            <ErrorState description={t('saved.errorLoadCompanies')} />
          ) : null}
          {!savedCompaniesQuery.isLoading &&
          !savedCompaniesQuery.isError &&
          companyItems.length === 0 ? (
            <EmptyState
              title={t('saved.noCompany')}
              description={t('saved.noCompanyDesc')}
              icon="🏢"
            />
          ) : null}
          {companyItems.length > 0 ? (
            <SavedCompaniesList items={companyItems} onDelete={handleDeleteCompany} />
          ) : null}
        </DataCard>

        {/* Saved Searches Section */}
        <DataCard
          title={t('saved.mySearches')}
          subtitle={
            searchItems.length ? `${searchItems.length} ${t('saved.searchesSaved')}` : undefined
          }
        >
          {savedSearchesQuery.isLoading ? <LoadingState /> : null}
          {savedSearchesQuery.isError ? <ErrorState description={t('saved.errorLoad')} /> : null}
          {!savedSearchesQuery.isLoading &&
          !savedSearchesQuery.isError &&
          searchItems.length === 0 ? (
            <EmptyState
              title={t('saved.noSearch')}
              description={t('saved.noSearchDesc')}
              icon="🔖"
            />
          ) : null}
          {searchItems.length > 0 ? (
            <SavedSearchesList
              items={searchItems}
              onRestore={handleRestoreSearch}
              onDelete={handleDeleteSearch}
            />
          ) : null}
        </DataCard>
      </div>
    </AppShell>
  )
}
