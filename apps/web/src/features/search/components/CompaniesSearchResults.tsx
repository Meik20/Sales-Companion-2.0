import { Badge } from '@/components/ui/index'
import { AddToPipelineButton } from './AddToPipelineButton'
import { SaveCompanyButton } from './SaveCompanyButton'
import { colors } from '@/styles/tokens'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { useTranslation } from '@/providers/I18nProvider'

type Props = { items: Company[] }

// Champs toujours affichés en premier (s'ils existent)
const PRIMARY_FIELDS = [
  'raisonSociale',
  'sigle',
  'sector',
  'region',
  'city',
  'telephone',
  'email',
  'dirigeant',
  'niu'
]

// Champs à exclure de l'affichage brut des extras (déjà affichés ou méta)
const EXCLUDE_FROM_EXTRA = new Set([
  'id',
  'raisonSociale',
  'name',
  'sigle',
  'sector',
  'region',
  'city',
  'telephone',
  'email',
  'dirigeant',
  'niu',
  'rccm',
  'adresse',
  'capital',
  'formeJuridique',
  'importedBy',
  'createdAt',
  'updatedAt',
  'verified',
  'activite_principale',
  'centre_de_rattachement',
  'ville',
  'raison_sociale',
  'Secteur d activite',
  'Responsable',
  'dirigeant',
  'Responsable/Propriétaire',
  'Telephone',
  'Email',
  'Site Web',
  'Description',
  'Localisation',
  'RAISON SOCIALE',
  'SECTEUR D ACTIVITE',
  'RESPONSABLE',
  'secteur d activite',
  "Secteur d'activité",
  "Secteur d'activite",
  "SECTEUR D'ACTIVITE"
])

function formatFieldLabel(key: string, t: any): string {
  const trans = t(`field.${key}`)
  if (trans !== `field.${key}`) return trans
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

export function CompaniesSearchResults({ items }: Props) {
  const { t } = useTranslation()
  if (!items.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((company) => {
        // Extraire les champs supplémentaires du CSV qui ne sont pas déjà affichés
        const extraFields = Object.entries(company).filter(([key, val]) => {
          const normalizedKey = key.trim()
          return (
            !EXCLUDE_FROM_EXTRA.has(normalizedKey) &&
            !EXCLUDE_FROM_EXTRA.has(normalizedKey.toUpperCase()) &&
            val &&
            String(val).trim()
          )
        })

        const sectorStr = String(company.sector || '').trim()

        return (
          <div
            key={company.id}
            className="group relative flex flex-col gap-3.5 p-4 md:p-5 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
          >
            {/* Header: Icon + Nom + Actions */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3.5 flex-1 min-w-[220px]">
                {/* Icône Bâtiment / Entreprise style Mockup Landing */}
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h5m-5 0V11m0-4h.01M11 11h.01M11 15h.01M15 11h.01M15 15h.01" />
                  </svg>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {company.raisonSociale || '—'}
                    </strong>
                    {company.verified !== false && (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px]" title="Entreprise Vérifiée">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    {company.sigle && <Badge variant="default">{String(company.sigle)}</Badge>}
                    {company.formeJuridique && (
                      <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium">
                        {String(company.formeJuridique)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions : côte à côte en haut à droite */}
              <div className="flex gap-2 shrink-0">
                <SaveCompanyButton company={company} />
                <AddToPipelineButton company={company} />
              </div>
            </div>

            {/* Secteur */}
            {sectorStr && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  background: 'var(--color-blue-50)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--color-primary)',
                  lineHeight: 1.4,
                  marginTop: '4px',
                  marginBottom: '4px'
                }}
              >
                {sectorStr}
              </div>
            )}

            {/* Infos de contact & Localisation */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px 16px',
                fontSize: 13
              }}
            >
              {company.telephone && (
                <a
                  href={`tel:${company.telephone}`}
                  style={{
                    color: colors.green,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 500
                  }}
                >
                  <span style={{ fontSize: 14 }}>📞</span> {String(company.telephone)}
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  style={{
                    color: colors.green,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <span style={{ fontSize: 14 }}>✉️</span> {String(company.email)}
                </a>
              )}
              {(company.region || company.city) && (
                <div
                  style={{ color: colors.textMid, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 14 }}>📍</span> {String(company.region)}
                  {company.city ? ` · ${String(company.city)}` : ''}
                </div>
              )}
              {company.dirigeant && (
                <div
                  style={{ color: colors.textMid, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 14 }}>👤</span> {String(company.dirigeant)}
                </div>
              )}
              {company.adresse && (
                <div
                  style={{
                    color: colors.textDim,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    gridColumn: '1 / -1'
                  }}
                >
                  <span style={{ fontSize: 14 }}>🏢</span> {String(company.adresse)}
                </div>
              )}
            </div>

            {/* Badges Techniques (NIU, RCCM, Capital) */}
            {(company.niu || company.rccm || company.capital) && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingTop: 4,
                  borderTop: `1px dashed ${colors.border}`,
                  marginTop: 4
                }}
              >
                {company.niu && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    <span style={{ fontWeight: 600 }}>{t('field.niu')}:</span> {String(company.niu)}
                  </span>
                )}
                {company.rccm && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    <span style={{ fontWeight: 600 }}>{t('field.rccm')}:</span>{' '}
                    {String(company.rccm)}
                  </span>
                )}
                {company.capital && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    <span style={{ fontWeight: 600 }}>{t('field.capital')}:</span>{' '}
                    {String(company.capital)}
                  </span>
                )}
              </div>
            )}

            {/* Champs supplémentaires du CSV (dynamiques et filtrés) */}
            {extraFields.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px 16px',
                  fontSize: 11,
                  color: colors.textDim,
                  background: colors.bg2,
                  padding: '8px 12px',
                  borderRadius: 8
                }}
              >
                {extraFields.map(([key, val]) => (
                  <span key={key}>
                    <span style={{ fontWeight: 600, color: colors.textMid }}>
                      {formatFieldLabel(key, t)}:
                    </span>{' '}
                    {String(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
