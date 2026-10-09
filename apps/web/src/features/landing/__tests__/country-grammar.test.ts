import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_COUNTRIES,
  COUNTRY_FRENCH_IN,
  COUNTRY_FRENCH_ADJECTIVE,
  COUNTRY_FRENCH_MARKET_ADJECTIVE,
  COUNTRY_FRENCH_MASC_SING_ADJECTIVE,
  COUNTRY_FRENCH_MASC_PLUR_ADJECTIVE,
  COUNTRY_FRENCH_FEM_SING_ADJECTIVE,
  COUNTRY_FRENCH_FEM_PLUR_ADJECTIVE,
  type CountryCode
} from '@sales-companion/shared'

describe('Country Grammar & Adjectives Concordance', () => {
  const countryCodes: CountryCode[] = SUPPORTED_COUNTRIES.map((c) => c.code as CountryCode)

  it('provides masculine singular adjectives for all supported countries', () => {
    expect(COUNTRY_FRENCH_MASC_SING_ADJECTIVE).toEqual({
      CM: 'camerounais',
      SN: 'sénégalais',
      CI: 'ivoirien',
      BJ: 'béninois',
      TG: 'togolais',
      TD: 'tchadien',
      CF: 'centrafricain'
    })
  })

  it('provides feminine plural adjectives for all supported countries', () => {
    expect(COUNTRY_FRENCH_FEM_PLUR_ADJECTIVE).toEqual({
      CM: 'camerounaises',
      SN: 'sénégalaises',
      CI: 'ivoiriennes',
      BJ: 'béninoises',
      TG: 'togolaises',
      TD: 'tchadiennes',
      CF: 'centrafricaines'
    })
  })

  it('guarantees that market adjective is masculine singular', () => {
    countryCodes.forEach((code) => {
      expect(COUNTRY_FRENCH_MARKET_ADJECTIVE[code]).toBe(COUNTRY_FRENCH_MASC_SING_ADJECTIVE[code])
      // Ensure it does NOT end with feminine plural 'iennes' or 'aises'
      expect(COUNTRY_FRENCH_MARKET_ADJECTIVE[code]).not.toMatch(/(aises|iennes|oises)$/)
    })
  })

  it('verifies Chad (TD) specifically satisfies "marché tchadien" and "équipes commerciales tchadiennes"', () => {
    const marketText = `Guide complet pour identifier, prospecter et signer des clients B2B sur le marché ${COUNTRY_FRENCH_MARKET_ADJECTIVE.TD}.`
    expect(marketText).toBe(
      'Guide complet pour identifier, prospecter et signer des clients B2B sur le marché tchadien.'
    )
    expect(marketText).not.toContain('marché tchadiennes')

    const testimonialsHeading = `Adopté par les équipes commerciales ${COUNTRY_FRENCH_FEM_PLUR_ADJECTIVE.TD}`
    expect(testimonialsHeading).toBe('Adopté par les équipes commerciales tchadiennes')
    expect(testimonialsHeading).not.toContain('commerciaux du terrain tchadiennes')
  })

  it('guarantees all 7 countries have valid prepositions in French', () => {
    expect(COUNTRY_FRENCH_IN).toEqual({
      CM: 'au Cameroun',
      SN: 'au Sénégal',
      CI: "en Côte d'Ivoire",
      BJ: 'au Bénin',
      TG: 'au Togo',
      TD: 'au Tchad',
      CF: 'en République centrafricaine'
    })
  })
})
