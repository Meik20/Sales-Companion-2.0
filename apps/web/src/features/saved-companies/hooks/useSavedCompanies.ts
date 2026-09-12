'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback, formatTimestamp } from '@/lib/firestore-offline'

export type SavedCompany = {
  id: string
  userId: string
  companyId: string
  companyName: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export function useSavedCompanies() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['saved-companies', user?.uid],
    queryFn: async (): Promise<SavedCompany[]> => {
      if (!user?.uid) return []

      const q = query(collection(firestore, 'saved_companies'), where('userId', '==', user.uid))
      const snap = await getDocsWithOfflineFallback(q)

      const companies: SavedCompany[] = snap.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          userId: (data.userId || user.uid) as string,
          companyId: (data.companyId || docSnap.id) as string,
          companyName: (data.raisonSociale || data.companyName || '') as string,
          metadata: {
            sector: data.sector,
            city: data.city,
            region: data.region,
            telephone: data.telephone,
            email: data.email,
            ...data.metadata
          },
          createdAt: formatTimestamp(data.savedAt || data.createdAt) || new Date().toISOString()
        }
      })

      companies.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })

      return companies
    },
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

