'use client'

import { addDoc, collection, query, where, deleteDoc, doc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { getDocsWithOfflineFallback, formatTimestamp } from '@/lib/firestore-offline'

export type SavedSearch = {
  userId: string
  label: string
  filters: Record<string, unknown>
  resultCount: number
  createdAt: any
}

function cleanFilters(filters: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val
    }
  }
  return result
}

export const savedSearchesRepository = {
  async create(data: SavedSearch, idToken?: string) {
    const sanitized = {
      userId: data.userId,
      label: data.label,
      filters: cleanFilters(data.filters),
      resultCount: data.resultCount ?? 0,
      createdAt: new Date()
    }

    try {
      return await addDoc(collection(firestore, 'saved_searches'), sanitized)
    } catch (clientError) {
      console.warn('[savedSearchesRepository] Direct Firestore addDoc failed, using /api/saved-searches fallback:', clientError)
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          label: sanitized.label,
          filters: sanitized.filters,
          resultCount: sanitized.resultCount
        })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || 'Erreur lors de la sauvegarde de la recherche')
      }
      const json = await res.json()
      return { id: json.id } as any
    }
  },

  async findByUserId(userId: string) {
    try {
      const q = query(collection(firestore, 'saved_searches'), where('userId', '==', userId))
      const snapshot = await getDocsWithOfflineFallback(q)
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: formatTimestamp(data.createdAt) || new Date().toISOString()
        }
      }) as (SavedSearch & { id: string })[]

      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })

      return items
    } catch (err) {
      console.warn('[savedSearchesRepository] findByUserId client query failed:', err)
      return []
    }
  },

  async delete(id: string) {
    try {
      return await deleteDoc(doc(firestore, 'saved_searches', id))
    } catch (clientErr) {
      console.warn('[savedSearchesRepository] Direct deleteDoc failed, trying API fallback:', clientErr)
      await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' }).catch(() => {})
    }
  }
}

