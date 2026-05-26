import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { colors, shadows } from '@/styles/tokens'
import { SavedCompany } from '../hooks/useSavedCompanies'
import { Building2, MapPin, Trash2, Briefcase, Hash, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  items: SavedCompany[]
  onDelete: (id: string) => void
}

export function SavedCompaniesList({ items, onDelete }: Props) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              gap: 20,
              padding: '20px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 200ms ease',
              flexWrap: 'wrap'
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
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(99,102,241,0.1)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Building2 size={24} />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: colors.text,
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {item.companyName}
                <Badge variant="default" style={{ fontSize: 10, padding: '1px 6px', opacity: 0.6 }}>
                  <Hash size={10} style={{ marginRight: 2 }} /> {item.companyId.slice(-6)}
                </Badge>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                {city && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: colors.textMid,
                      fontSize: 13
                    }}
                  >
                    <MapPin size={14} style={{ color: colors.info }} />
                    {city}
                  </div>
                )}
                {sector && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: colors.textMid,
                      fontSize: 13
                    }}
                  >
                    <Briefcase size={14} style={{ color: colors.gold }} />
                    {sector}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/search?query=${encodeURIComponent(item.companyName)}`)}
                style={{ borderRadius: 10 }}
              >
                <ExternalLink size={14} style={{ marginRight: 6 }} />
                Voir
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
