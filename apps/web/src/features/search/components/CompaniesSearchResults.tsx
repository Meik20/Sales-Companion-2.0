import { Badge } from '@/components/ui/index'
import { AddToPipelineButton } from './AddToPipelineButton'
import { colors } from '@/styles/tokens'

type Company = {
  id: string
  raisonSociale?: string
  sigle?: string
  sector?: string
  region?: string
  city?: string
  telephone?: string
  email?: string
  website?: string
  dirigeant?: string
  niu?: string
}

type Props = { items: Company[] }

export function CompaniesSearchResults({ items }: Props) {
  if (!items.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((company) => (
        <div
          key={company.id}
          style={{
            padding: '16px 20px',
            background: colors.bg3,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            transition: 'border-color 200ms ease',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(46,160,90,0.3)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLDivElement).style.borderColor = colors.border)
          }
        >
          {/* Infos */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 15, color: colors.text, fontWeight: 700 }}>
                {company.raisonSociale ?? '-'}
              </strong>
              {company.sigle ? (
                <Badge variant="default">{company.sigle}</Badge>
              ) : null}
              {company.sector ? (
                <Badge variant="success">{company.sector}</Badge>
              ) : null}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: colors.textMid }}>
              {company.region ? <span>📍 {company.region}{company.city ? ` · ${company.city}` : ''}</span> : null}
              {company.telephone ? <span>📞 {company.telephone}</span> : null}
              {company.email ? <span>✉️ {company.email}</span> : null}
              {company.dirigeant ? <span>👤 {company.dirigeant}</span> : null}
              {company.niu ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>NIU {company.niu}</span> : null}
            </div>
          </div>

          {/* Action */}
          <div style={{ flexShrink: 0 }}>
            <AddToPipelineButton company={company} />
          </div>
        </div>
      ))}
    </div>
  )
}
