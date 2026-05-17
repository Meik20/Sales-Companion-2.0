export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[_-]/g, '')
}

export function normalizeCell(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}

export function normalizeNullable(value: unknown) {
  const normalized = normalizeCell(value)
  return normalized || null
}
