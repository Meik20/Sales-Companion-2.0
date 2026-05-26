const allowedExtensions = ['.csv', '.xlsx', '.xls']

export function assertAllowedImportFilename(filename: string) {
  const lower = filename.toLowerCase()

  const allowed = allowedExtensions.some((ext) => lower.endsWith(ext))

  if (!allowed) {
    throw new Error('Unsupported file type. Allowed: .csv, .xlsx, .xls')
  }
}

export function assertImportRowsLimit(totalRows: number, maxRows = 10000) {
  if (totalRows > maxRows) {
    throw new Error(`Import exceeds max rows limit (${maxRows})`)
  }
}

export function assertImportHeadersLimit(headers: string[], maxHeaders = 100) {
  if (headers.length > maxHeaders) {
    throw new Error(`Import exceeds max headers limit (${maxHeaders})`)
  }
}
