/**
 * Pays supportés par Sales Companion 2.0.
 * Le code ISO 3166-1 alpha-2 est utilisé comme identifiant unique.
 * L'indicatif téléphonique (dialCode) sert à valider le numéro saisi à l'inscription.
 */
export const SUPPORTED_COUNTRIES = [
  {
    code: 'CM',
    name: 'Cameroun',
    nameEn: 'Cameroon',
    flag: '🇨🇲',
    dialCode: '+237',
    dialPattern: /^\+237\d{8,9}$|^237\d{8,9}$|^6\d{8}$|^2\d{8}$/,
    examplePhone: '+237 6XX XXX XXX'
  },
  {
    code: 'SN',
    name: 'Sénégal',
    nameEn: 'Senegal',
    flag: '🇸🇳',
    dialCode: '+221',
    dialPattern: /^\+221\d{9}$|^221\d{9}$|^[37]\d{8}$/,
    examplePhone: '+221 7X XXX XX XX'
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    nameEn: "Ivory Coast",
    flag: '🇨🇮',
    dialCode: '+225',
    dialPattern: /^\+225\d{10}$|^225\d{10}$|^0[57]\d{8}$/,
    examplePhone: '+225 07 XX XX XX XX'
  },
  {
    code: 'BJ',
    name: 'Bénin',
    nameEn: 'Benin',
    flag: '🇧🇯',
    dialCode: '+229',
    dialPattern: /^\+229\d{8}$|^229\d{8}$|^[4-9]\d{7}$/,
    examplePhone: '+229 9X XX XX XX'
  },
  {
    code: 'TG',
    name: 'Togo',
    nameEn: 'Togo',
    flag: '🇹🇬',
    dialCode: '+228',
    dialPattern: /^\+228\d{8}$|^228\d{8}$|^[29]\d{7}$/,
    examplePhone: '+228 9X XX XX XX'
  },
  {
    code: 'TD',
    name: 'Tchad',
    nameEn: 'Chad',
    flag: '🇹🇩',
    dialCode: '+235',
    dialPattern: /^\+235\d{8}$|^235\d{8}$|^[69]\d{7}$/,
    examplePhone: '+235 6X XX XX XX'
  },
  {
    code: 'CF',
    name: 'République Centrafricaine',
    nameEn: 'Central African Republic',
    flag: '🇨🇫',
    dialCode: '+236',
    dialPattern: /^\+236\d{8}$|^236\d{8}$|^[27]\d{7}$/,
    examplePhone: '+236 7X XX XX XX'
  }
] as const

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code']

/** Formes grammaticales utilisées dans les contenus publics et les messages IA. */
export const COUNTRY_FRENCH_IN: Record<CountryCode, string> = {
  CM: 'au Cameroun',
  SN: 'au Sénégal',
  CI: "en Côte d'Ivoire",
  BJ: 'au Bénin',
  TG: 'au Togo',
  TD: 'au Tchad',
  CF: 'en République centrafricaine'
}

export const COUNTRY_FRENCH_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'camerounaises',
  SN: 'sénégalaises',
  CI: 'ivoiriennes',
  BJ: 'béninoises',
  TG: 'togolaises',
  TD: 'tchadiennes',
  CF: 'centrafricaines'
}

export const COUNTRY_FRENCH_MARKET_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'camerounais',
  SN: 'sénégalais',
  CI: 'ivoirien',
  BJ: 'béninois',
  TG: 'togolais',
  TD: 'tchadien',
  CF: 'centrafricain'
}

export const COUNTRY_ENGLISH_IN: Record<CountryCode, string> = {
  CM: 'in Cameroon',
  SN: 'in Senegal',
  CI: 'in Ivory Coast',
  BJ: 'in Benin',
  TG: 'in Togo',
  TD: 'in Chad',
  CF: 'in the Central African Republic'
}

export const COUNTRY_ENGLISH_FOR: Record<CountryCode, string> = {
  CM: 'for Cameroon',
  SN: 'for Senegal',
  CI: 'for Ivory Coast',
  BJ: 'for Benin',
  TG: 'for Togo',
  TD: 'for Chad',
  CF: 'for the Central African Republic'
}

export const COUNTRY_ENGLISH_MARKET: Record<CountryCode, string> = {
  CM: 'the Cameroonian market',
  SN: 'the Senegalese market',
  CI: 'the Ivorian market',
  BJ: 'the Beninese market',
  TG: 'the Togolese market',
  TD: 'the Chadian market',
  CF: 'the Central African market'
}

export const COUNTRY_ENGLISH_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'Cameroonian',
  SN: 'Senegalese',
  CI: 'Ivorian',
  BJ: 'Beninese',
  TG: 'Togolese',
  TD: 'Chadian',
  CF: 'Central African'
}

/** Map code → nom du pays en français (pour affichage rapide) */
export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c.name])
)

/** Map code → nom du pays en anglais */
export const COUNTRY_NAMES_EN: Record<string, string> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((c) => [c.code, c.nameEn])
)

/** Retourne le nom du pays selon la langue courante */
export function getCountryName(code: string, lang: 'fr' | 'en' = 'fr'): string {
  if (lang === 'en') {
    return COUNTRY_NAMES_EN[code] ?? COUNTRY_NAMES[code] ?? code
  }
  return COUNTRY_NAMES[code] ?? code
}

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
  if (country.dialPattern.test(normalized)) return true
  const withDial = `${country.dialCode}${normalized}`
  const withDialNoPlus = `${country.dialCode.replace('+', '')}${normalized}`
  return country.dialPattern.test(withDial) || country.dialPattern.test(withDialNoPlus)
}

/** Identifiants fiscaux nationaux par pays (ex: NIU au Cameroun, NINEA au Sénégal, NCC en Côte d'Ivoire) */
export const COUNTRY_TAX_LABELS: Record<CountryCode, string> = {
  CM: 'NIU',
  SN: 'NINEA',
  CI: 'NCC',
  BJ: 'IFU',
  TG: 'NIF',
  TD: 'NIF',
  CF: 'NIF'
}

/** Devises officielles par pays */
export const COUNTRY_CURRENCIES: Record<CountryCode, string> = {
  CM: 'XAF',
  SN: 'XOF',
  CI: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  TD: 'XAF',
  CF: 'XAF'
}



