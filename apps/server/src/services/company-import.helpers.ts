import {
  defaultCompanyImportMapping,
  type CompanyImportColumnMapping
} from '@sales-companion/shared'
import { normalizeCell, normalizeHeader, normalizeNullable } from '../utils/import-normalize'

export type ParsedRow = Record<string, unknown>

export function pickMappedValue(row: ParsedRow, mappingKeys: string[] | undefined) {
  if (!mappingKeys?.length) return ''

  const normalizedEntries = Object.entries(row).map(([key, value]) => ({
    key,
    normalizedKey: normalizeHeader(key),
    value
  }))

  for (const rawCandidate of mappingKeys) {
    const candidate = normalizeHeader(rawCandidate)
    const match = normalizedEntries.find((entry) => entry.normalizedKey === candidate)

    if (match) {
      return match.value
    }
  }

  return ''
}

export function mapRowToCompany(
  row: ParsedRow,
  mapping: CompanyImportColumnMapping = defaultCompanyImportMapping
) {
  return {
    raisonSociale: normalizeCell(pickMappedValue(row, mapping.raisonSociale)),
    sigle: normalizeCell(pickMappedValue(row, mapping.sigle)) || undefined,
    niu: normalizeNullable(pickMappedValue(row, mapping.niu)),
    activitePrincipale:
      normalizeCell(pickMappedValue(row, mapping.activitePrincipale)) || undefined,
    sector: normalizeCell(pickMappedValue(row, mapping.sector)) || undefined,
    region: normalizeCell(pickMappedValue(row, mapping.region)) || undefined,
    city: normalizeCell(pickMappedValue(row, mapping.city)) || undefined,
    address: normalizeCell(pickMappedValue(row, mapping.address)) || undefined,
    telephone: normalizeCell(pickMappedValue(row, mapping.telephone)) || undefined,
    email: normalizeCell(pickMappedValue(row, mapping.email)) || undefined,
    website: normalizeCell(pickMappedValue(row, mapping.website)) || undefined,
    dirigeant: normalizeCell(pickMappedValue(row, mapping.dirigeant)) || undefined,
    rccm: normalizeCell(pickMappedValue(row, mapping.rccm)) || undefined
  }
}

export function buildCompanyLookupKey(company: {
  raisonSociale: string
  niu?: string | null
}) {
  const niu = company.niu?.trim()
  if (niu) return `niu:${niu.toLowerCase()}`
  return `raisonSociale:${company.raisonSociale.trim().toLowerCase()}`
}

export function getHeaders(rows: ParsedRow[]) {
  const headerSet = new Set<string>()

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key))
  })

  return Array.from(headerSet)
}

export function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }

  return chunks
}