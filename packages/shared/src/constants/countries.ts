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
    nameEn: 'Ivory Coast',
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

/** Formes adjectivales françaises : Féminin Pluriel (ex: "entreprises camerounaises", "équipes tchadiennes") */
export const COUNTRY_FRENCH_FEM_PLUR_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'camerounaises',
  SN: 'sénégalaises',
  CI: 'ivoiriennes',
  BJ: 'béninoises',
  TG: 'togolaises',
  TD: 'tchadiennes',
  CF: 'centrafricaines'
}

/** Formes adjectivales françaises : Féminin Singulier (ex: "l'économie tchadienne", "une entreprise sénégalaise") */
export const COUNTRY_FRENCH_FEM_SING_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'camerounaise',
  SN: 'sénégalaise',
  CI: 'ivoirienne',
  BJ: 'béninoise',
  TG: 'togolaise',
  TD: 'tchadienne',
  CF: 'centrafricaine'
}

/** Formes adjectivales françaises : Masculin Singulier (ex: "le marché tchadien", "l'annuaire camerounais") */
export const COUNTRY_FRENCH_MASC_SING_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'camerounais',
  SN: 'sénégalais',
  CI: 'ivoirien',
  BJ: 'béninois',
  TG: 'togolais',
  TD: 'tchadien',
  CF: 'centrafricain'
}

/** Formes adjectivales françaises : Masculin Pluriel (ex: "les commerciaux tchadiens", "les professionnels sénégalais") */
export const COUNTRY_FRENCH_MASC_PLUR_ADJECTIVE: Record<CountryCode, string> = {
  CM: 'camerounais',
  SN: 'sénégalais',
  CI: 'ivoiriens',
  BJ: 'béninois',
  TG: 'togolais',
  TD: 'tchadiens',
  CF: 'centrafricains'
}

/**
 * Adjectif féminin pluriel (compatibilité descendante).
 * ATTENTION : Ne pas utiliser devant un nom masculin tel que "marché" ! Utiliser COUNTRY_FRENCH_MARKET_ADJECTIVE ou COUNTRY_FRENCH_MASC_SING_ADJECTIVE.
 */
export const COUNTRY_FRENCH_ADJECTIVE = COUNTRY_FRENCH_FEM_PLUR_ADJECTIVE

/**
 * Adjectif masculin singulier pour les marchés et contextes économiques.
 * Ex : "le marché tchadien", "l'écosystème camerounais".
 */
export const COUNTRY_FRENCH_MARKET_ADJECTIVE = COUNTRY_FRENCH_MASC_SING_ADJECTIVE

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

/** Configuration UI et tokens d'ambiance visuelle par pays */
export interface CountryThemeConfig {
  primaryColor: string
  accentColor: string
  glowColor: string
  gradient: string
  telecoms: string[]
}

export const COUNTRY_THEME_CONFIG: Record<CountryCode, CountryThemeConfig> = {
  CM: {
    primaryColor: '#059669',
    accentColor: '#d97706',
    glowColor: 'rgba(5, 150, 105, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(217, 119, 6, 0.12) 100%)',
    telecoms: ['MTN MoMo', 'Orange Money']
  },
  SN: {
    primaryColor: '#0d9488',
    accentColor: '#eab308',
    glowColor: 'rgba(13, 148, 136, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(234, 179, 8, 0.12) 100%)',
    telecoms: ['Wave', 'Orange Money', 'Free Money']
  },
  CI: {
    primaryColor: '#ea580c',
    accentColor: '#16a34a',
    glowColor: 'rgba(234, 88, 12, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(22, 163, 74, 0.12) 100%)',
    telecoms: ['Wave CI', 'Orange Money', 'MTN MoMo', 'Moov']
  },
  BJ: {
    primaryColor: '#0284c7',
    accentColor: '#16a34a',
    glowColor: 'rgba(2, 132, 199, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(22, 163, 74, 0.12) 100%)',
    telecoms: ['Moov Money', 'MTN MoMo', 'Celtiis']
  },
  TG: {
    primaryColor: '#16a34a',
    accentColor: '#dc2626',
    glowColor: 'rgba(22, 163, 74, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(22, 163, 74, 0.15) 0%, rgba(220, 38, 38, 0.12) 100%)',
    telecoms: ['TMoney', 'Moov Money']
  },
  TD: {
    primaryColor: '#2563eb',
    accentColor: '#e11d48',
    glowColor: 'rgba(37, 99, 235, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(225, 29, 72, 0.12) 100%)',
    telecoms: ['Airtel Money', 'Moov Africa']
  },
  CF: {
    primaryColor: '#3b82f6',
    accentColor: '#16a34a',
    glowColor: 'rgba(59, 130, 246, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(22, 163, 74, 0.12) 100%)',
    telecoms: ['Orange Money', 'Telecel']
  }
}

/** Recommandations culturelles et commerciales par pays pour l'IA et l'UX */
export const COUNTRY_BUSINESS_CULTURE: Record<
  CountryCode,
  {
    greeting: string
    businessStyle: string
    pitchHint: string
  }
> = {
  CM: {
    greeting: 'Chaleureux, respectueux des hiérarchies et dynamique',
    businessStyle: 'Pragmatique, orienté retour sur investissement rapide et preuve par l’exemple',
    pitchHint:
      'Mettre en avant la fiabilité, la rapidité d’exécution et la conformité fiscale (NIU)'
  },
  SN: {
    greeting: 'Élégant, fondé sur la Teranga et la confiance relationnelle mutuelle',
    businessStyle: 'Relationnel soutenu, écoute active et partenariat sur le long terme',
    pitchHint: 'Valoriser la relation humaine, la réputation et l’accompagnement de proximité'
  },
  CI: {
    greeting: 'Direct, énergique, chaleureux et axé sur les opportunités business',
    businessStyle: 'Rapide, orienté croissance, modernité et digitalisation',
    pitchHint:
      'Souligner l’impact immédiat sur le chiffre d’affaires, la vitesse et le gain de temps'
  },
  BJ: {
    greeting: 'Courtois, rigoureux et attentif aux détails techniques',
    businessStyle: 'Analytique, attaché à la structure formelle et à la clarté des engagements',
    pitchHint: 'Détailler les garanties, la méthodologie et les économies d’échelle'
  },
  TG: {
    greeting: 'Bienveillant, respectueux et axé sur la collaboration',
    businessStyle: 'Efficace, axé sur le commerce transfrontalier et les services logistiques',
    pitchHint: 'Insister sur l’agilité opérationnelle et la simplicité de mise en œuvre'
  },
  TD: {
    greeting: 'Sobre, direct, fondé sur la parole donnée et le respect',
    businessStyle: 'Direct, focalisé sur les partenariats solides et la disponibilité locale',
    pitchHint: 'Montrer la robustesse de la solution et la disponibilité de l’équipe'
  },
  CF: {
    greeting: 'Attentif, solennel et cordial',
    businessStyle: 'Prudent, orienté vers la reconstruction et le développement durable',
    pitchHint: 'Apporter des solutions concrètes, sécurisées et faciles à prendre en main'
  }
}
