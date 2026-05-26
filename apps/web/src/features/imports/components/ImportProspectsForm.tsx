'use client'

import { useState, useRef } from 'react'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

type ParsedRow = {
  name: string
  phone: string
  email: string
  city: string
  sector: string
  notes: string
}

type Props = {
  managerId: string
  onImported: (count: number) => void
}

const EXPECTED_HEADERS = ['name', 'phone', 'email', 'city', 'sector', 'notes']
const HEADER_ALIASES: Record<string, string> = {
  nom: 'name',
  prénom: 'name',
  prenom: 'name',
  entreprise: 'name',
  société: 'name',
  téléphone: 'phone',
  telephone: 'phone',
  tel: 'phone',
  numéro: 'phone',
  mail: 'email',
  courriel: 'email',
  ville: 'city',
  localité: 'city',
  secteur: 'sector',
  activité: 'sector',
  activite: 'sector',
  remarque: 'notes',
  commentaire: 'notes',
  note: 'notes'
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 1) return []

  // Détecter le séparateur : analyser le header pour trouver le plus fréquent
  // Supporter : virgule, point-virgule, tabulation, pipe, tilde
  const headerLine = lines[0]!
  let sep = ','

  // Compter les occurrences de chaque séparateur potentiel
  const separators = [',', ';', '\t', '|', '~']
  let maxCount = 0
  for (const s of separators) {
    const count = (headerLine.match(new RegExp(`\\${s}`, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      sep = s
    }
  }

  const raw_headers = headerLine.split(sep).map((h) =>
    h
      .replace(/^["'`]|["'`]$/g, '')
      .trim()
      .toLowerCase()
  )

  // Mapper les headers vers les colonnes attendues
  const mapped = raw_headers.map((h) => HEADER_ALIASES[h] ?? h)

  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(sep).map((c) => c.replace(/^["'`]|["'`]$/g, '').trim())
      const row: Record<string, string> = {}
      mapped.forEach((key, i) => {
        row[key] = cols[i] ?? ''
      })
      return {
        name: row.name ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        city: row.city ?? '',
        sector: row.sector ?? '',
        notes: row.notes ?? ''
      }
    })
    .filter((r) => r.name || r.phone || r.email) // ignorer lignes vides
}

export function ImportProspectsForm({ managerId, onImported }: Props) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    setSuccess(null)
    setRows([])
    // Accepter tous les formats texte courants
    if (
      !file.type.startsWith('text/') &&
      !file.name.match(/\.(csv|txt|tsv|xlsx|xls|json|dat|log)$/i)
    ) {
      setError(t('team.errorFormat'))
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        const parsed = parseCSV(text)
        if (parsed.length === 0) {
          setError(t('team.errorNoValid'))
          return
        }
        if (parsed.length > 3000) {
          setError(`${parsed.length} ${t('team.errorMaxRows')}`)
          return
        }
        setRows(parsed)
      } catch {
        setError(t('team.errorRead'))
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, prospects: rows })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? t('team.errorServer'))
      setSuccess(`✅ ${json.count} ${t('team.importSuccess')}`)
      setRows([])
      setFileName('')
      onImported(json.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('team.importError'))
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setRows([])
    setFileName('')
    setError(null)
    setSuccess(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Zone de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${rows.length ? 'rgba(46,160,90,0.5)' : colors.border}`,
          borderRadius: 12,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: rows.length ? 'rgba(27,122,62,0.05)' : colors.bg2,
          transition: 'all 200ms ease'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>{rows.length ? '✅' : '📁'}</div>
        {fileName ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{fileName}</div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
              {t('team.dragDrop')}
            </div>
            <div style={{ fontSize: 12, color: colors.textMid }}>{t('team.orClick')}</div>
          </>
        )}
        {rows.length > 0 && (
          <div style={{ fontSize: 12, color: colors.green, marginTop: 6, fontWeight: 600 }}>
            {rows.length} {t('team.prospectsDetected')}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      {/* Aide format */}
      <div
        style={{
          fontSize: 11.5,
          color: colors.textMid,
          lineHeight: 1.65,
          padding: '8px 12px',
          background: colors.bg2,
          borderRadius: 8,
          border: `1px solid ${colors.border}`
        }}
      >
        <strong>📄 {t('team.supportedFormats')}</strong> CSV, TSV, TXT, XLSX, XLS, JSON, etc.
        <br />
        <strong>{t('team.autoSeparators')}</strong> {t('team.separatorsList')}
        <br />
        <code style={{ fontSize: 11, background: colors.bg3, padding: '1px 4px', borderRadius: 3 }}>
          Nom ; Téléphone | Email , Ville
        </code>
        <br />
        ℹ️ {t('team.flexibleColumns')}
      </div>

      {/* Messages */}
      {error && (
        <div
          style={{
            fontSize: 13,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444'
          }}
        >
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div
          style={{
            fontSize: 13,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(27,122,62,0.08)',
            border: '1px solid rgba(46,160,90,0.25)',
            color: colors.green
          }}
        >
          {success}
        </div>
      )}

      {/* Aperçu (5 premières lignes) */}
      {rows.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMid, marginBottom: 8 }}>
            {t('team.preview')} ({Math.min(rows.length, 5)} / {rows.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {[
                    t('field.raisonSociale'),
                    t('field.telephone'),
                    t('field.email'),
                    t('field.city'),
                    t('field.sector')
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        background: colors.bg3,
                        color: colors.textMid,
                        fontWeight: 600,
                        fontSize: 11,
                        borderBottom: `1px solid ${colors.border}`
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '6px 10px', color: colors.text }}>{row.name || '—'}</td>
                    <td style={{ padding: '6px 10px', color: colors.textMid }}>
                      {row.phone || '—'}
                    </td>
                    <td style={{ padding: '6px 10px', color: colors.textMid }}>
                      {row.email || '—'}
                    </td>
                    <td style={{ padding: '6px 10px', color: colors.textMid }}>
                      {row.city || '—'}
                    </td>
                    <td style={{ padding: '6px 10px', color: colors.textMid }}>
                      {row.sector || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => void handleImport()}
          disabled={rows.length === 0 || loading}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 10,
            background:
              rows.length > 0 ? 'linear-gradient(135deg, #1b7a3e, #137333)' : colors.border,
            color: rows.length > 0 ? '#fff' : colors.textMid,
            border: 'none',
            cursor: rows.length > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: 13,
            fontFamily: 'inherit',
            transition: 'all 200ms ease'
          }}
        >
          {loading
            ? t('team.importing')
            : `${t('team.importBtn')} ${rows.length > 0 ? `(${rows.length})` : ''}`}
        </button>
        {(rows.length > 0 || fileName) && (
          <button
            onClick={handleReset}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textMid,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              fontFamily: 'inherit'
            }}
          >
            {t('team.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
