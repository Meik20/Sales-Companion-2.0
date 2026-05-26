// Business sectors/industries for user profile
export const BUSINESS_SECTORS = [
  'Technologie & Logiciels',
  'Services Financiers',
  'Santé & Pharmacie',
  'Vente au Détail',
  'Immobilier',
  'Construction & BTP',
  'Agro-alimentaire',
  'Industrie manufacturière',
  'Énergie & Utilities',
  'Télécom & Réseaux',
  'Transports & Logistique',
  'Tourisme & Hôtellerie',
  'Éducation',
  'Médias & Divertissement',
  'Assurances',
  'Ressources Humaines',
  'Consultants & Services',
  'E-commerce',
  'Marketing & Publicité',
  'Autres'
] as const

export type BusinessSector = (typeof BUSINESS_SECTORS)[number]
