'use client'

import { useQuery } from '@tanstack/react-query'

export type AccessInfo = {
  accessId: string
  accessLabel: string
  firstname: string
  lastname: string
  company: string
  status: string
}

export function useGetAccessInfo(accessId: string) {
  return useQuery({
    queryKey: ['access-info', accessId],
    queryFn: async (): Promise<AccessInfo> => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

      const response = await fetch(`${backendUrl}/team/accesses/${accessId}/public`)

      if (!response.ok) {
        throw new Error('Impossible de charger les informations d\'accès')
      }

      return response.json()
    },
    enabled: !!accessId,
  })
}
