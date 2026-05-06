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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((company) => {
        // Extraire les champs supplémentaires du CSV qui ne sont pas déjà affichés
        const extraFields = Object.entries(company).filter(
          ([key, val]) => !EXCLUDE_FROM_EXTRA.has(key) && val && String(val).trim()
        )

        return (
          <div
            key={company.id}
            style={{
              padding: '14px 18px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              flexWrap: 'wrap',
              transition: 'box-shadow 200ms ease, border-color 200ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(46,160,90,0.35)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(27,122,62,0.08)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = colors.border
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          >
            {/* Infos principales */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Nom + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, color: colors.text, fontWeight: 700, wordBreak: 'break-word' }}>
                  {company.raisonSociale || '—'}
                </strong>
                {company.sigle && <Badge variant="default">{String(company.sigle)}</Badge>}
                {company.sector && <Badge variant="success">{String(company.sector)}</Badge>}
                {company.formeJuridique && (
                  <span style={{ fontSize: 10.5, color: colors.textDim, background: colors.bg3, padding: '1px 6px', borderRadius: 4 }}>
                    {String(company.formeJuridique)}
                  </span>
                )}
              </div>

              {/* Infos de contact — téléphone et email toujours affichés */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', fontSize: 12, color: colors.textMid, marginBottom: extraFields.length ? 8 : 0 }}>
                {company.region && (
                  <span>📍 {String(company.region)}{company.city ? ` · ${String(company.city)}` : ''}</span>
                )}
                {/* Téléphone : toujours affiché, "—" si absent */}
                {company.telephone ? (
                  <a href={`tel:${company.telephone}`} style={{ color: colors.green, textDecoration: 'none' }}>
                    📞 {String(company.telephone)}
                  </a>
                ) : (
                  <span style={{ color: colors.textDim }}>📞 —</span>
                )}
                {/* Email : toujours affiché, "—" si absent */}
                {company.email ? (
                  <a href={`mailto:${company.email}`} style={{ color: colors.green, textDecoration: 'none' }}>
                    ✉️ {String(company.email)}
                  </a>
                ) : (
                  <span style={{ color: colors.textDim }}>✉️ —</span>
                )}
                {company.dirigeant && <span>👤 {String(company.dirigeant)}</span>}
                {company.niu && (
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: colors.textDim }}>{t('field.niu')} {String(company.niu)}</span>
                )}
                {company.rccm && (
                  <span style={{ fontSize: 11, color: colors.textDim }}>{t('field.rccm')} {String(company.rccm)}</span>
                )}
                {company.adresse && <span>🏢 {String(company.adresse)}</span>}
                {company.capital && <span>💰 {String(company.capital)}</span>}
              </div>

              {/* Champs supplémentaires du CSV (dynamiques) */}
              {extraFields.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontSize: 11, color: colors.textDim }}>
                  {extraFields.map(([key, val]) => (
                    <span key={key}>
                      <span style={{ fontWeight: 600 }}>{formatFieldLabel(key, t)}:</span>{' '}
                      {String(val)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions par carte : Enregistrer + Pipeline */}
            <div style={{ flexShrink: 0, paddingTop: 2, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <SaveCompanyButton company={company as any} />
              <AddToPipelineButton company={company as any} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
