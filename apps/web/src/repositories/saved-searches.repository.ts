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

export const savedSearchesRepository = {
  async create(data: SavedSearch) {
    return addDoc(collection(firestore, 'saved_searches'), {
      ...data,
      createdAt: new Date()
    })
  },

  async findByUserId(userId: string) {
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
  },

  async delete(id: string) {
    return deleteDoc(doc(firestore, 'saved_searches', id))
  }
}

