'use client'

import { useState } from 'react'
import { useAdminImports, AdminImport } from '../hooks/useAdminImports'
import { SectionCard } from '@/features/team/components/SectionCard'
import { colors, shadows } from '@/styles/tokens'
import { Badge } from '@/components/ui/index'
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Calendar,
  BarChart
} from 'lucide-react'

export function AdminImportsTable() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAdminImports(page)

  if (isLoading) {
    return (
      <SectionCard title="Historique des imports" subtitle="Suivi des imports de données">
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>Chargement...</div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title="Historique des imports" subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          Impossible de charger les imports
        </div>
      </SectionCard>
    )
  }

  const items = data?.items || []
  const total = data?.total || 0
  const pageSize = data?.pageSize || 20
  const totalPages = Math.ceil(total / pageSize)

  return (
    <SectionCard title="Historique des imports" subtitle={`${total} import${total > 1 ? 's' : ''}`}>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20, fontSize: 13 }}>
          Aucun import n'a été effectué.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em'
                    }}
                  >
                    Fichier
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 16px 12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em'
                    }}
                  >
                    Enregistrements
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em'
                    }}
                  >
                    Résultats
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '12px 16px 12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em'
                    }}
                  >
                    Statut
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em'
                    }}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((importItem) => (
                  <ImportRow key={importItem.id} import={importItem} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${colors.border}`
              }}
            >
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  background: colors.bg,
                  color: colors.text,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1
                }}
              >
                Précédent
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    border: `1px solid ${p === page ? '#2ea05a' : colors.border}`,
                    borderRadius: 6,
                    background: p === page ? 'rgba(46,160,90,0.1)' : colors.bg,
                    color: colors.text,
                    cursor: 'pointer',
                    fontWeight: p === page ? 600 : 400
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  background: colors.bg,
                  color: colors.text,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1
                }}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

function ImportRow({ import: importItem }: { import: AdminImport }) {
  const importDate = new Date(importItem.importedAt)
  const dateStr = importDate.toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const statusConfigs: Record<string, { color: string; icon: any; label: string; variant: any }> = {
    pending: { color: colors.textMid, icon: Clock, label: 'En attente', variant: 'default' },
    processing: { color: '#fbbf24', icon: AlertCircle, label: 'En cours', variant: 'gold' },
    completed: { color: '#2ea05a', icon: CheckCircle2, label: 'Terminé', variant: 'success' },
    failed: { color: '#f87171', icon: XCircle, label: 'Échoué', variant: 'danger' }
  }

  const successRate =
    importItem.totalRecords > 0
      ? Math.round((importItem.successCount / importItem.totalRecords) * 100)
      : 0

  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.border}`,
        transition: 'all 200ms ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg2
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <td style={{ padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(55,138,221,0.1)',
              color: colors.info,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FileText size={16} />
          </div>
          <span style={{ color: colors.text, fontWeight: 700, fontSize: 13 }}>
            {importItem.fileName}
          </span>
        </div>
      </td>
      <td
        style={{
          padding: '16px 16px 16px 0',
          color: colors.textMid,
          textAlign: 'right',
          fontWeight: 600
        }}
      >
        {importItem.totalRecords}
      </td>
      <td style={{ padding: '16px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              fontSize: 11,
              fontWeight: 700
            }}
          >
            <span style={{ color: '#2ea05a', display: 'flex', alignItems: 'center', gap: 4 }}>
              {importItem.successCount}
            </span>
            {importItem.errorCount > 0 && (
              <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                {importItem.errorCount}
              </span>
            )}
          </div>
          <div
            style={{
              width: 80,
              height: 4,
              background: colors.bg3,
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${colors.border}`
            }}
          >
            <div
              style={{
                width: `${successRate}%`,
                height: '100%',
                background: successRate > 90 ? '#2ea05a' : successRate > 50 ? '#fbbf24' : '#f87171'
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: colors.textMid, fontWeight: 600 }}>
            {successRate}% réussi
          </span>
        </div>
      </td>
      <td style={{ padding: '16px 16px 16px 0', textAlign: 'center' }}>
        {(() => {
          const config = (statusConfigs[importItem.status] || statusConfigs.pending) as {
            color: string
            icon: any
            label: string
            variant: any
          }
          const Icon = config.icon
          return (
            <Badge
              variant={config.variant}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 10px',
                fontSize: 10,
                textTransform: 'uppercase'
              }}
            >
              <Icon size={10} />
              {config.label}
            </Badge>
          )
        })()}
      </td>
      <td style={{ padding: '16px 0', color: colors.textMid, textAlign: 'right', fontSize: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontWeight: 600 }}>
            {dateStr.split(' ')[0]} {dateStr.split(' ')[1]}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>
            {dateStr.split(' ').slice(2).join(' ')}
          </span>
        </div>
      </td>
    </tr>
  )
}
