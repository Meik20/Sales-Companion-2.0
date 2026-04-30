export type CompanyImportRow = {
  raisonSociale?: string
  sigle?: string
  niu?: string | null
  activitePrincipale?: string
  sector?: string
  region?: string
  city?: string
  address?: string
  telephone?: string
  email?: string
  website?: string
  dirigeant?: string
  rccm?: string
}

export type CompanyImportColumnMapping = {
  raisonSociale?: string[]
  sigle?: string[]
  niu?: string[]
  activitePrincipale?: string[]
  sector?: string[]
  region?: string[]
  city?: string[]
  address?: string[]
  telephone?: string[]
  email?: string[]
  website?: string[]
  dirigeant?: string[]
  rccm?: string[]
}