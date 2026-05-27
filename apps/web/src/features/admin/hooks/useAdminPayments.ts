'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type AdminPaymentItem = {
  reference: string
  userId: string | null
  userEmail: string | null
  plan: string | null
  operator: string | null
  transactionId: string | null
  amount: number | null
  status: 'MANUAL_PENDING' | 'SUCCESSFUL' | 'FAILED' | null
  createdAt: string | null
  updatedAt: string | null
  campayRef: string | null
}

type AdminPaymentsResponse = {
  items: AdminPaymentItem[]
}

export function useAdminPayments() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/admin/payments`, {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les paiements')
      }

      return response.json() as Promise<AdminPaymentsResponse>
    },
    enabled: !!user?.uid,
    refetchInterval: process.env.NODE_ENV === 'production' ? 10000 : 30000,
    refetchOnWindowFocus: true
  })
}
