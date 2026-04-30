import { adminDb } from '../../firebase/admin'

export const companiesService = {
  async list() {
    const snapshot = await adminDb.collection('companies').limit(100).get()
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  },

  async listPaginated(page: number = 1, pageSize: number = 20) {
    const pageNum = Math.max(1, page)
    const limit = Math.max(1, Math.min(pageSize, 100))
    const offset = (pageNum - 1) * limit

    // Get total count
    const totalSnapshot = await adminDb
      .collection('companies')
      .count()
      .get()
    const total = totalSnapshot.data().count

    // Get paginated data
    const snapshot = await adminDb
      .collection('companies')
      .orderBy('__name__')
      .offset(offset)
      .limit(limit)
      .get()

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      registrationNumber: doc.data().registrationNumber,
      sector: doc.data().sector,
      city: doc.data().city,
      country: doc.data().country,
      yearFounded: doc.data().yearFounded,
      employeeCount: doc.data().employeeCount,
      revenue: doc.data().revenue,
      website: doc.data().website,
      linkedinUrl: doc.data().linkedinUrl,
      importedBy: doc.data().importedBy,
      importedAt: doc.data().importedAt,
      verified: doc.data().verified || false
    }))

    return {
      items,
      total,
      page: pageNum,
      pageSize: limit
    }
  },

  async deleteOne(id: string) {
    await adminDb.collection('companies').doc(id).delete()
    return { id, deleted: true }
  },

  async deleteAll() {
    const snapshot = await adminDb.collection('companies').get()
    const batch = adminDb.batch()

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    return {
      deleted: snapshot.size
    }
  }
}