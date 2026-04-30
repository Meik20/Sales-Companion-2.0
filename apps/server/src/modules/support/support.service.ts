import { admin, adminDb } from '../../firebase/admin'

type CreateAdminReplyInput = {
  threadId: string
  content: string
  adminUid: string
}

export const supportService = {
  async listThreads() {
    const snapshot = await adminDb.collection('support_threads').get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  },

  async replyToThread(input: CreateAdminReplyInput) {
    const threadRef = adminDb.collection('support_threads').doc(input.threadId)
    const messagesRef = threadRef.collection('messages').doc()

    await messagesRef.set({
      senderId: input.adminUid,
      senderRole: 'admin',
      content: input.content,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    await threadRef.update({
      lastMessage: input.content,
      unreadByUser: true,
      unreadByAdmin: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return { ok: true }
  }
}