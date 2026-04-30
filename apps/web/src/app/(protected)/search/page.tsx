'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { ErrorState } from '@/components/feedback/index'
import { DataCard } from '@/components/ui/index'
import { SearchFiltersForm } from '@/features/search/components/SearchFiltersForm'
import { CompaniesSearchResults } from '@/features/search/components/CompaniesSearchResults'
import { SaveCurrentSearchButton } from '@/features/search/components/SaveCurrentSearchButton'
import { useCompaniesSearch } from '@/features/search/hooks/useCompaniesSearch'
import { colors } from '@/styles/tokens'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<{
    sector?: string
    region?: string
    city?: string
    query?: string
  }>({})
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const sector = searchParams.get('sector') || undefined
    const region = searchParams.get('region') || undefined
    const city   = searchParams.get('city')   || undefined
    const query  = searchParams.get('query')  || undefined
    if (sector || region || city || query) {
      setFilters({ sector, region, city, query })
      setHasSearched(true)
    }
  }, [searchParams])

  const searchQuery = useCompaniesSearch(filters)
  const results = searchQuery.data ?? []

  return (
    <AppShell>
      <PageHeader
        title="Recherche"
        subtitle="Trouvez des entreprises camerounaises et constituez vos prospects."
        actions={<SaveCurrentSearchButton filters={filters} results={results} />}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Filtres */}
        <DataCard title="Filtres de recherche">
          <SearchFiltersForm
            initialValues={filters}
            onSubmit={(v) => {
              setFilters(v)
              setHasSearched(true)
            }}
          />
        </DataCard>

        {/* Résultats */}
        {hasSearched ? (
          <DataCard
            title="Résultats"
            subtitle={
              !searchQuery.isLoading && !searchQuery.isError
                ? `${results.length} entreprise${results.length !== 1 ? 's' : ''} trouvée${results.length !== 1 ? 's' : ''}`
                : undefined
            }
          >
            {searchQuery.isLoading ? <LoadingState title="Recherche en cours…" /> : null}
            {searchQuery.isError ? (
              <ErrorState description="Impossible d'exécuter la recherche." />
            ) : null}
            {!searchQuery.isLoading && !searchQuery.isError && results.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Essayez d'élargir vos critères de recherche."
                icon="🔍"
              />
            ) : null}
            {!searchQuery.isLoading && !searchQuery.isError && results.length > 0 ? (
              <CompaniesSearchResults items={results} />
            ) : null}
          </DataCard>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              color: colors.textMid,
              fontSize: 14,
              gap: 10,
            }}
          >
            <span style={{ fontSize: 24 }}>🔍</span>
            Lancez une recherche pour afficher les entreprises
          </div>
        )}
      </div>
    </AppShell>
  )
}
