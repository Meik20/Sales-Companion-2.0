import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

type Input = {
  userId:    string
  userEmail: string
  userName:  string
  subject:   string
  type:      'chat' | 'ticket'
}

export async function createSupportThread(input: Input) {
  return addDoc(collection(firestore, 'support_threads'), {
    ...input,
    status:    'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
