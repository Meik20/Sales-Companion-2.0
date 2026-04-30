'use client'

import { useState } from 'react'
import { useAdminImports, AdminImport } from '../hooks/useAdminImports'
import { SectionCard } from '@/features/team/components/SectionCard'
import { colors } from '@/styles/tokens'

export function AdminImportsTable() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAdminImports(page)

  if (isLoading) {
    return (
      <SectionCard title="Historique des imports" subtitle="Suivi des imports de données">
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          Chargement...
        </div>
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
                fontSize: 13,
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
                      letterSpacing: '.04em',
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
                      letterSpacing: '.04em',
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
                      letterSpacing: '.04em',
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
                      letterSpacing: '.04em',
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
                      letterSpacing: '.04em',
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
                borderTop: `1px solid ${colors.border}`,
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
                  opacity: page === 1 ? 0.5 : 1,
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
                    fontWeight: p === page ? 600 : 400,
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
                  opacity: page === totalPages ? 0.5 : 1,
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
    minute: '2-digit',
  })

  const statusColors: Record<string, string> = {
    pending: colors.textMid,
    processing: '#fbbf24',
    completed: '#2ea05a',
    failed: '#f87171',
  }

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    processing: 'En cours',
    completed: 'Terminé',
    failed: 'Échoué',
  }

  const successRate =
    importItem.totalRecords > 0
      ? Math.round((importItem.successCount / importItem.totalRecords) * 100)
      : 0

  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.border}`,
        transition: 'background-color 300ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg2
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <td style={{ padding: '12px 0', color: colors.text, fontWeight: 500 }}>
        {importItem.fileName}
      </td>
      <td style={{ padding: '12px 16px 12px 0', color: colors.textMid, textAlign: 'right' }}>
        {importItem.totalRecords}
      </td>
      <td style={{ padding: '12px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ color: '#2ea05a' }}>✓ {importItem.successCount}</span>
          {importItem.errorCount > 0 && <span style={{ color: '#f87171' }}>✗ {importItem.errorCount}</span>}
        </div>
        <div style={{ fontSize: 10, color: colors.textMid, marginTop: 2 }}>
          {successRate}% réussi
        </div>
      </td>
      <td style={{ padding: '12px 16px 12px 0', textAlign: 'center' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusColors[importItem.status] || colors.textMid,
          }}
        >
          {statusLabels[importItem.status] || importItem.status}
        </span>
      </td>
      <td style={{ padding: '12px 0', color: colors.textMid, textAlign: 'right', fontSize: 12 }}>
        {dateStr}
      </td>
    </tr>
  )
}
