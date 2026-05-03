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
                  {['Raison Sociale', 'NIU', 'Secteur', 'Ville / Région', 'Statut', 'Date'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        color: colors.textMid,
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
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
                  background: colors.bg,
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

function CompanyRow({ company }: { company: AdminCompany }) {
  const importDate = company.importedAt ? new Date(company.importedAt) : null
  const dateStr = importDate && !isNaN(importDate.getTime())
    ? importDate.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—'

  // raisonSociale is the canonical field name from the CSV import
  const displayName = (company as any).raisonSociale || company.name || '—'
  const displayNiu = (company as any).niu || '—'
  const displaySector = (company as any).sector || (company as any).activite_principale || company.sector || '—'
  const displayCity = (company as any).city || (company as any).ville || company.city || '—'
  const displayRegion = (company as any).region || (company as any).centre_de_rattachement || ''

  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.border}`,
        transition: 'background-color 200ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg2 }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {/* Raison Sociale */}
      <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.text, maxWidth: 260 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </div>
        {displayNiu !== '—' && (
          <div style={{ fontSize: 10.5, color: colors.textDim, marginTop: 2, fontFamily: 'monospace' }}>
            NIU: {displayNiu}
          </div>
        )}
      </td>
      {/* NIU col – hidden duplicate, now merged above */}
      {/* Secteur */}
      <td style={{ padding: '10px 12px', color: colors.textMid, fontSize: 12, maxWidth: 160 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displaySector}
        </div>
      </td>
      {/* Ville / Région */}
      <td style={{ padding: '10px 12px', color: colors.textMid, fontSize: 12 }}>
        <div>{displayCity}</div>
        {displayRegion && displayRegion !== displayCity && (
          <div style={{ fontSize: 10.5, color: colors.textDim }}>{displayRegion}</div>
        )}
      </td>
      {/* Statut */}
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        {company.verified ? (
          <span style={{ fontSize: 11, color: '#2ea05a', fontWeight: 700, background: 'rgba(46,160,90,0.1)', padding: '2px 8px', borderRadius: 4 }}>✓ Vérifié</span>
        ) : (
          <span style={{ fontSize: 11, color: colors.textMid }}>Non vérifié</span>
        )}
      </td>
      {/* Date */}
      <td style={{ padding: '10px 12px', color: colors.textMid, textAlign: 'right', fontSize: 12, whiteSpace: 'nowrap' }}>
        {dateStr}
      </td>
    </tr>
  )
}
