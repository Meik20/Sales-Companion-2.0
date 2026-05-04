'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useToast } from '@/hooks/useToast'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  userId: string
  companyCity?: string
  companySector?: string
  note?: string
  assignedTo?: string | null
}

type Props = { items: PipelineItem[] }

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  negociation: 'warning',
  conclue:     'success',
}

const statusLabel: Record<string, string> = {
  prospection: 'Prospection',
  negociation: 'Négociation',
  conclue:     'Conclue',
}

export function ManagerPipelineList({ items }: Props) {
  const deleteMutation = useDeletePipelineItem()
  const { pushToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!items.length) return null

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      pushToast({ type: 'success', title: 'Prospect supprimé du pipeline' })
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Grouper par statut
  const grouped: Record<string, PipelineItem[]> = {
    prospection: items.filter((i) => i.status === 'prospection' || i.status === 'prospect'),
    negociation: items.filter((i) => i.status === 'negociation' || i.status === 'negotiation'),
    conclue:     items.filter((i) => i.status === 'conclue' || i.status === 'conclusion'),
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {Object.entries(grouped).map(([status, groupItems]) => (
        <div key={status}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Badge variant={statusVariant[status] ?? 'default'}>
              {statusLabel[status]} ({groupItems.length})
            </Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  background: colors.bg3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: colors.text, marginBottom: 4 }}>
                      {item.companyName}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMid }}>
                      {item.companySector ? `🏭 ${item.companySector}` : null}
                      {item.companyCity   ? ` · 📍 ${item.companyCity}` : null}
                    </div>
                    {item.note ? (
                      <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4 }}>
                        📝 {item.note}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deletingId === item.id}
                    onClick={() => void handleDelete(item.id)}
                    style={{ flexShrink: 0, padding: '0 8px', minHeight: 28 }}
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
            {groupItems.length === 0 ? (
              <div
                style={{
                  padding: '20px 14px',
                  background: colors.bg3,
                  border: `1px dashed ${colors.border}`,
                  borderRadius: 10,
                  textAlign: 'center',
                  fontSize: 12,
                  color: colors.textDim,
                }}
              >
                Aucun prospect
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
