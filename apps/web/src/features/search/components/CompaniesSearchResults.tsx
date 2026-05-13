import { Badge } from '@/components/ui/index'
import { AddToPipelineButton } from './AddToPipelineButton'
import { SaveCompanyButton } from './SaveCompanyButton'
import { colors } from '@/styles/tokens'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { useTranslation } from '@/providers/I18nProvider'

type Props = { items: Company[] }

// Champs toujours affichés en premier (s'ils existent)
const PRIMARY_FIELDS = ['raisonSociale', 'sigle', 'sector', 'region', 'city', 'telephone', 'email', 'dirigeant', 'niu']

// Champs à exclure de l'affichage brut des extras (déjà affichés ou méta)
const EXCLUDE_FROM_EXTRA = new Set([
  'id', 'raisonSociale', 'name', 'sigle', 'sector', 'region', 'city',
  'telephone', 'email', 'dirigeant', 'niu', 'rccm', 'adresse', 'capital',
  'formeJuridique', 'importedBy', 'createdAt', 'updatedAt', 'verified',
  'activite_principale', 'centre_de_rattachement', 'ville',
  'raison_sociale', 'Secteur d activite', 'Responsable', 'dirigeant', 'Responsable/Propriétaire',
  'Telephone', 'Email', 'Site Web', 'Description', 'Localisation',
  'RAISON SOCIALE', 'SECTEUR D ACTIVITE', 'RESPONSABLE',
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
        const extraFields = Object.entries(company).filter(
          ([key, val]) => {
            const normalizedKey = key.trim()
            return !EXCLUDE_FROM_EXTRA.has(normalizedKey) && 
                   !EXCLUDE_FROM_EXTRA.has(normalizedKey.toUpperCase()) &&
                   val && String(val).trim()
          }
        )

        const sectorStr = String(company.sector || '').trim()
        const isLongSector = sectorStr.length > 50

        return (
          <div
            key={company.id}
            style={{
              padding: '16px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              transition: 'all 200ms ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(46,160,90,0.4)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = colors.border
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          >
            {/* Header: Nom + Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 16, color: colors.text, fontWeight: 700, display: 'block', marginBottom: 4, lineHeight: 1.2 }}>
                  {company.raisonSociale || '—'}
                </strong>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {company.sigle && <Badge variant="default">{String(company.sigle)}</Badge>}
                  {!isLongSector && company.sector && (
                    <Badge variant="success">
                      {sectorStr}
                    </Badge>
                  )}
                  {company.formeJuridique && (
                    <span style={{ fontSize: 10, color: colors.textDim, background: colors.bg3, padding: '1px 6px', borderRadius: 4 }}>
                      {String(company.formeJuridique)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions : côte à côte en haut à droite */}
              <div style={{ display: 'flex', gap: 6 }}>
                <SaveCompanyButton company={company} />
                <AddToPipelineButton company={company} />
              </div>
            </div>

            {/* Secteur long (si applicable) */}
            {isLongSector && (
              <div style={{ 
                fontSize: 12, 
                color: colors.green, 
                fontWeight: 500, 
                background: 'rgba(46,160,90,0.05)', 
                padding: '6px 10px', 
                borderRadius: 6,
                borderLeft: `3px solid ${colors.green}`,
                lineHeight: 1.4
              }}>
                {sectorStr}
              </div>
            )}

            {/* Infos de contact & Localisation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 16px', fontSize: 13 }}>
              {company.telephone && (
                <a href={`tel:${company.telephone}`} style={{ color: colors.green, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                  <span style={{ fontSize: 14 }}>📞</span> {String(company.telephone)}
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} style={{ color: colors.green, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontSize: 14 }}>✉️</span> {String(company.email)}
                </a>
              )}
              {(company.region || company.city) && (
                <div style={{ color: colors.textMid, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>📍</span> {String(company.region)}{company.city ? ` · ${String(company.city)}` : ''}
                </div>
              )}
              {company.dirigeant && (
                <div style={{ color: colors.textMid, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>👤</span> {String(company.dirigeant)}
                </div>
              )}
              {company.adresse && (
                <div style={{ color: colors.textDim, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 14 }}>🏢</span> {String(company.adresse)}
                </div>
              )}
            </div>

            {/* Badges Techniques (NIU, RCCM, Capital) */}
            {(company.niu || company.rccm || company.capital) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 4, borderTop: `1px dashed ${colors.border}`, marginTop: 4 }}>
                {company.niu && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    <span style={{ fontWeight: 600 }}>{t('field.niu')}:</span> {String(company.niu)}
                  </span>
                )}
                {company.rccm && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    <span style={{ fontWeight: 600 }}>{t('field.rccm')}:</span> {String(company.rccm)}
                  </span>
                )}
                {company.capital && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    <span style={{ fontWeight: 600 }}>{t('field.capital')}:</span> {String(company.capital)}
                  </span>
                )}
              </div>
            )}

            {/* Champs supplémentaires du CSV (dynamiques et filtrés) */}
            {extraFields.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '4px 16px', 
                fontSize: 11, 
                color: colors.textDim,
                background: colors.bg2,
                padding: '8px 12px',
                borderRadius: 8
              }}>
                {extraFields.map(([key, val]) => (
                  <span key={key}>
                    <span style={{ fontWeight: 600, color: colors.textMid }}>{formatFieldLabel(key, t)}:</span>{' '}
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
