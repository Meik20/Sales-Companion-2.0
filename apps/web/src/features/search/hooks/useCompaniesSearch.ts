'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type SearchFilters = {
  sector?: string
  region?: string
  city?: string
  query?: string
}

/** Tous les champs qui peuvent exister dans une entreprise importée */
export type Company = {
  id: string
  raisonSociale: string
  niu?: string
  sigle?: string
  sector?: string
  region?: string
  city?: string
  telephone?: string
  email?: string
  dirigeant?: string
  rccm?: string
  adresse?: string
  formeJuridique?: string
  capital?: string
  // Champs additionnels dynamiques
  [key: string]: unknown
}

export function useCompaniesSearch(filters: SearchFilters) {
  const { user } = useCurrentUser()
  const hasFilters = !!(filters.sector || filters.region || filters.city || filters.query)

  return useQuery({
    queryKey: ['companies-search', filters],
    queryFn: async (): Promise<Company[]> => {
      const params = new URLSearchParams()
      if (filters.sector) params.append('sector', filters.sector)
      if (filters.region) params.append('region', filters.region)
      if (filters.city)   params.append('city',   filters.city)
      if (filters.query)  params.append('query',  filters.query)

      // Passer le token pour déduire un crédit côté serveur
      const token = user ? await user.getIdToken() : null

      const response = await fetch(`/api/search/companies?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error('Failed to search companies')
      }
      return response.json()
    },
    enabled: hasFilters,
    staleTime: 1000 * 60 * 2, // 2 min cache pour éviter re-fetch sur chaque render
  })
}
