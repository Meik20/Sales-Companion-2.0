export const CRM_SECTORS = [
  'Commerce',
  'BTP & Construction',
  'Industrie manufacturière',
  'Agriculture & Agroalimentaire',
  'Services & Conseil',
  'Transport & Logistique',
  'Hôtellerie & Restauration',
  'Santé',
  'Éducation & Formation',
  'Technologies & Numérique',
  'Finance & Assurance',
  'Énergie & Mines',
  'Autre'
]

export const CRM_CITIES = [
  'Douala',
  'Yaoundé',
  'Bafoussam',
  'Garoua',
  'Bamenda',
  'Maroua',
  'Ngaoundéré',
  'Kumba',
  'Limbe',
  'Bertoua',
  'Ebolowa',
  'Autre'
]

export const CRM_STATUS_LIST = [
  { value: 'new', label: '🔵 Nouveau', labelFr: 'Nouveau', labelEn: 'New' },
  { value: 'to_contact', label: '🟡 À contacter', labelFr: 'À contacter', labelEn: 'To contact' },
  { value: 'contacted', label: '🟡 Contacté', labelFr: 'Contacté', labelEn: 'Contacted' },
  { value: 'in_discussion', label: '🟠 En discussion', labelFr: 'En discussion', labelEn: 'In discussion' },
  { value: 'proposal_sent', label: '🟣 Proposition envoyée', labelFr: 'Proposition envoyée', labelEn: 'Proposal sent' },
  { value: 'won', label: '🟢 Client', labelFr: 'Client', labelEn: 'Customer' },
  { value: 'lost', label: '🔴 Perdu', labelFr: 'Perdu', labelEn: 'Lost' }
] as const
