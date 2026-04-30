import { adminDb } from '../../firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

type CreatePipelineItemInput = {
  userId: string
  managerUid?: string | null
  companyId: string
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  status: string
  notes?: string
  nextFollowUp?: string
}

type UpdatePipelineItemInput = {
  id: string
  userId: string
  data: Record<string, unknown>
}

export const pipelineService = {
  async listUserPipeline(userId: string) {
    const snapshot = await adminDb
      .collection('pipeline')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  },

  async getTeamPipeline(managerUid: string) {
    const snapshot = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  },

  async getPipelineItem(itemId: string, userId: string) {
    const doc = await adminDb.collection('pipeline').doc(itemId).get()

    if (!doc.exists) {
      throw new Error('Pipeline item not found')
    }

    const data = doc.data()
    
    // Verify ownership or manager access
    if (data?.userId !== userId && data?.managerUid !== userId) {
      throw new Error('Unauthorized')
    }

    return {
      id: doc.id,
      ...data,
    }
  },

  async createPipelineItem(input: CreatePipelineItemInput) {
    const docRef = adminDb.collection('pipeline').doc()

    const itemData = {
      id: docRef.id,
      userId: input.userId,
      managerUid: input.managerUid || null,
      companyId: input.companyId,
      companyName: input.companyName,
      companySector: input.companySector || null,
      companyCity: input.companyCity || null,
      companyPhone: input.companyPhone || null,
      companyEmail: input.companyEmail || null,
      status: input.status || 'prospection',
      notes: input.notes || null,
      nextFollowUp: input.nextFollowUp || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    await docRef.set(itemData)

    return {
      id: docRef.id,
      ...itemData,
    }
  },

  async updatePipelineItem(input: UpdatePipelineItemInput) {
    const doc = await adminDb.collection('pipeline').doc(input.id).get()

    if (!doc.exists) {
      throw new Error('Pipeline item not found')
    }

    const data = doc.data()
    
    // Verify ownership or manager access
    if (data?.userId !== input.userId && data?.managerUid !== input.userId) {
      throw new Error('Unauthorized')
    }

    const updateData = {
      ...input.data,
      updatedAt: Timestamp.now(),
    }

    await doc.ref.update(updateData)

    const updated = await doc.ref.get()
    return {
      id: updated.id,
      ...updated.data(),
    }
  },

  async deletePipelineItem(itemId: string, userId: string) {
    const doc = await adminDb.collection('pipeline').doc(itemId).get()

    if (!doc.exists) {
      throw new Error('Pipeline item not found')
    }

    const data = doc.data()
    
    // Verify ownership or manager access
    if (data?.userId !== userId && data?.managerUid !== userId) {
      throw new Error('Unauthorized')
    }

    await doc.ref.delete()

    return { success: true, id: itemId }
  },

  async getPipelineStats(userId: string) {
    const snapshot = await adminDb
      .collection('pipeline')
      .where('userId', '==', userId)
      .get()

    const stats = {
      total: snapshot.size,
      prospection: 0,
      negotiation: 0,
      conclusion: 0,
      lost: 0,
    }

    snapshot.forEach((doc) => {
      const status = doc.data().status as string
      if (status === 'prospection') stats.prospection++
      else if (status === 'negotiation') stats.negotiation++
      else if (status === 'conclusion') stats.conclusion++
      else if (status === 'lost') stats.lost++
    })

    return stats
  },

  async getTeamPipelineStats(managerUid: string) {
    const snapshot = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .get()

    const stats = {
      total: snapshot.size,
      prospection: 0,
      negotiation: 0,
      conclusion: 0,
      lost: 0,
      conversionRate: 0,
    }

    snapshot.forEach((doc) => {
      const status = doc.data().status as string
      if (status === 'prospection') stats.prospection++
      else if (status === 'negotiation') stats.negotiation++
      else if (status === 'conclusion') stats.conclusion++
      else if (status === 'lost') stats.lost++
    })

    stats.conversionRate =
      stats.total > 0 ? Math.round((stats.conclusion / stats.total) * 100) : 0

    return stats
  },
}
