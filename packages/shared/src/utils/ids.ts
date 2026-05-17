function sanitizeSegment(value: string) {
  return value.trim().replace(/\s+/g, '')
}

export function buildDisplayName(firstname: string, lastname: string) {
  return `${firstname.trim()} ${lastname.trim()}`.trim()
}

export function buildTeamAccessLabel(firstname: string, lastname: string, company: string) {
  return `${sanitizeSegment(firstname)}${sanitizeSegment(lastname)}@${sanitizeSegment(company)}`
}
