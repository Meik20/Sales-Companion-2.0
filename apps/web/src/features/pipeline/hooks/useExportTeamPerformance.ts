'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useState } from 'react'

export type ExportFilters = {
  memberId?: string
  from?: string   // "YYYY-MM-DD"
  to?: string     // "YYYY-MM-DD"
}

/**
 * Hook to trigger a CSV pipeline export for the manager.
 * Downloads the file automatically in the browser.
 */
export function useExportTeamPerformance() {
  const { user }        = useCurrentUser()
  const { pushToast }   = useToast()
  const [loading, setLoading] = useState(false)

  async function exportPerformance(filters: ExportFilters = {}) {
    setLoading(true)
    try {
      const token = await user?.getIdToken()
      if (!token) throw new Error('Non authentifié')

      const params = new URLSearchParams()
      if (filters.memberId) params.set('memberId', filters.memberId)
      if (filters.from)     params.set('from',     filters.from)
      if (filters.to)       params.set('to',       filters.to)

      const url = `/api/pipeline/export${params.toString() ? `?${params}` : ''}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur serveur' }))
        throw new Error(err.message ?? 'Erreur export')
      }

      // Trigger browser download
      const blob = await res.blob()
      const today = new Date().toISOString().slice(0, 10)
      const filename = `pipeline_performances_${today}.csv`

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

      pushToast({ type: 'success', title: 'Export réussi', description: `Fichier "${filename}" téléchargé.` })
    } catch (err) {
      pushToast({
        type: 'error',
        title: "Erreur d'export",
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setLoading(false)
    }
  }

  return { exportPerformance, loading }
}
