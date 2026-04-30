import { describe, expect, it } from 'vitest'
import { normalizeCell, normalizeHeader, normalizeNullable } from './import-normalize'

describe('import-normalize', () => {
  it('normalizeHeader removes spaces, accents, underscores and dashes', () => {
    expect(normalizeHeader('Raison sociale')).toBe('raisonsociale')
    expect(normalizeHeader('Région')).toBe('region')
    expect(normalizeHeader('company_name')).toBe('companyname')
    expect(normalizeHeader('company-name')).toBe('companyname')
  })

  it('normalizeCell trims values', () => {
    expect(normalizeCell('  Hello  ')).toBe('Hello')
    expect(normalizeCell(42)).toBe('42')
  })

  it('normalizeNullable returns null for empty value', () => {
    expect(normalizeNullable('   ')).toBeNull()
    expect(normalizeNullable('abc')).toBe('abc')
  })
})