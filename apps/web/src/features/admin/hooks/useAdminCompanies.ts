'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type AdminCompany = {
  id: string
  name: string
  raisonSociale?: string
  niu?: string
  sigle?: string
  registrationNumber: string
  sector: string
  activite_principale?: string
  city: string
  ville?: string
  region?: string
  centre_de_rattachement?: string
  country: string
  yearFounded?: number
  employeeCount?: number
  revenue?: number
  website?: string
  linkedinUrl?: string
  importedBy: string
  importedAt: string
  verified: boolean
}

type AdminCompaniesResponse = {
  items: AdminCompany[]
  total: number
  page: number
  pageSize: number
}

export function useAdminCompanies(page: number = 1, pageSize: number = 20) {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-companies', page, pageSize],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(
        `${backendUrl}/api/admin/companies?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token || ''}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Impossible de charger les entreprises')
      }

      return response.json() as Promise<AdminCompaniesResponse>
    },
    enabled: !!user?.uid
  })
}
