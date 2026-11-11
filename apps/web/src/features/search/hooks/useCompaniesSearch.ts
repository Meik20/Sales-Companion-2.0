'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { auth } from '@/services/firebase/client'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import { getCachedSearchResults, saveSearchResults } from '@/lib/search-cache'
import { isMobileRuntime } from '@/lib/runtime'

export type Company = {
  id: string
  raisonSociale: string
  name?: string
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
  verified?: boolean
  // For google maps / live results:
  _source?: 'google_places' | 'live_places' | 'osm_live'
  googlePlaceId?: string
  rating?: number
  distanceKm?: number
  distanceFormatted?: string
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
  // Pays de prospection actif : cookie sc_country (landing) > user.country (Firestore)
  const userCountry = useProspectingCountry()
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
          const pageSize = 10
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
        throw new Error(
          'Recherche indisponible hors ligne. Seules les recherches préalablement consultées sont disponibles.'
        )
      }

      const params = new URLSearchParams()
      params.append('country', userCountry)
      params.append('pageSize', '10')
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
      let token: string | null = null
      try {
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken()
        } else if (user) {
          token = await user.getIdToken()
        }
      } catch (tokenErr) {
        console.warn('[useCompaniesSearch] Token attempt 1 warning:', tokenErr)
      }

      if (!token && typeof (auth as any).authStateReady === 'function') {
        try {
          await (auth as any).authStateReady()
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken()
          }
        } catch (readyErr) {
          console.warn('[useCompaniesSearch] authStateReady warning:', readyErr)
        }
      }

      try {
        let response = await fetch(`/api/search/companies?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        // En cas de token expiré ou désynchronisé (401), rafraîchir le token Firebase et réessayer
        if (response.status === 401 && (auth.currentUser || user)) {
          try {
            let refreshedToken: string | null = null
            if (auth.currentUser) {
              refreshedToken = await auth.currentUser.getIdToken(true)
            } else if (user) {
              refreshedToken = await user.getIdToken(true)
            }
            if (refreshedToken) {
              token = refreshedToken
              response = await fetch(`/api/search/companies?${params}`, {
                headers: { Authorization: `Bearer ${refreshedToken}` }
              })
            }
          } catch {
            // Continuer vers le traitement standard des erreurs
          }
        }

        if (!response.ok) {
          // Mode GPS ("Autour de moi") : si la base interne répond en 401 ou indisponible,
          // on ne bloque pas l'écran pour permettre à OpenStreetMap (moteur local/live)
          // d'afficher les entreprises réelles trouvées autour de l'utilisateur.
          if (filters.lat && filters.lng) {
            console.warn('[useCompaniesSearch] Erreur recherche interne en mode GPS (statut ' + response.status + '), repli gracieux vers OSM.')
            return {
              items: [],
              total: 0,
              page: filters.page || 1,
              pageSize: 10,
              totalPages: 0
            }
          }

          let errMessage = 'Failed to search companies'
          try {
            const errData = await response.json()
            if (
              errData?.code === 'CROSS_COUNTRY_REQUIRES_ENTERPRISE' ||
              errData?.error === 'cross_country_restricted'
            ) {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('sc_cross_country_locked', {
                    detail: { targetCountry: userCountry }
                  })
                )
              }
            }
            if (errData?.message) errMessage = errData.message
          } catch (e) { }
          throw new Error(errMessage)
        }

        const data = (await response.json()) as SearchResponse
        if (mobileRuntime && data.items) {
          // Asynchronously save results in IndexedDB for offline retrieval
          saveSearchResults(cacheFilters, data.items, data.total).catch(() => { })
        }
        return data
      } catch (err: any) {
        // If network error occurred, try fallback to cached search
        const cached = mobileRuntime ? await getCachedSearchResults(cacheFilters) : null
        if (cached) {
          const pageSize = 10
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
    enabled: hasFilters && Boolean(user),
    staleTime: 1000 * 60 * 2
  })
}
