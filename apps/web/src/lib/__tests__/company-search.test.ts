import { describe, it, expect, beforeEach, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const sampleCompanies = [
    {
      id: 'comp-1',
      raisonSociale: 'Pharmacie du Soleil',
      sigle: 'PDS',
      sector: 'Pharmacie & Santé',
      region: 'Littoral',
      city: 'Douala',
      niu: 'M0192837465',
      rccm: 'RC/DLA/2020/B/123',
      dirigeant: 'Dr. Jean Dupont',
      telephone: '+237699112233',
      email: 'contact@soleil.cm',
      adresse: 'Akwa, face cinéma',
      formeJuridique: 'SARL',
      capital: '10000000',
      country: 'CM'
    },
    {
      id: 'comp-2',
      raisonSociale: 'Société Générale de BTP',
      sigle: 'SGBTP',
      sector: 'Bâtiment et Travaux Publics',
      region: 'Centre',
      city: 'Yaoundé',
      niu: 'M0987654321',
      rccm: 'RC/YAO/2019/B/456',
      dirigeant: 'Paul Biya',
      telephone: '+237677445566',
      email: 'contact@sgbtp.cm',
      adresse: 'Bastos, derrière ambassade',
      formeJuridique: 'SA',
      capital: '50000000',
      country: 'CM'
    },
    {
      id: 'comp-3',
      raisonSociale: 'Afriq Tech Solutions',
      sigle: 'ATS',
      sector: 'Informatique et Télécoms',
      region: 'Littoral',
      city: 'Douala',
      niu: 'M0554433221',
      rccm: 'RC/DLA/2021/B/789',
      dirigeant: 'Marie Curie',
      telephone: '+237690123456',
      email: 'info@afriqtech.cm',
      adresse: 'Bonanjo, rue des banques',
      formeJuridique: 'SAS',
      capital: '5000000',
      country: 'CM'
    }
  ]

  const mockGet = vi.fn().mockResolvedValue({
    size: sampleCompanies.length,
    docs: sampleCompanies.map((c) => ({
      id: c.id,
      data: () => c
    }))
  })

  return {
    sampleCompanies,
    mockGet
  }
})

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      limit: vi.fn(() => ({
        get: mocks.mockGet
      }))
    }))
  }
}))

import {
  normalizeString,
  searchCompanies,
  getCompanyDetails,
  invalidateCompanyCache,
  getMarketOverview
} from '../company-search'

describe('company-search lib', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await invalidateCompanyCache()
  })

  describe('normalizeString', () => {
    it('devrait supprimer les accents et passer en minuscules', () => {
      expect(normalizeString('Électricité & Bâtiment')).toBe('electricite & batiment')
      expect(normalizeString('  SOCIÉTÉ ANONYME  ')).toBe('societe anonyme')
    })

    it('devrait gérer les valeurs nulles ou indéfinies sans planter', () => {
      expect(normalizeString('')).toBe('')
      expect(normalizeString(null as unknown as string)).toBe('')
      expect(normalizeString(undefined as unknown as string)).toBe('')
    })
  })

  describe('searchCompanies', () => {
    it('devrait trouver une entreprise par mot-clé dans la raison sociale', async () => {
      const response = await searchCompanies({ query: 'soleil' })
      expect(response.results.length).toBeGreaterThan(0)
      expect(response.results[0]!.raisonSociale).toBe('Pharmacie du Soleil')
    })

    it('devrait trouver une entreprise via un synonyme sectoriel', async () => {
      // Recherche 'sante' doit matcher 'Pharmacie & Santé'
      const response = await searchCompanies({ sector: 'sante' })
      expect(response.results.some((c) => c.id === 'comp-1')).toBe(true)
    })

    it('devrait filtrer par région et ville', async () => {
      const response = await searchCompanies({ region: 'Centre', city: 'Yaoundé' })
      expect(response.results.length).toBe(1)
      expect(response.results[0]!.id).toBe('comp-2')
    })

    it('devrait trouver par sigle exact', async () => {
      const response = await searchCompanies({ query: 'ATS' })
      expect(response.results.length).toBeGreaterThan(0)
      expect(response.results[0]!.sigle).toBe('ATS')
    })

    it('devrait respecter la limite demandée', async () => {
      const response = await searchCompanies({ limit: 1 })
      expect(response.results.length).toBe(1)
    })
  })

  describe('getCompanyDetails', () => {
    it('devrait retrouver par NIU', async () => {
      const comp = await getCompanyDetails('M0192837465')
      expect(comp).not.toBeNull()
      expect(comp?.raisonSociale).toBe('Pharmacie du Soleil')
    })

    it('devrait retrouver par ID document Firestore', async () => {
      const comp = await getCompanyDetails('comp-2')
      expect(comp).not.toBeNull()
      expect(comp?.sigle).toBe('SGBTP')
    })

    it('devrait renvoyer null si introuvable', async () => {
      const comp = await getCompanyDetails('INEXISTANT-999')
      expect(comp).toBeNull()
    })
  })

  describe('getMarketOverview', () => {
    it('devrait calculer correctement les agrégations de marché', async () => {
      const overview = await getMarketOverview({ country: 'CM' })
      expect(overview.totalCompaniesInDatabase).toBe(3)
      expect(overview.topCities.length).toBeGreaterThan(0)
      expect(overview.topSectors.length).toBeGreaterThan(0)
    })
  })
})
