import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { colors } from '@/styles/tokens'
import { SavedCompany } from '../hooks/useSavedCompanies'

type Props = {
  items: SavedCompany[]
  onDelete: (id: string) => void
}

export function SavedCompaniesList({ items, onDelete }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const metadata = item.metadata || {}
        const sector = metadata.sector as string
        const city = metadata.city as string

        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 18px',
              background: colors.bg3,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.text, marginBottom: 6 }}>
                {item.companyName}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {city && <Badge variant="info">📍 {city}</Badge>}
                <Badge variant="default">
                  ID: {item.companyId}
                </Badge>
              </div>
              {sector && (
                <div style={{ 
                  fontSize: 12, 
                  color: 'var(--color-primary)', 
                  fontWeight: 600, 
                  background: 'var(--color-blue-50)', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--color-primary)',
                  lineHeight: 1.4,
                  marginTop: '4px',
                  display: 'inline-block'
                }}>
                  {sector}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button size="sm" variant="danger" onClick={() => onDelete(item.id)}>
                Supprimer
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
