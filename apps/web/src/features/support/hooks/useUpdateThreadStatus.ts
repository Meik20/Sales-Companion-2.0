import { updateDoc, doc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export const updateSupportThreadStatus = async (
  threadId: string,
  status: 'open' | 'resolved'
) => {
  try {
    await updateDoc(doc(firestore, 'support_threads', threadId), {
      status,
      updatedAt: new Date(),
    })
    return { success: true }
  } catch (error) {
    console.error('Error updating thread status:', error)
    throw error
  }
}
