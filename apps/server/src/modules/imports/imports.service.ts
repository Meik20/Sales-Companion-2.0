import type { CompanyImportColumnMapping } from '@sales-companion/shared'
import { adminDb } from '../../firebase/admin'
import { companyImportService } from '../../services/company-import.service'

type ImportFileInput = {
  buffer: Buffer
  filename: string
  sourceFile?: string
  importedBy?: string
  sheetName?: string
  mapping?: CompanyImportColumnMapping
  dryRun?: boolean
}

type PreviewFileInput = {
  buffer: Buffer
  filename: string
  sheetName?: string
  mapping?: CompanyImportColumnMapping
}

export const importsService = {
  async previewCompaniesFile(input: PreviewFileInput) {
    return companyImportService.previewCompaniesImport(input)
  },

  async importCompaniesFile(input: ImportFileInput) {
    return companyImportService.importCompanies(input)
  },

  async getLogs() {
    const snapshot = await adminDb
      .collection('import_logs')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  },

  async getLogsPaginated(page: number = 1, pageSize: number = 20) {
    const pageNum = Math.max(1, page)
    const limit = Math.max(1, Math.min(pageSize, 100))
    const offset = (pageNum - 1) * limit

    // Get total count
    const totalSnapshot = await adminDb
      .collection('import_logs')
      .count()
      .get()
    const total = totalSnapshot.data().count

    // Get paginated data
    const snapshot = await adminDb
      .collection('import_logs')
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit)
      .get()

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      fileName: doc.data().fileName || doc.data().filename,
      totalRecords: doc.data().totalRecords || 0,
      successCount: doc.data().successCount || 0,
      errorCount: doc.data().errorCount || 0,
      status: doc.data().status || 'pending',
      importedBy: doc.data().importedBy || 'unknown',
      importedAt: doc.data().createdAt || doc.data().importedAt,
      updatedAt: doc.data().updatedAt || doc.data().createdAt,
      errors: doc.data().errors || []
    }))

    return {
      items,
      total,
      page: pageNum,
      pageSize: limit
    }
  }
}