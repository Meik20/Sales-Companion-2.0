'use client'

import { useState } from 'react'
import { useAdminCompanies, AdminCompany } from '../hooks/useAdminCompanies'
import { SectionCard } from '@/features/team/components/SectionCard'
import { colors } from '@/styles/tokens'

export function AdminCompaniesTable() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAdminCompanies(page)

  if (isLoading) {
    return (
      <SectionCard title="Entreprises" subtitle="Gestion des entreprises importées">
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          Chargement...
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title="Entreprises" subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          Impossible de charger les entreprises
        </div>
      </SectionCard>
    )
  }

  const items = data?.items || []
  const total = data?.total || 0
  const pageSize = data?.pageSize || 20
  const totalPages = Math.ceil(total / pageSize)

  return (
    <SectionCard title="Entreprises" subtitle={`${total} entreprise${total > 1 ? 's' : ''} importée${total > 1 ? 's' : ''}`}>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20, fontSize: 13 }}>
          Aucune entreprise n'a été importée.
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
                    Nom
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px 12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                    }}
                  >
                    Secteur
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px 12px 0',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                    }}
                  >
                    Ville
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
                {items.map((company) => (
                  <CompanyRow key={company.id} company={company} />
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
                  background: colors.bg1,
                  color: colors.text,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    border: `1px solid ${p === page ? '#2ea05a' : colors.border}`,
                    borderRadius: 6,
                    background: p === page ? 'rgba(46,160,90,0.1)' : colors.bg1,
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
                  background: colors.bg1,
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

function CompanyRow({ company }: { company: AdminCompany }) {
  const importDate = new Date(company.importedAt)
  const dateStr = importDate.toLocaleDateString('fr-FR', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })

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
        {company.name}
      </td>
      <td style={{ padding: '12px 16px 12px 0', color: colors.textMid, fontSize: 12 }}>
        {company.sector || '—'}
      </td>
      <td style={{ padding: '12px 16px 12px 0', color: colors.textMid, fontSize: 12 }}>
        {company.city || '—'}
      </td>
      <td style={{ padding: '12px 0', textAlign: 'center' }}>
        {company.verified ? (
          <span style={{ fontSize: 11, color: '#2ea05a', fontWeight: 600 }}>✓ Vérifié</span>
        ) : (
          <span style={{ fontSize: 11, color: colors.textMid }}>Non vérifié</span>
        )}
      </td>
      <td style={{ padding: '12px 0', color: colors.textMid, textAlign: 'right', fontSize: 12 }}>
        {dateStr}
      </td>
    </tr>
  )
}
