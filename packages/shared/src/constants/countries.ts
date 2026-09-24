/**
 * Pays supportés par Sales Companion 2.0.
 * Le code ISO 3166-1 alpha-2 est utilisé comme identifiant unique.
 * L'indicatif téléphonique (dialCode) sert à valider le numéro saisi à l'inscription.
 */
export const SUPPORTED_COUNTRIES = [
  {
    code: 'CM',
    name: 'Cameroun',
    flag: '🇨🇲',
    dialCode: '+237',
    dialPattern: /^\+237\d{8,9}$|^237\d{8,9}$|^6\d{8}$|^2\d{8}$/,
    examplePhone: '+237 6XX XXX XXX'
  },
  {
    code: 'SN',
    name: 'Sénégal',
    flag: '🇸🇳',
    dialCode: '+221',
    dialPattern: /^\+221\d{9}$|^221\d{9}$|^[37]\d{8}$/,
    examplePhone: '+221 7X XXX XX XX'
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    flag: '🇨🇮',
    dialCode: '+225',
    dialPattern: /^\+225\d{10}$|^225\d{10}$|^0[57]\d{8}$/,
    examplePhone: '+225 07 XX XX XX XX'
  },
  {
    code: 'BJ',
    name: 'Bénin',
    flag: '🇧🇯',
    dialCode: '+229',
    dialPattern: /^\+229\d{8}$|^229\d{8}$|^[4-9]\d{7}$/,
    examplePhone: '+229 9X XX XX XX'
  },
  {
    code: 'TG',
    name: 'Togo',
    flag: '🇹🇬',
    dialCode: '+228',
    dialPattern: /^\+228\d{8}$|^228\d{8}$|^[29]\d{7}$/,
    examplePhone: '+228 9X XX XX XX'
  },
  {
    code: 'TD',
    name: 'Tchad',
    flag: '🇹🇩',
    dialCode: '+235',
    dialPattern: /^\+235\d{8}$|^235\d{8}$|^[69]\d{7}$/,
    examplePhone: '+235 6X XX XX XX'
  },
  {
    code: 'CF',
    name: 'République Centrafricaine',
    flag: '🇨🇫',
    dialCode: '+236',
    dialPattern: /^\+236\d{8}$|^236\d{8}$|^[27]\d{7}$/,
    examplePhone: '+236 7X XX XX XX'
  }
] as const

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code']

/** Map code → nom du pays (pour affichage rapide) */
export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c.name])
)

/** Map code → drapeau */
export const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c.flag])
)

/** Map code → indicatif téléphonique */
export const COUNTRY_DIAL_CODES: Record<string, string> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c.dialCode])
)

/**
 * Valide qu'un numéro de téléphone correspond au pays sélectionné.
 * Retourne true si valide, false sinon.
 */
export function validatePhoneForCountry(phone: string, countryCode: string): boolean {
  const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode)
  if (!country) return phone.trim().length >= 8
  const normalized = phone.replace(/[\s\-().]/g, '')
  return country.dialPattern.test(normalized)
}
