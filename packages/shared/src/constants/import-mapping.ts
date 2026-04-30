import type { CompanyImportColumnMapping } from '../types/import'

export const defaultCompanyImportMapping: CompanyImportColumnMapping = {
  raisonSociale: ['raisonSociale', 'raison sociale', 'company', 'companyName', 'nom', 'name'],
  sigle: ['sigle', 'abreviation', 'abbreviation'],
  niu: ['niu', 'nif', 'taxId'],
  activitePrincipale: ['activitePrincipale', 'activité principale', 'activite', 'activity'],
  sector: ['sector', 'secteur'],
  region: ['region', 'région'],
  city: ['city', 'ville'],
  address: ['address', 'adresse'],
  telephone: ['telephone', 'téléphone', 'phone', 'mobile'],
  email: ['email', 'mail'],
  website: ['website', 'site', 'siteweb', 'web'],
  dirigeant: ['dirigeant', 'manager', 'owner', 'responsable'],
  rccm: ['rccm', 'registreCommerce']
}