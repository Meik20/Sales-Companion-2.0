export type ImportLogDoc = {
  filename: string
  total: number
  imported: number
  updated: number
  skipped: number
  errors: number
  sourceFile?: string
  importedBy?: string | null
  errorDetails?: Array<{
    row: number
    reason: string
  }>
  createdAt: FirestoreTimestampLike
}