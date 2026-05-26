'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type AdminImport = {
  id: string
  fileName: string
  totalRecords: number
  successCount: number
  errorCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  importedBy: string
  importedAt: string
  updatedAt: string
  errors?: string[]
}

type AdminImportsResponse = {
  items: AdminImport[]
  total: number
  page: number
  pageSize: number
}

export function useAdminImports(page: number = 1, pageSize: number = 20) {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-imports', page, pageSize],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(
        `${backendUrl}/api/admin/imports?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token || ''}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Impossible de charger les imports')
      }

      return response.json() as Promise<AdminImportsResponse>
    },
    enabled: !!user?.uid
  })
}
