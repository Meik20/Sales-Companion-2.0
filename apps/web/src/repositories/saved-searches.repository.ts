'use client'

import { addDoc, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

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
      createdAt: new Date(),
    })
  },

  async findByUserId(userId: string) {
    const q = query(collection(firestore, 'saved_searches'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (SavedSearch & { id: string })[]
  },

  async delete(id: string) {
    return deleteDoc(doc(firestore, 'saved_searches', id))
  },
}
