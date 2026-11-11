import { describe, it, expect } from 'vitest'
import {
  osmTagsToSector,
  osmNodeToCompany,
  buildOverpassQuery
} from '../useOverpassSearch'

describe('useOverpassSearch helpers', () => {
  it('correctly maps known OSM amenity/shop/office tags to Sales Companion sectors', () => {
    expect(osmTagsToSector({ amenity: 'bank' })).toBe('Finance & Banque')
    expect(osmTagsToSector({ amenity: 'pharmacy' })).toBe('SANTE/PHARMACIE')
    expect(osmTagsToSector({ shop: 'hardware' })).toBe('BTP & Construction')
    expect(osmTagsToSector({ office: 'telecommunication' })).toBe('Technologies & Numérique')
    expect(osmTagsToSector({ amenity: 'restaurant' })).toBe('Hôtellerie & Restauration')
  })

  it('falls back gracefully on unknown tags or empty tags', () => {
    expect(osmTagsToSector({ craft: 'shoemaker' })).toBe('Shoemaker')
    expect(osmTagsToSector({})).toBe('Commerce & Distribution')
  })

  it('converts an OSM node to a valid Company object with distance computation', () => {
    const node = {
      id: 123456,
      type: 'node' as const,
      lat: 4.051,
      lon: 9.702,
      tags: {
        name: 'Agence Akwa Central',
        amenity: 'bank',
        phone: '+237699000000',
        'addr:city': 'Douala',
        'addr:street': 'Boulevard de la Liberté'
      }
    }

    // User position 1km away in Akwa
    const userLat = 4.05
    const userLng = 9.7

    const company = osmNodeToCompany(node, userLat, userLng)

    expect(company.id).toBe('osm_123456')
    expect(company.raisonSociale).toBe('Agence Akwa Central')
    expect(company.sector).toBe('Finance & Banque')
    expect(company.city).toBe('Douala')
    expect(company.telephone).toBe('+237699000000')
    expect(company._source).toBe('osm_live')
    expect(company.verified).toBe(false)
    expect(typeof company.distanceKm).toBe('number')
    expect(company.distanceFormatted).toBeDefined()
    expect(company.distanceKm).toBeLessThan(1) // less than 1km
  })

  it('builds an appropriate Overpass QL query bounded by coordinates and radius', () => {
    const query = buildOverpassQuery(4.05, 9.7, 5000)
    expect(query).toContain('[out:json]')
    expect(query).toContain('(around:5000,4.05,9.7)')
    expect(query).toContain('out center 60;')
  })
})
