'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { auth } from '@/services/firebase/client'
import { useToast } from '@/hooks/useToast'

/** Archiver une sélection de leads (ids). Réservé aux Team Managers. */
export function useArchiveLeads() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(false)

  const archiveLeads = async (ids: string[]) => {
    if (!user?.uid || ids.length === 0) return
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/pipeline/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'archive', ids })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Erreur lors de l\'archivage')

      // Invalider immédiatement TOUTES les vues de pipeline pour que le lead disparaisse partout
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['org-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['archived-leads'] }),
        queryClient.invalidateQueries({ queryKey: ['reporting'] }),
        queryClient.invalidateQueries({ queryKey: ['org-report'] })
      ])

      pushToast({
        type: 'success',
        title: `${json.archived} lead${json.archived > 1 ? 's archivés' : ' archivé'}`,
        description: json.skipped > 0 ? `${json.skipped} ignoré(s) (leads conclus)` : undefined
      })
      return json
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Erreur d\'archivage',
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { archiveLeads, loading }
}

/** Restaurer une sélection de leads archivés. Réservé aux Team Managers. */
export function useRestoreLeads() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(false)

  const restoreLeads = async (ids: string[]) => {
    if (!user?.uid || ids.length === 0) return
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/pipeline/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'restore', ids })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Erreur lors de la restauration')

      // Invalider immédiatement TOUTES les vues de pipeline pour réintégrer le lead partout
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['org-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['archived-leads'] }),
        queryClient.invalidateQueries({ queryKey: ['reporting'] }),
        queryClient.invalidateQueries({ queryKey: ['org-report'] })
      ])

      pushToast({
        type: 'success',
        title: `${json.archived} lead${json.archived > 1 ? 's restaurés' : ' restauré'}`,
      })
      return json
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Erreur de restauration',
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { restoreLeads, loading }
}

/** Récupérer tous les leads archivés du Team Manager avec synchronisation réactive React Query. */
export function useArchivedLeads() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['archived-leads', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return []
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/pipeline/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'list' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Erreur de chargement')
      return (json.items || []) as any[]
    },
    enabled: !!user?.uid,
    staleTime: 30 * 1000
  })

  return {
    items: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    fetchArchived: async () => {
      await query.refetch()
    },
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: ['archived-leads'] })
    }
  }
}

