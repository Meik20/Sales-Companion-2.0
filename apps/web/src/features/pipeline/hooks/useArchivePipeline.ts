'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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

      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline', user.uid] })
      await queryClient.invalidateQueries({ queryKey: ['archived-leads', user.uid] })

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

      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline', user.uid] })
      await queryClient.invalidateQueries({ queryKey: ['archived-leads', user.uid] })

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

/** Récupérer tous les leads archivés du manager. */
export function useArchivedLeads() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [fetched, setFetched] = useState(false)

  const fetchArchived = async () => {
    if (!user?.uid) return
    setLoading(true)
    try {
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
      setItems(json.items || [])
      setFetched(true)
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Impossible de charger les archives',
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => fetchArchived()

  return { items, loading, fetched, fetchArchived, refresh }
}
