import { Badge } from '@/components/ui/index'
import { AddToPipelineButton } from './AddToPipelineButton'
import { SaveCompanyButton } from './SaveCompanyButton'
import { Company } from '@/features/search/hooks/useCompaniesSearch'
import { useTranslation } from '@/providers/I18nProvider'
import { getWhatsAppUrl } from '@/utils/whatsapp'

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
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px]" title="Entreprise Vérifiée">
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${company.telephone}`}
                    style={{
                      color: '#3b82f6',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 500
                    }}
                  >
                    <span style={{ fontSize: 14 }}>📞</span> {String(company.telephone)}
                  </a>
                  <a
                    href={getWhatsAppUrl(
                      String(company.telephone),
                      `Bonjour, je vous contacte au sujet de votre entreprise ${String(company.raisonSociale || '')}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: '#25D366',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </a>
                </div>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  style={{
                    color: '#3b82f6',
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
                  style={{ color: 'var(--muted-foreground, #94a3b8)', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 14 }}>📍</span> {String(company.region)}
                  {company.city ? ` · ${String(company.city)}` : ''}
                </div>
              )}
              {company.dirigeant && (
                <div
                  style={{ color: 'var(--muted-foreground, #94a3b8)', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 14 }}>👤</span> {String(company.dirigeant)}
                </div>
              )}
              {company.adresse && (
                <div
                  style={{
                    color: 'var(--muted-foreground, #64748b)',
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
                  borderTop: `1px dashed ${'var(--border, rgba(255,255,255,0.1))'}`,
                  marginTop: 4
                }}
              >
                {company.niu && (
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                    <span style={{ fontWeight: 600 }}>{t('field.niu')}:</span> {String(company.niu)}
                  </span>
                )}
                {company.rccm && (
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                    <span style={{ fontWeight: 600 }}>{t('field.rccm')}:</span>{' '}
                    {String(company.rccm)}
                  </span>
                )}
                {company.capital && (
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
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
                  color: 'var(--muted-foreground, #64748b)',
                  background: 'var(--card, #131c2e)',
                  padding: '8px 12px',
                  borderRadius: 8
                }}
              >
                {extraFields.map(([key, val]) => (
                  <span key={key}>
                    <span style={{ fontWeight: 600, color: 'var(--muted-foreground, #94a3b8)' }}>
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
