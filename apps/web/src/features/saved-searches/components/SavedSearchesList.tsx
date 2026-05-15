import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { colors, shadows } from '@/styles/tokens'
import { Search, History, Trash2, Filter, RotateCcw, Bookmark } from 'lucide-react'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item) => {
        const filters = item.filters || {}
        const tags = Object.entries(filters)
          .filter(([, v]) => v && typeof v === 'string' && v.trim().length > 0)
          .map(([k, v]) => ({ key: k, value: v as string }))

        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '18px 20px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 200ms ease',
              flexWrap: 'wrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ 
              width: 44, height: 44, borderRadius: 12, 
              background: 'rgba(245,158,11,0.1)', color: colors.gold,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bookmark size={22} fill="currentColor" fillOpacity={0.2} />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: colors.text, marginBottom: 8 }}>
                {item.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map((tag) => (
                  <div 
                    key={tag.key} 
                    style={{ 
                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, 
                      background: colors.bg2, border: `1px solid ${colors.border}`, 
                      color: colors.textMid, textTransform: 'uppercase', letterSpacing: '0.02em',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span style={{ opacity: 0.5, fontWeight: 400 }}>{tag.key}:</span> {tag.value}
                  </div>
                ))}
                {item.resultCount !== undefined && (
                  <Badge variant="success" style={{ fontSize: 10, padding: '2px 8px' }}>
                    {item.resultCount} résultats
                  </Badge>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button 
                size="sm" 
                variant="primary" 
                onClick={() => onRestore(item.filters)}
                style={{ borderRadius: 10, fontWeight: 700 }}
              >
                <RotateCcw size={14} style={{ marginRight: 6 }} />
                Relancer
              </Button>
              <Button 
                size="sm" 
                variant="danger" 
                onClick={() => onDelete(item.id)}
                style={{ borderRadius: 10, padding: '8px 12px' }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
