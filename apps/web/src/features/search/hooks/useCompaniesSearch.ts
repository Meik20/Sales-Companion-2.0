'use client'

import { useQuery } from '@tanstack/react-query'

type SearchFilters = {
  sector?: string
  region?: string
  city?: string
  query?: string
}

type Company = {
  id: string
  raisonSociale: string
  sector?: string
  region?: string
  city?: string
  telephone?: string
  email?: string
}

export function useCompaniesSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: ['companies-search', filters],
    queryFn: async (): Promise<Company[]> => {
      // Build query string
      const params = new URLSearchParams()
      if (filters.sector) params.append('sector', filters.sector)
      if (filters.region) params.append('region', filters.region)
      if (filters.city) params.append('city', filters.city)
      if (filters.query) params.append('query', filters.query)

      const response = await fetch(`/api/search/companies?${params}`)
      if (!response.ok) {
        throw new Error('Failed to search companies')
      }
      return response.json()
    },
    enabled: !!(filters.sector || filters.region || filters.city || filters.query),
  })
}
