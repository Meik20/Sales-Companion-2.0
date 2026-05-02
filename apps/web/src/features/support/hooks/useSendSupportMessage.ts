import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export const sendSupportMessage = async (data: {
  threadId: string
  senderId: string
  senderRole: string
  content: string
}) => {
  try {
    // Add message to thread subcollection
    await addDoc(collection(firestore, 'support_threads', data.threadId, 'messages'), {
      senderId: data.senderId,
      senderRole: data.senderRole,
      content: data.content,
      createdAt: serverTimestamp(),
    })

    // Update thread's lastMessage and updatedAt
    await updateDoc(doc(firestore, 'support_threads', data.threadId), {
      lastMessage: data.content,
      updatedAt: serverTimestamp(),
      unreadByAdmin: true,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending support message:', error)
    throw error
  }
}