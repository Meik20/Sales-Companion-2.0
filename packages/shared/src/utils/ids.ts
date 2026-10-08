function sanitizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

export function buildDisplayName(firstname: string, lastname: string) {
  return `${firstname.trim()} ${lastname.trim()}`.trim()
}

export function buildTeamAccessLabel(firstname: string, lastname: string, company: string) {
  return `${sanitizeSegment(firstname)}${sanitizeSegment(lastname)}@${sanitizeSegment(company)}`
}

export function generateOrgCode(countryCode = 'CM'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let randomPart = ''
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * chars.length)
    randomPart += chars.charAt(idx)
  }
  const cleanCountry =
    (countryCode || 'CM')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2) || 'CM'
  return `SC-${cleanCountry}-${randomPart}`
}

export function normalizeNiu(niu?: string | null): string {
  if (!niu) return ''
  return niu
    .trim()
    .toUpperCase()
    .replace(/[\s\-_./]/g, '')
}
