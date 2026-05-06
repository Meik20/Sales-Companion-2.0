'use client'

import { useState } from 'react'
import { useAdminCompanies, AdminCompany } from '../hooks/useAdminCompanies'
import { useDeleteAdminCompanies } from '../hooks/useDeleteAdminCompanies'
import { useDeleteAllAdminCompanies } from '../hooks/useDeleteAllAdminCompanies'
import { SectionCard } from '@/features/team/components/SectionCard'
import { useToast } from '@/hooks/useToast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'

export function AdminCompaniesTable() {
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const { data, isLoading, isError } = useAdminCompanies(page)
  const { user } = useCurrentUser()
  const deleteMutation = useDeleteAdminCompanies()
  const deleteAllMutation = useDeleteAllAdminCompanies()
  const { pushToast } = useToast()

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
  const allSelected = items.length > 0 && selectedIds.length === items.length

  const handleToggleAll = () => {
    setSelectedIds((current) => (allSelected ? [] : items.map((item) => item.id)))
  }

  const handleToggleOne = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    )
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Supprimer ${selectedIds.length} entreprise${selectedIds.length > 1 ? 's' : ''} sélectionnée${selectedIds.length > 1 ? 's' : ''} ?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(selectedIds)
      setSelectedIds([])
      pushToast({ type: 'success', title: 'Entreprises supprimées' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Supprimer toutes les entreprises importées ?')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteAllMutation.mutateAsync()
      setSelectedIds([])
      pushToast({ type: 'success', title: 'Liste des entreprises vidée' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/admin/companies/export', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) throw new Error("Erreur lors de l'export")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export_entreprises_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      pushToast({ type: 'success', title: 'Export réussi', description: 'Le fichier CSV a été téléchargé.' })
    } catch (error) {
      pushToast({
        type: 'error',
        title: 'Export impossible',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  return (
    <SectionCard title="Entreprises" subtitle={`${total} entreprise${total > 1 ? 's' : ''} importée${total > 1 ? 's' : ''}`}>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20, fontSize: 13 }}>
          Aucune entreprise n'a été importée.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ color: colors.textMid, fontSize: 13 }}>
              {selectedIds.length > 0
                ? `${selectedIds.length} entreprise${selectedIds.length > 1 ? 's' : ''} sélectionnée${selectedIds.length > 1 ? 's' : ''}`
                : 'Sélectionnez des entreprises à supprimer.'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={items.length === 0 || isDeleting}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  cursor: items.length === 0 || isDeleting ? 'not-allowed' : 'pointer',
                  opacity: items.length === 0 || isDeleting ? 0.5 : 1,
                }}
              >
                Vider la liste
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={items.length === 0}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${colors.green}`,
                  background: 'rgba(46,160,90,0.1)',
                  color: colors.green,
                  cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: items.length === 0 ? 0.5 : 1,
                  fontWeight: 600,
                }}
              >
                📥 Exporter CSV
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 || isDeleting}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${selectedIds.length === 0 ? colors.border : colors.dangerBorder}`,
                  background: selectedIds.length === 0 ? colors.bg : colors.dangerBg,
                  color: selectedIds.length === 0 ? colors.textMid : colors.danger,
                  cursor: selectedIds.length === 0 || isDeleting ? 'not-allowed' : 'pointer',
                  opacity: selectedIds.length === 0 || isDeleting ? 0.5 : 1,
                }}
              >
                Supprimer la sélection
              </button>
            </div>
          </div>

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
                  <th style={{ padding: '10px 12px' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      aria-label="Sélectionner toutes les entreprises"
                    />
                  </th>
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
                  <CompanyRow
                    key={company.id}
                    company={company}
                    isSelected={selectedIds.includes(company.id)}
                    onToggle={() => handleToggleOne(company.id)}
                  />
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
                onClick={() => {
                  setSelectedIds([])
                  setPage(Math.max(1, page - 1))
                }}
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
                  onClick={() => {
                    setSelectedIds([])
                    setPage(p)
                  }}
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
                onClick={() => {
                  setSelectedIds([])
                  setPage(Math.min(totalPages, page + 1))
                }}
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

function CompanyRow({
  company,
  isSelected,
  onToggle,
}: {
  company: AdminCompany
  isSelected: boolean
  onToggle: () => void
}) {
  const importDate = company.importedAt ? new Date(company.importedAt) : null
  const dateStr = importDate && !isNaN(importDate.getTime())
    ? importDate.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: '2-digit' })
    : '—'

  // raisonSociale is the canonical field name from the CSV import
  const displayName = company.raisonSociale || company.name || '—'
  const displaySigle = company.sigle || ''
  const displayNiu = company.niu || '—'
  const displaySector = company.sector || company.activite_principale || '—'
  const displayCity = company.city || company.ville || '—'
  const displayRegion = company.region || company.centre_de_rattachement || ''

  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.border}`,
        transition: 'background-color 200ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg2 }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Sélectionner ${displayName}`}
        />
      </td>
      {/* Raison Sociale */}
      <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.text, maxWidth: 260 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </div>
        {displaySigle && (
          <div style={{ fontSize: 10.5, color: colors.textDim, marginTop: 2, fontStyle: 'italic' }}>
            {displaySigle}
          </div>
        )}
      </td>
      {/* NIU */}
      <td style={{ padding: '10px 12px', color: colors.textMid, fontSize: 12, fontFamily: 'monospace' }}>
        {displayNiu}
      </td>
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
