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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sector && <Badge variant="default">{sector}</Badge>}
                {city && <Badge variant="info">📍 {city}</Badge>}
                <Badge variant="default">
                  ID: {item.companyId}
                </Badge>
              </div>
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
