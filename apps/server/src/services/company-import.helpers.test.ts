import { describe, expect, it } from 'vitest'
import {
  buildCompanyLookupKey,
  chunkArray,
  getHeaders,
  mapRowToCompany,
  pickMappedValue
} from './company-import.helpers'

describe('company-import.helpers', () => {
  it('pickMappedValue finds a value from normalized header aliases', () => {
    const row = {
      'Raison sociale': 'Acme Corp',
      Ville: 'Douala'
    }

    const result = pickMappedValue(row, ['raisonSociale', 'companyName', 'raison sociale'])

    expect(result).toBe('Acme Corp')
  })

  it('mapRowToCompany maps a row to normalized company shape', () => {
    const row = {
      'Raison sociale': 'Acme Corp',
      Ville: 'Douala',
      Secteur: 'Tech',
      NIU: 'ABC123'
    }

    const result = mapRowToCompany(row)

    expect(result.raisonSociale).toBe('Acme Corp')
    expect(result.city).toBe('Douala')
    expect(result.sector).toBe('Tech')
    expect(result.niu).toBe('ABC123')
  })

  it('buildCompanyLookupKey prioritizes niu', () => {
    expect(
      buildCompanyLookupKey({
        raisonSociale: 'Acme Corp',
        niu: 'ABC123'
      })
    ).toBe('niu:abc123')
  })

  it('buildCompanyLookupKey falls back to raisonSociale', () => {
    expect(
      buildCompanyLookupKey({
        raisonSociale: 'Acme Corp',
        niu: null
      })
    ).toBe('raisonSociale:acme corp')
  })

  it('getHeaders returns merged headers', () => {
    const rows = [
      { a: 1, b: 2 },
      { b: 3, c: 4 }
    ]
    const headers = getHeaders(rows)

    expect(headers).toContain('a')
    expect(headers).toContain('b')
    expect(headers).toContain('c')
  })

  it('chunkArray splits items in chunks', () => {
    const chunks = chunkArray([1, 2, 3, 4, 5], 2)
    expect(chunks).toEqual([[1, 2], [3, 4], [5]])
  })
})
