export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Une erreur est survenue'
}