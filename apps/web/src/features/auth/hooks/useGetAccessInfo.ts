'use client'

import { useQuery } from '@tanstack/react-query'

export type AccessInfo = {
  accessId: string
  firstname: string
  lastname: string
  company: string
  status: string
  email?: string | null
}

export function useGetAccessInfo(accessId: string) {
  return useQuery({
    queryKey: ['access-info', accessId],
    queryFn: async (): Promise<AccessInfo> => {
      const response = await fetch(`/api/team/access-info/${encodeURIComponent(accessId)}`)

      if (!response.ok) {
        let message = "Lien d'activation invalide ou expiré"
        try {
          const json = await response.json()
          if (json?.error) message = json.error
        } catch {
          // ignore parse error
        }
        throw new Error(message)
      }

      return response.json()
    },
    enabled: !!accessId,
    retry: false
  })
}
