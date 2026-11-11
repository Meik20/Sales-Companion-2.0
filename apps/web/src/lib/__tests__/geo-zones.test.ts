import { describe, it, expect } from 'vitest'
import { findNearestGeoZone } from '../geo-zones'

describe('geo-zones findNearestGeoZone', () => {
  it('identifies Douala from coordinates in Douala', () => {
    const zone = findNearestGeoZone(4.051, 9.702, 'CM')
    expect(zone.city).toBe('Douala')
    expect(zone.region).toBe('Littoral')
  })

  it('identifies Yaoundé from coordinates in Yaoundé', () => {
    const zone = findNearestGeoZone(3.868, 11.518, 'CM')
    expect(zone.city).toBe('Yaoundé')
    expect(zone.region).toBe('Centre')
  })

  it('identifies Kribi accurately instead of snapping to Douala or Ebolowa', () => {
    // Kribi port / beach coordinates ~ 2.94, 9.91
    const zone = findNearestGeoZone(2.938, 9.907, 'CM')
    expect(zone.city).toBe('Kribi')
    expect(zone.region).toBe('Sud')
  })

  it('identifies Limbe accurately instead of snapping to Douala', () => {
    // Limbe ~ 4.02, 9.21
    const zone = findNearestGeoZone(4.015, 9.208, 'CM')
    expect(zone.city).toBe('Limbe')
    expect(zone.region).toBe('Sud-Ouest')
  })

  it('identifies Dakar for Senegal', () => {
    const zone = findNearestGeoZone(14.692, -17.446, 'SN')
    expect(zone.city).toBe('Dakar')
    expect(zone.region).toBe('Dakar')
  })

  it('identifies Abidjan for Côte d’Ivoire', () => {
    const zone = findNearestGeoZone(5.360, -4.008, 'CI')
    expect(zone.city).toBe('Abidjan')
    expect(zone.region).toBe('Abidjan')
  })
})

