'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useCreateSavedSearch } from '@/features/saved-searches/hooks/useCreateSavedSearch'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'

type Filters = { sector?: string; region?: string; city?: string; query?: string }

type Props = {
  filters: Filters
  results: unknown[]
}

export function SaveCurrentSearchButton({ filters, results }: Props) {
  const { t } = useTranslation()
  const mutation = useCreateSavedSearch()
  const { pushToast } = useToast()
  const [saved, setSaved] = useState(false)

  const hasFilters = Object.values(filters).some(Boolean)

  async function handleSave() {
    if (!hasFilters) return
    try {
      await mutation.mutateAsync({
        label:       [filters.query, filters.sector, filters.region, filters.city].filter(Boolean).join(' · ') || t('search.defaultSearchLabel'),
        filters,
        resultCount: results.length,
      })
      setSaved(true)
      pushToast({ type: 'success', title: t('search.saveSearchSuccess') })
    } catch {
      pushToast({ type: 'error', title: t('search.saveSearchError') })
    }
  }

  if (!hasFilters) return null

  if (saved) {
    return <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>✓ {t('search.savedSearch')}</span>
  }

  return (
    <Button size="sm" variant="ghost" loading={mutation.isPending} onClick={() => void handleSave()}>
      🔖 {t('search.saveSearch')}
    </Button>
  )
}
