'use client'

import { useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAdminImports } from '@/features/admin/hooks/useAdminImports'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

/* ── types ── */
type ImportResult = {
  total?: number
  imported?: number
  updated?: number
  skipped?: number
  errors?: number
  columns_detected?: Record<string, string>
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; fileName: string }
  | { status: 'success'; fileName: string; result: ImportResult }
  | { status: 'error'; message: string }

/* ─────────────────────────────────────────────── */

export default function AdminImportsPage() {
  const { user } = useCurrentUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [isDragging, setIsDragging] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAdminImports(historyPage)
  const { t } = useTranslation()

  /* ── upload logic ── */
  async function handleFile(file: File) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setUploadState({ status: 'error', message: 'Format non pris en charge. Utilisez .xlsx, .xls ou .csv' })
      return
    }

    setUploadState({ status: 'uploading', progress: 30, fileName: file.name })

    try {
      const token = await user?.getIdToken()
      const fd = new FormData()
      fd.append('file', file)

      setUploadState({ status: 'uploading', progress: 60, fileName: file.name })

      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: fd,
      })

      setUploadState({ status: 'uploading', progress: 90, fileName: file.name })

      let json: ImportResult & { error?: string }
      try { json = await res.json() } catch { json = {} }

      if (!res.ok) {
        setUploadState({ status: 'error', message: json.error ?? `Erreur serveur (${res.status})` })
        return
      }

      setUploadState({ status: 'success', fileName: file.name, result: json })
      refetch()
    } catch (e) {
      setUploadState({ status: 'error', message: e instanceof Error ? e.message : 'Erreur réseau' })
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleClearHistory() {
    if (!window.confirm('Voulez-vous vraiment effacer tout l\'historique des imports ? Cette action ne supprime pas les entreprises importées.')) {
      return
    }

    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/imports', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })

      if (!res.ok) throw new Error('Erreur lors de la suppression')

      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur réseau')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  /* ── styles ── */
  const zoneBg = isDragging ? colors.greenLight : colors.bg3
  const zoneBorder = isDragging ? colors.green : colors.border2

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 20
  const totalPages = Math.ceil(total / pageSize)

  const statusColors: Record<string, string> = {
    pending: colors.textMid, processing: '#fbbf24', completed: '#2ea05a', failed: '#f87171',
  }
  const statusLabels: Record<string, string> = {
    pending: 'En attente', processing: 'En cours', completed: 'Terminé', failed: 'Échoué',
  }

  return (
    <AppShell>
      <PageHeader
        title={t('admin.importsTitle')}
        subtitle={t('admin.importsSubtitle')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Upload zone ── */}
        <div style={{ background: colors.surface, borderRadius: 14, border: `1px solid ${colors.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: colors.text, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
            📤 {t('admin.newImport')}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${zoneBorder}`,
              borderRadius: 12,
              padding: '36px 24px',
              textAlign: 'center',
              background: zoneBg,
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: colors.text, marginBottom: 6 }}>
              Glissez votre fichier ici
            </div>
            <div style={{ fontSize: 13, color: colors.textMid, marginBottom: 18 }}>
              ou cliquez pour parcourir
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              style={{
                padding: '9px 24px',
                background: colors.green,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Choisir un fichier
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
          </div>

          {/* Progress / Result */}
          {uploadState.status === 'uploading' && (
            <div>
              <div style={{ fontSize: 12, color: colors.textMid, marginBottom: 6 }}>
                Traitement de « {uploadState.fileName} »…
              </div>
              <div style={{ height: 6, background: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${uploadState.progress}%`,
                    background: colors.green,
                    borderRadius: 3,
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
            </div>
          )}

          {uploadState.status === 'success' && (
            <div style={{ background: colors.greenLight, border: `1px solid ${colors.successBorder}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, color: colors.green, marginBottom: 10 }}>
                ✅ Import réussi — {uploadState.fileName}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Lignes lues',    val: uploadState.result.total ?? 0,    color: colors.text },
                  { label: 'Nouvelles',       val: uploadState.result.imported ?? 0, color: colors.green },
                  { label: 'Mises à jour',   val: uploadState.result.updated ?? 0,  color: '#1a73e8' },
                  { label: 'Doublons',        val: uploadState.result.skipped ?? 0,  color: '#f39c12' },
                  { label: 'Erreurs',         val: uploadState.result.errors ?? 0,   color: colors.danger },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color }}>{val}</span>
                    <span style={{ fontSize: 11, color: colors.textMid }}>{label}</span>
                  </div>
                ))}
              </div>
              {uploadState.result.columns_detected && Object.keys(uploadState.result.columns_detected).length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: colors.textMid }}>
                  <strong>Colonnes mappées :</strong>{' '}
                  {Object.entries(uploadState.result.columns_detected).map(([k, v]) => `${k} → "${v}"`).join(', ')}
                </div>
              )}
              <button
                onClick={() => setUploadState({ status: 'idle' })}
                style={{ marginTop: 10, fontSize: 12, color: colors.green, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Importer un autre fichier
              </button>
            </div>
          )}

          {uploadState.status === 'error' && (
            <div style={{ background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: 10, padding: '12px 16px', color: colors.danger, fontSize: 13 }}>
              ❌ {uploadState.message}
              <button
                onClick={() => setUploadState({ status: 'idle' })}
                style={{ marginLeft: 12, fontSize: 12, color: colors.danger, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Info block */}
          <div style={{ background: colors.infoBg, border: `1px solid ${colors.infoBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12.5, color: colors.info }}>
            <strong>📋 Colonnes reconnues automatiquement :</strong>
            <ul style={{ paddingLeft: 16, marginTop: 6, lineHeight: 1.9 }}>
              <li><strong>RAISON_SOCIALE</strong> — Nom de l'entreprise (obligatoire)</li>
              <li><strong>NIU</strong> — Numéro d'identification unique (optionnel, clé dédoublonnage)</li>
              <li><strong>ACTIVITE_PRINCIPALE</strong> — Secteur auto-détecté</li>
              <li><strong>CENTRE_DE_RATTACHEMENT</strong> — Région / Ville auto-détectées</li>
              <li>+ SIGLE, TELEPHONE, EMAIL, DIRIGEANT, RCCM (si disponibles)</li>
            </ul>
          </div>
        </div>

        {/* ── History table ── */}
        <div style={{ background: colors.surface, borderRadius: 14, border: `1px solid ${colors.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>📂 {t('admin.allImports')}</span>
              {total > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: colors.textMid }}>{total} import{total > 1 ? 's' : ''}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleClearHistory}
                disabled={items.length === 0}
                style={{
                  background: colors.dangerBg,
                  color: colors.danger,
                  border: `1px solid ${colors.dangerBorder}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: items.length === 0 ? 0.5 : 1
                }}
              >
                🗑️ {t('admin.clearHistory')}
              </button>
              <button
                onClick={() => refetch()}
                style={{ background: colors.greenLight, color: colors.green, border: `1px solid ${colors.successBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('admin.refresh')}
              </button>
            </div>
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>{t('team.loading')}</div>
          )}
          {isError && (
            <div style={{ textAlign: 'center', padding: 40, color: colors.danger, fontSize: 13 }}>{t('support.errorLoad')}</div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: colors.textMid, fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
              {t('admin.noImports')}
            </div>
          )}
          {!isLoading && !isError && items.length > 0 && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {[t('admin.filename'), t('admin.count'), t('admin.resultsCount'), t('admin.status'), t('admin.date')].map((h) => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${colors.border}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const dateStr = new Date(item.importedAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      const successRate = item.totalRecords > 0 ? Math.round((item.successCount / item.totalRecords) * 100) : 0
                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '11px 10px', fontWeight: 500, color: colors.text, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>
                            📄 {item.fileName}
                          </td>
                          <td style={{ padding: '11px 10px', color: colors.textMid }}>{item.totalRecords}</td>
                          <td style={{ padding: '11px 10px' }}>
                            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                              <span style={{ color: '#2ea05a' }}>✓ {item.successCount}</span>
                              {item.errorCount > 0 && <span style={{ color: '#f87171' }}>✗ {item.errorCount}</span>}
                            </div>
                            <div style={{ fontSize: 10, color: colors.textMid, marginTop: 1 }}>{successRate}% réussi</div>
                          </td>
                          <td style={{ padding: '11px 10px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: statusColors[item.status] ?? colors.textMid }}>
                              {statusLabels[item.status] ?? item.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 10px', color: colors.textMid, fontSize: 12 }}>{dateStr}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
                  <button onClick={() => setHistoryPage(Math.max(1, historyPage - 1))} disabled={historyPage === 1} style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, color: colors.text, cursor: historyPage === 1 ? 'not-allowed' : 'pointer', opacity: historyPage === 1 ? 0.5 : 1 }}>
                    ←
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setHistoryPage(p)} style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${p === historyPage ? colors.green : colors.border}`, borderRadius: 6, background: p === historyPage ? colors.greenLight : colors.bg, color: colors.text, cursor: 'pointer', fontWeight: p === historyPage ? 700 : 400 }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setHistoryPage(Math.min(totalPages, historyPage + 1))} disabled={historyPage === totalPages} style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg, color: colors.text, cursor: historyPage === totalPages ? 'not-allowed' : 'pointer', opacity: historyPage === totalPages ? 0.5 : 1 }}>
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
