import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { colors } from '@/styles/tokens'

type SavedSearch = {
  id: string
  label: string
  filters: Record<string, unknown>
  resultCount?: number
  createdAt?: unknown
}

type Props = {
  items: SavedSearch[]
  onRestore: (filters: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

export function SavedSearchesList({ items, onRestore, onDelete }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const tags = Object.entries(item.filters)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)

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
                {item.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map((tag) => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
                {item.resultCount !== undefined ? (
                  <Badge variant="info">{item.resultCount} résultats</Badge>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button size="sm" variant="primary" onClick={() => onRestore(item.filters)}>
                🔍 Relancer
              </Button>
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
