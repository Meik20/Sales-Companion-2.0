'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getCachedSearchResults, saveSearchResults } from '@/lib/search-cache'
import { isMobileRuntime } from '@/lib/runtime'

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
  // For google maps results:
  _source?: 'google_places'
  googlePlaceId?: string
  rating?: number
  // Champs additionnels dynamiques
  [key: string]: unknown
}

export type SearchResponse = {
  items: Company[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  fromCache?: boolean
}

export type SearchFilters = {
  sector?: string
  region?: string
  city?: string
  query?: string
  lat?: string
  lng?: string
  radius?: string
}

export function useCompaniesSearch(filters: SearchFilters & { page?: number; charge?: boolean }) {
  const { user } = useCurrentUser()
  const mobileRuntime = isMobileRuntime()
  const userCountry = user?.country || 'CM'
  const cacheFilters = { ...filters, country: userCountry }
  const hasFilters = !!(
    filters.sector ||
    filters.region ||
    filters.city ||
    filters.query ||
    filters.lat
  )

  return useQuery({
    queryKey: ['companies-search', cacheFilters],
    queryFn: async (): Promise<SearchResponse> => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

      if (mobileRuntime && isOffline) {
        const cached = await getCachedSearchResults(cacheFilters)
        if (cached) {
          const pageSize = 20
          const page = filters.page || 1
          const total = cached.total ?? cached.results.length
          return {
            items: cached.results as Company[],
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
            fromCache: true
          }
        }
        throw new Error('Recherche indisponible hors ligne. Seules les recherches préalablement consultées sont disponibles.')
      }

      const params = new URLSearchParams()
      params.append('country', userCountry)
      if (filters.sector) params.append('sector', filters.sector)
      if (filters.region) params.append('region', filters.region)
      if (filters.city) params.append('city', filters.city)
      if (filters.query) params.append('query', filters.query)
      if (filters.lat) params.append('lat', filters.lat)
      if (filters.lng) params.append('lng', filters.lng)
      if (filters.radius) params.append('radius', filters.radius)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.charge === false) params.append('charge', 'false')

      // Passer le token pour déduire un crédit côté serveur
      const token = user ? await user.getIdToken() : null

      try {
        const response = await fetch(`/api/search/companies?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        if (!response.ok) {
          let errMessage = 'Failed to search companies'
          try {
            const errData = await response.json()
            if (errData?.message) errMessage = errData.message
          } catch (e) {}
          throw new Error(errMessage)
        }

        const data = (await response.json()) as SearchResponse
        if (mobileRuntime && data.items) {
          // Asynchronously save results in IndexedDB for offline retrieval
          saveSearchResults(cacheFilters, data.items, data.total).catch(() => {})
        }
        return data
      } catch (err: any) {
        // If network error occurred, try fallback to cached search
        const cached = mobileRuntime ? await getCachedSearchResults(cacheFilters) : null
        if (cached) {
          const pageSize = 20
          const page = filters.page || 1
          const total = cached.total ?? cached.results.length
          return {
            items: cached.results as Company[],
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
            fromCache: true
          }
        }
        throw err
      }
    },
    enabled: hasFilters,
    staleTime: 1000 * 60 * 2
  })
}

