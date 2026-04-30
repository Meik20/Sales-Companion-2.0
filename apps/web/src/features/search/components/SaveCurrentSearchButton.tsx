'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useCreateSavedSearch } from '@/features/saved-searches/hooks/useCreateSavedSearch'
import { useToast } from '@/hooks/useToast'

type Filters = { sector?: string; region?: string; city?: string; query?: string }

type Props = {
  filters: Filters
  results: unknown[]
}

export function SaveCurrentSearchButton({ filters, results }: Props) {
  const mutation = useCreateSavedSearch()
  const { pushToast } = useToast()
  const [saved, setSaved] = useState(false)

  const hasFilters = Object.values(filters).some(Boolean)

  async function handleSave() {
    if (!hasFilters) return
    try {
      await mutation.mutateAsync({
        label:       [filters.query, filters.sector, filters.region, filters.city].filter(Boolean).join(' · ') || 'Recherche',
        filters,
        resultCount: results.length,
      })
      setSaved(true)
      pushToast({ type: 'success', title: 'Recherche sauvegardée' })
    } catch {
      pushToast({ type: 'error', title: 'Sauvegarde impossible' })
    }
  }

  if (!hasFilters) return null

  if (saved) {
    return <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>✓ Sauvegardée</span>
  }

  return (
    <Button size="sm" variant="ghost" loading={mutation.isPending} onClick={() => void handleSave()}>
      🔖 Sauvegarder
    </Button>
  )
}
