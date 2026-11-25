'use client'

import { useQuery } from '@tanstack/react-query'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import type { ShortcutCountsResult } from '@/lib/supabase-companies'

export function useShortcutCounts() {
  const country = useProspectingCountry()

  return useQuery<ShortcutCountsResult>({
    queryKey: ['search-shortcut-counts', country],
    queryFn: async () => {
      const res = await fetch(`/api/search/shortcuts-counts?country=${encodeURIComponent(country)}`)
      if (!res.ok) {
        throw new Error('Failed to fetch shortcut counts')
      }
      return res.json()
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}
