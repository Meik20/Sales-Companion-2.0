'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

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
    queryFn: async () => {
      if (!user?.uid) return []
      const token = await user.getIdToken()

      const res = await fetch('/api/saved-companies', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Failed to fetch saved companies')
      }

      const data = await res.json()
      return (data.companies || []) as SavedCompany[]
    },
    enabled: !!user?.uid
  })
}
