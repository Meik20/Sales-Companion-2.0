import ExcelJS from 'exceljs'
import { admin, adminDb } from '../firebase/admin'
import { parseCsv } from '../utils/csv'
import {
  assertAllowedImportFilename,
  assertImportHeadersLimit,
  assertImportRowsLimit
} from '../utils/import-guards'
import {
  defaultCompanyImportMapping,
  type CompanyImportColumnMapping
} from '@sales-companion/shared'
import {
  buildCompanyLookupKey,
  chunkArray,
  getHeaders,
  mapRowToCompany,
  type ParsedRow
} from './company-import.helpers'

type ParseImportFileInput = {
  buffer: Buffer
  filename: string
  sheetName?: string
}

type ImportCompaniesInput = {
  buffer: Buffer
  filename: string
  sourceFile?: string
  importedBy?: string
  sheetName?: string
  mapping?: CompanyImportColumnMapping
  dryRun?: boolean
}

type PreviewCompaniesInput = {
  buffer: Buffer
  filename: string
  sheetName?: string
  mapping?: CompanyImportColumnMapping
}

async function parseSpreadsheet(input: ParseImportFileInput): Promise<ParsedRow[]> {
  const lower = input.filename.toLowerCase()

  // Fichiers texte : CSV, TXT, TSV, JSON, DAT, LOG, etc.
  if (lower.endsWith('.csv') || lower.endsWith('.txt') || lower.endsWith('.tsv') || 
      lower.endsWith('.dat') || lower.endsWith('.log') || lower.endsWith('.tab')) {
    return parseCsv(input.buffer.toString('utf-8'))
  }

  // Fichiers Excel
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(input.buffer as any)

    const sheet = input.sheetName
      ? workbook.getWorksheet(input.sheetName)
      : workbook.worksheets[0]

    if (!sheet) {
      return []
    }

    const rows: ParsedRow[] = []
    let headers: string[] = []

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row = headers
        const values = row.values as (ExcelJS.CellValue | undefined)[]
        headers = values.slice(1).map((v) => (v != null ? String(v) : ''))
        return
      }

      const obj: ParsedRow = {}
      headers.forEach((header, i) => {
        const cell = row.getCell(i + 1)
        obj[header] = cell.text ?? ''
      })
      rows.push(obj)
    })

    return rows
  }

  // Default : essayer comme fichier texte
  return parseCsv(input.buffer.toString('utf-8'))
}

export const companyImportService = {
  async previewCompaniesImport(input: PreviewCompaniesInput) {
    assertAllowedImportFilename(input.filename)

    const parsedRows = await parseSpreadsheet({
      buffer: input.buffer,
      filename: input.filename,
      sheetName: input.sheetName
    })

    assertImportRowsLimit(parsedRows.length)

    const headers = getHeaders(parsedRows)
    assertImportHeadersLimit(headers)

    const mapping = input.mapping ?? defaultCompanyImportMapping
    const preview = parsedRows.slice(0, 20).map((row, index) => ({
      rowNumber: index + 2,
      raw: row,
      mapped: mapRowToCompany(row, mapping)
    }))

    const requiredFieldValidation = preview.map((item) => ({
      rowNumber: item.rowNumber,
      valid: !!item.mapped.raisonSociale,
      errors: item.mapped.raisonSociale ? [] : ['raisonSociale manquante']
    }))

    return {
      filename: input.filename,
      totalRows: parsedRows.length,
      headers,
      preview,
      validation: requiredFieldValidation
    }
  },

  async importCompanies(input: ImportCompaniesInput) {
    assertAllowedImportFilename(input.filename)

    const parsedRows = await parseSpreadsheet({
      buffer: input.buffer,
      filename: input.filename,
      sheetName: input.sheetName
    })

    assertImportRowsLimit(parsedRows.length)

    const headers = getHeaders(parsedRows)
    assertImportHeadersLimit(headers)

    const mapping = input.mapping ?? defaultCompanyImportMapping
    const logRef = adminDb.collection('import_logs').doc()

    let imported = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    const errorDetails: Array<{ row: number; reason: string }> = []
    const validRows: Array<{
      rowNumber: number
      mapped: ReturnType<typeof mapRowToCompany>
    }> = []

    for (let index = 0; index < parsedRows.length; index += 1) {
      const row = parsedRows[index]
      if (!row) continue
      const mapped = mapRowToCompany(row, mapping)

      if (!mapped.raisonSociale) {
        skipped += 1
        errorDetails.push({
          row: index + 2,
          reason: 'raisonSociale manquante'
        })
        continue
      }

      validRows.push({
        rowNumber: index + 2,
        mapped
      })
    }

    if (input.dryRun) {
      await logRef.set({
        filename: input.filename,
        total: parsedRows.length,
        imported: 0,
        updated: 0,
        skipped,
        errors,
        sourceFile: input.sourceFile || input.filename,
        importedBy: input.importedBy ?? null,
        errorDetails,
        dryRun: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return {
        logId: logRef.id,
        total: parsedRows.length,
        imported: 0,
        updated: 0,
        skipped,
        errors,
        dryRun: true,
        errorDetails
      }
    }

    const chunks = chunkArray(validRows, 100)

    for (const chunk of chunks) {
      for (const item of chunk) {
        try {
          const lookupKey = buildCompanyLookupKey(item.mapped)

          const existingSnapshot = await adminDb
            .collection('companies')
            .where('lookupKey', '==', lookupKey)
            .limit(1)
            .get()

          if (existingSnapshot.empty) {
            const ref = adminDb.collection('companies').doc()

            await ref.set({
              id: ref.id,
              lookupKey,
              ...item.mapped,
              active: true,
              sourceFile: input.sourceFile || input.filename,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })

            imported += 1
          } else {
            const firstDoc = existingSnapshot.docs[0]
            if (!firstDoc) continue
            const existingRef = firstDoc.ref

            await existingRef.set(
              {
                ...item.mapped,
                lookupKey,
                active: true,
                sourceFile: input.sourceFile || input.filename,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              },
              { merge: true }
            )

            updated += 1
          }
        } catch (error) {
          errors += 1
          errorDetails.push({
            row: item.rowNumber,
            reason: error instanceof Error ? error.message : 'Erreur inconnue'
          })
        }
      }
    }

    await logRef.set({
      filename: input.filename,
      total: parsedRows.length,
      imported,
      updated,
      skipped,
      errors,
      sourceFile: input.sourceFile || input.filename,
      importedBy: input.importedBy ?? null,
      errorDetails,
      dryRun: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      logId: logRef.id,
      total: parsedRows.length,
      imported,
      updated,
      skipped,
      errors,
      dryRun: false,
      errorDetails
    }
  }
}
