'use client'

import { useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAdminImports } from '@/features/admin/hooks/useAdminImports'
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
      setUploadState({
        status: 'error',
        message: t('admin.errorFormat')
      })
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
        body: fd
      })

      setUploadState({ status: 'uploading', progress: 90, fileName: file.name })

      let json: ImportResult & { error?: string }
      try {
        json = await res.json()
      } catch {
        json = {}
      }

      if (!res.ok) {
        setUploadState({ status: 'error', message: json.error ?? `${t('admin.errorServer')} (${res.status})` })
        return
      }

      setUploadState({ status: 'success', fileName: file.name, result: json })
      refetch()
    } catch (e) {
      setUploadState({ status: 'error', message: e instanceof Error ? e.message : t('admin.errorNetwork') })
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleClearHistory() {
    if (
      !window.confirm(t('admin.confirmClearHistory'))
    ) {
      return
    }

    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/imports', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token ?? ''}` }
      })

      if (!res.ok) throw new Error(t('admin.errorDelete'))

      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : t('admin.errorNetwork'))
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
  const zoneBg = isDragging ? 'rgba(34,197,94,0.1)' : 'var(--secondary, #1e2a3b)'
  const zoneBorder = isDragging ? '#4ade80' : 'rgba(255,255,255,0.07)'

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 20
  const totalPages = Math.ceil(total / pageSize)

  const statusColors: Record<string, string> = {
    pending: 'var(--muted-foreground, #94a3b8)',
    processing: '#fbbf24',
    completed: '#2ea05a',
    failed: '#f87171'
  }
  const statusLabels: Record<string, string> = {
    pending: t('admin.statusPending'),
    processing: t('admin.statusProcessing'),
    completed: t('admin.statusCompleted'),
    failed: t('admin.statusFailed')
  }

  return (
    <AppShell>
      <PageHeader title={t('admin.importsTitle')} subtitle={t('admin.importsSubtitle')} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ── Upload zone ── */}
        <div
          style={{
            background: 'var(--secondary, #1e2a3b)',
            borderRadius: 14,
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--foreground, #f1f5f9)',
              paddingBottom: 12,
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
            }}
          >
            📤 {t('admin.newImport')}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
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
              transition: 'all 200ms ease'
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--foreground, #f1f5f9)', marginBottom: 6 }}>
              {t('admin.dragFile')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)', marginBottom: 18 }}>
              {t('admin.orBrowse')}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              style={{
                padding: '9px 24px',
                background: '#4ade80',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {t('admin.chooseFile')}
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
              <div style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)', marginBottom: 6 }}>
                {t('admin.processing')} « {uploadState.fileName} »…
              </div>
              <div
                style={{
                  height: 6,
                  background: 'var(--border, rgba(255,255,255,0.1))',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${uploadState.progress}%`,
                    background: '#4ade80',
                    borderRadius: 3,
                    transition: 'width 300ms ease'
                  }}
                />
              </div>
            </div>
          )}

          {uploadState.status === 'success' && (
            <div
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: `1px solid ${'rgba(34,197,94,0.3)'}`,
                borderRadius: 10,
                padding: '14px 16px'
              }}
            >
              <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: 10 }}>
                ✅ {t('admin.importSuccess')} — {uploadState.fileName}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: t('admin.rowsRead'), val: uploadState.result.total ?? 0, color: 'var(--foreground, #f1f5f9)' },
                  { label: t('admin.newRows'), val: uploadState.result.imported ?? 0, color: '#4ade80' },
                  { label: t('admin.updatedRows'), val: uploadState.result.updated ?? 0, color: '#1a73e8' },
                  { label: t('admin.skippedRows'), val: uploadState.result.skipped ?? 0, color: '#f39c12' },
                  { label: t('admin.errorRows'), val: uploadState.result.errors ?? 0, color: '#f87171' }
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color }}>{val}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>{label}</span>
                  </div>
                ))}
              </div>
              {uploadState.result.columns_detected &&
                Object.keys(uploadState.result.columns_detected).length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                    <strong>{t('admin.mappedColumns')} :</strong>{' '}
                    {Object.entries(uploadState.result.columns_detected)
                      .map(([k, v]) => `${k} → "${v}"`)
                      .join(', ')}
                  </div>
                )}
              <button
                onClick={() => setUploadState({ status: 'idle' })}
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: '#4ade80',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {t('admin.importAnother')}
              </button>
            </div>
          )}

          {uploadState.status === 'error' && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: `1px solid ${'rgba(239,68,68,0.3)'}`,
                borderRadius: 10,
                padding: '12px 16px',
                color: '#f87171',
                fontSize: 13
              }}
            >
              ❌ {uploadState.message}
              <button
                onClick={() => setUploadState({ status: 'idle' })}
                style={{
                  marginLeft: 12,
                  fontSize: 12,
                  color: '#f87171',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {t('admin.retry')}
              </button>
            </div>
          )}

          {/* Info block */}
          <div
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: `1px solid ${'rgba(59,130,246,0.25)'}`,
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 12.5,
              color: '#60a5fa'
            }}
          >
            <strong>📋 {t('admin.autoColumns')}</strong>
            <ul style={{ paddingLeft: 16, marginTop: 6, lineHeight: 1.9 }}>
              <li><strong>RAISON_SOCIALE</strong> {t('admin.autoColumnsDesc1')}</li>
              <li><strong>NIU</strong> {t('admin.autoColumnsDesc2')}</li>
              <li><strong>ACTIVITE_PRINCIPALE</strong> {t('admin.autoColumnsDesc3')}</li>
              <li><strong>CENTRE_DE_RATTACHEMENT</strong> {t('admin.autoColumnsDesc4')}</li>
              <li>{t('admin.autoColumnsDesc5')}</li>
            </ul>
          </div>
        </div>

        {/* ── History table ── */}
        <div
          style={{
            background: 'var(--secondary, #1e2a3b)',
            borderRadius: 14,
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 12,
              borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground, #f1f5f9)' }}>
                📂 {t('admin.allImports')}
              </span>
              {total > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                  {total} import{total > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleClearHistory}
                disabled={items.length === 0}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f87171',
                  border: `1px solid ${'rgba(239,68,68,0.3)'}`,
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
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  color: '#4ade80',
                  border: `1px solid ${'rgba(34,197,94,0.3)'}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t('admin.importRefresh')}
              </button>
            </div>
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground, #94a3b8)', fontSize: 13 }}>
              {t('team.loading')}
            </div>
          )}
          {isError && (
            <div style={{ textAlign: 'center', padding: 40, color: '#f87171', fontSize: 13 }}>
              {t('support.errorLoad')}
            </div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground, #94a3b8)', fontSize: 13 }}>
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
                      {[
                        t('admin.filename'),
                        t('admin.count'),
                        t('admin.importResultsCount'),
                        t('admin.importStatus'),
                        t('admin.importFileDate')
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '9px 10px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--muted-foreground, #94a3b8)',
                            textTransform: 'uppercase',
                            letterSpacing: '.05em',
                            borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const dateStr = new Date(item.importedAt).toLocaleDateString('fr-FR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      const successRate =
                        item.totalRecords > 0
                          ? Math.round((item.successCount / item.totalRecords) * 100)
                          : 0
                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}` }}>
                          <td
                            style={{
                              padding: '11px 10px',
                              fontWeight: 500,
                              color: 'var(--foreground, #f1f5f9)',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={item.fileName}
                          >
                            📄 {item.fileName}
                          </td>
                          <td style={{ padding: '11px 10px', color: 'var(--muted-foreground, #94a3b8)' }}>
                            {item.totalRecords}
                          </td>
                          <td style={{ padding: '11px 10px' }}>
                            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                              <span style={{ color: '#2ea05a' }}>✓ {item.successCount}</span>
                              {item.errorCount > 0 && (
                                <span style={{ color: '#f87171' }}>✗ {item.errorCount}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)', marginTop: 1 }}>
                              {successRate}% {t('admin.successRate')}
                            </div>
                          </td>
                          <td style={{ padding: '11px 10px' }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: statusColors[item.status] ?? 'var(--muted-foreground, #94a3b8)'
                              }}
                            >
                              {statusLabels[item.status] ?? item.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 10px', color: 'var(--muted-foreground, #94a3b8)', fontSize: 12 }}>
                            {dateStr}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 6,
                    paddingTop: 12,
                    borderTop: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
                  }}
                >
                  <button
                    onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                    disabled={historyPage === 1}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                      borderRadius: 6,
                      background: 'var(--background, #0b1120)',
                      color: 'var(--foreground, #f1f5f9)',
                      cursor: historyPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: historyPage === 1 ? 0.5 : 1
                    }}
                  >
                    ←
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setHistoryPage(p)}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        border: `1px solid ${p === historyPage ? '#4ade80' : 'var(--border, rgba(255,255,255,0.1))'}`,
                        borderRadius: 6,
                        background: p === historyPage ? 'rgba(34,197,94,0.1)' : 'var(--background, #0b1120)',
                        color: 'var(--foreground, #f1f5f9)',
                        cursor: 'pointer',
                        fontWeight: p === historyPage ? 700 : 400
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setHistoryPage(Math.min(totalPages, historyPage + 1))}
                    disabled={historyPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                      borderRadius: 6,
                      background: 'var(--background, #0b1120)',
                      color: 'var(--foreground, #f1f5f9)',
                      cursor: historyPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: historyPage === totalPages ? 0.5 : 1
                    }}
                  >
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
