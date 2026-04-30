'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type SupportThread = {
  id: string
  userId: string
  subject: string
  status: 'open' | 'in_progress' | 'closed'
  priority?: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  messageCount?: number
}

export function useSupportThreads() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['support-threads', user?.uid],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/support/threads`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les tickets support')
      }

      return response.json() as Promise<SupportThread[]>
    },
    enabled: !!user?.uid,
  })
}
