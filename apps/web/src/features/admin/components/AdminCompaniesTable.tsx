'use client'

import { useState } from 'react'
import { useAdminCompanies, AdminCompany } from '../hooks/useAdminCompanies'
import { useDeleteAdminCompanies } from '../hooks/useDeleteAdminCompanies'
import { useDeleteAllAdminCompanies } from '../hooks/useDeleteAllAdminCompanies'
import { SectionCard } from '@/features/team/components/SectionCard'
import { useToast } from '@/hooks/useToast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors, shadows } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { 
  Building2, Hash, MapPin, CheckCircle2, 
  Calendar, Trash2, Download, Eraser, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Filter, Activity
} from 'lucide-react'

export function AdminCompaniesTable() {
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const { data, isLoading, isError } = useAdminCompanies(page)
  const { user } = useCurrentUser()
  const deleteMutation = useDeleteAdminCompanies()
  const deleteAllMutation = useDeleteAllAdminCompanies()
  const { pushToast } = useToast()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <SectionCard title={t('admin.companies')} subtitle={t('admin.companiesSubtitle')}>
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
          {t('team.loading')}
        </div>
      </SectionCard>
    )
  }

  if (isError) {
    return (
      <SectionCard title={t('admin.companies')} subtitle="Erreur">
        <div style={{ textAlign: 'center', color: '#f87171', padding: 20 }}>
          {t('support.errorLoad')}
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
    if (!window.confirm(`Supprimer ${selectedIds.length} entreprise(s) ?`)) {
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

  // Smart pagination logic to avoid rendering 100+ buttons
  const getVisiblePages = () => {
    const delta = 2; // how many pages to show around the current page
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <SectionCard title={t('admin.companies')} subtitle={`${total} ${t('admin.inDatabase')}`}>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMid, padding: 20, fontSize: 13 }}>
          {t('admin.noCompanyMatch')}
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={items.length === 0 || isDeleting}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  cursor: items.length === 0 || isDeleting ? 'not-allowed' : 'pointer',
                  opacity: items.length === 0 || isDeleting ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                  transition: 'all 200ms ease',
                }}
              >
                <Eraser size={16} />
                Vider la liste
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={items.length === 0}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  borderRadius: 10,
                  border: `1px solid ${colors.green}`,
                  background: 'rgba(46,160,90,0.1)',
                  color: colors.green,
                  cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: items.length === 0 ? 0.5 : 1,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 200ms ease',
                }}
              >
                <Download size={16} />
                📥 Exporter CSV
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 || isDeleting}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  borderRadius: 10,
                  border: `1px solid ${selectedIds.length === 0 ? colors.border : colors.dangerBorder}`,
                  background: selectedIds.length === 0 ? colors.bg : colors.dangerBg,
                  color: selectedIds.length === 0 ? colors.textMid : colors.danger,
                  cursor: selectedIds.length === 0 || isDeleting ? 'not-allowed' : 'pointer',
                  opacity: selectedIds.length === 0 || isDeleting ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                  transition: 'all 200ms ease',
                }}
              >
                <Trash2 size={16} />
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
                  <th style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      aria-label={t('team.selectAll')}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  {[
                    { label: t('field.raisonSociale') || 'Raison Sociale', icon: <Building2 size={12} /> },
                    { label: t('field.niu') || 'NIU', icon: <Hash size={12} /> },
                    { label: t('field.sector') || 'Secteur', icon: <Filter size={12} /> },
                    { label: `${t('field.city') || 'Ville'} / ${t('field.region') || 'Région'}`, icon: <MapPin size={12} /> },
                    { label: t('admin.status'), icon: <Activity size={12} /> },
                    { label: t('admin.date'), icon: <Calendar size={12} /> }
                  ].map((h) => (
                    <th
                      key={h.label}
                      style={{
                        textAlign: 'left',
                        padding: '12px',
                        color: colors.textMid,
                        fontWeight: 700,
                        fontSize: 10.5,
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {h.icon}
                        {h.label}
                      </div>
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
                alignItems: 'center',
                gap: 6,
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px solid ${colors.border}`,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => { setSelectedIds([]); setPage(1) }}
                disabled={page === 1}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1px solid ${colors.border}`, background: colors.bg,
                  color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1,
                  transition: 'all 200ms ease'
                }}
                title="Première page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => { setSelectedIds([]); setPage(Math.max(1, page - 1)) }}
                disabled={page === 1}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1px solid ${colors.border}`, background: colors.bg,
                  color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1,
                  transition: 'all 200ms ease'
                }}
                title="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              
              {getVisiblePages().map((p, index) => {
                if (p === '...') {
                  return <span key={`ellipsis-${index}`} style={{ color: colors.textDim, padding: '0 8px', fontWeight: 700 }}>...</span>
                }
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => { setSelectedIds([]); setPage(p as number) }}
                    style={{
                      minWidth: 36, height: 36, borderRadius: 10, padding: '0 8px',
                      border: `1px solid ${p === page ? colors.green : colors.border}`,
                      background: p === page ? 'rgba(46,160,90,0.1)' : colors.bg,
                      color: p === page ? colors.green : colors.text,
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      transition: 'all 200ms ease'
                    }}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => { setSelectedIds([]); setPage(Math.min(totalPages, page + 1)) }}
                disabled={page === totalPages}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1px solid ${colors.border}`, background: colors.bg,
                  color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1,
                  transition: 'all 200ms ease'
                }}
                title="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => { setSelectedIds([]); setPage(totalPages) }}
                disabled={page === totalPages}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1px solid ${colors.border}`, background: colors.bg,
                  color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1,
                  transition: 'all 200ms ease'
                }}
                title="Dernière page"
              >
                <ChevronsRight size={16} />
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
  const { t } = useTranslation()
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
        transition: 'all 200ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg2 }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Sélectionner ${displayName}`}
          style={{ cursor: 'pointer' }}
        />
      </td>
      {/* Raison Sociale */}
      <td style={{ padding: '14px 12px', maxWidth: 280 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 700, color: colors.text, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </span>
          {displaySigle && (
            <span style={{ fontSize: 10, color: colors.textDim, fontStyle: 'italic', opacity: 0.8 }}>
              {displaySigle}
            </span>
          )}
        </div>
      </td>
      {/* NIU */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 6, background: colors.bg3, border: `1px solid ${colors.border}` }}>
          <span style={{ color: colors.textMid, fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600 }}>
            {displayNiu}
          </span>
        </div>
      </td>
      {/* Secteur */}
      <td style={{ padding: '14px 12px', maxWidth: 180 }}>
        <span style={{ fontSize: 12, color: colors.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {displaySector}
        </span>
      </td>
      {/* Ville / Région */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{displayCity}</span>
          {displayRegion && displayRegion !== displayCity && (
            <span style={{ fontSize: 10.5, color: colors.textDim }}>{displayRegion}</span>
          )}
        </div>
      </td>
      {/* Statut */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        {company.verified ? (
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 4, 
            padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.1)',
            color: '#16a34a', fontSize: 11, fontWeight: 700, border: '1px solid rgba(34,197,94,0.2)'
          }}>
            <CheckCircle2 size={12} />
            VERIFIED
          </div>
        ) : (
          <span style={{ fontSize: 11, color: colors.textDim, opacity: 0.6 }}>—</span>
        )}
      </td>
      {/* Date */}
      <td style={{ padding: '14px 12px', color: colors.textMid, textAlign: 'right', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500 }}>
        {dateStr}
      </td>
    </tr>
  )
}
