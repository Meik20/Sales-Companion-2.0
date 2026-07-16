'use client'

import { useState, useRef } from 'react'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'

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

/** Normalise un header de colonne vers une clé de lookup :
 *  - strip accents (NFD)
 *  - minuscules
 *  - apostrophes / tirets → espace
 *  - collapse whitespace → underscore
 *  Ex: "RAISON SOCIALE" → "raison_sociale"
 *      "SECTEUR D'ACTIVITE" → "secteur_dactivite"
 *      "Téléphone" → "telephone"
 */
function normalizeHeader(raw: string): string {
  return raw
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/['\'\-]/g, '')                          // remove apostrophes / hyphens
    .replace(/[^a-z0-9]+/g, '_')                      // non-alphanum → underscore
    .replace(/^_+|_+$/g, '')                           // trim underscores
}

/** Table de correspondance : clé normalisée → champ canonique */
const HEADER_ALIASES: Record<string, string> = {
  // ── Raison sociale / Nom entreprise ───────────────────────
  nom: 'name',
  prenom: 'name',
  entreprise: 'name',
  societe: 'name',
  denomination: 'name',
  raison_sociale: 'name',
  raisonsociale: 'name',
  nom_entreprise: 'name',
  company_name: 'name',
  company: 'name',
  name: 'name',

  // ── Téléphone ──────────────────────────────────────────────
  telephone: 'phone',
  tel: 'phone',
  phone: 'phone',
  mobile: 'phone',
  numero: 'phone',
  num: 'phone',
  gsm: 'phone',
  portable: 'phone',

  // ── Email ─────────────────────────────────────────────────
  email: 'email',
  mail: 'email',
  courriel: 'email',
  adresse_email: 'email',
  adresse_mail: 'email',

  // ── Ville / Adresse ───────────────────────────────────────
  ville: 'city',
  localite: 'city',
  city: 'city',
  region: 'city',
  adresse: 'city',
  address: 'city',
  lieu: 'city',

  // ── Secteur ───────────────────────────────────────────────
  secteur: 'sector',
  activite: 'sector',
  activite_principale: 'sector',
  secteur_activite: 'sector',
  secteur_dactivite: 'sector',
  secteur_d_activite: 'sector',
  domaine: 'sector',
  domaine_activite: 'sector',
  industry: 'sector',
  sector: 'sector',

  // ── Notes / Commentaires ──────────────────────────────────
  notes: 'notes',
  note: 'notes',
  remarque: 'notes',
  commentaire: 'notes',
  observations: 'notes',
  description: 'notes',
}

/** Résout un header brut vers le champ canonique (name/phone/email/city/sector/notes) */
function resolveHeader(raw: string): string {
  const key = normalizeHeader(raw)
  return HEADER_ALIASES[key] ?? key
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 1) return []

  const headerLine = lines[0]!
  let sep = ','

  // Détecter le séparateur le plus fréquent
  const separators = [',', ';', '\t', '|', '~']
  let maxCount = 0
  for (const s of separators) {
    const count = (headerLine.match(new RegExp(`\\${s}`, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      sep = s
    }
  }

  const raw_headers = headerLine
    .split(sep)
    .map((h) => h.replace(/^["'`]|["'`]$/g, '').trim())

  // Mapper les headers vers les colonnes attendues via normalisation
  const mapped = raw_headers.map(resolveHeader)

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
    .filter((r) => r.name || r.phone || r.email)
}

export function ImportProspectsForm({ managerId, onImported }: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
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
    
    const isExcel = file.name.match(/\.(xlsx|xls)$/i)
    
    // Accepter tous les formats texte courants + Excel
    if (
      !file.type.startsWith('text/') &&
      !isExcel &&
      !file.name.match(/\.(csv|txt|tsv|json|dat|log)$/i)
    ) {
      setError(t('team.errorFormat'))
      return
    }
    
    setFileName(file.name)
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        let parsed: ParsedRow[] = []
        
        if (isExcel) {
          const buffer = e.target?.result as ArrayBuffer
          const ExcelJS = await import('exceljs')
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(buffer)
          const sheet = workbook.worksheets[0]
          
          if (sheet) {
            let headers: string[] = []
            sheet.eachRow((row, rowNumber) => {
              let values: any[] = []
              if (Array.isArray(row.values)) {
                values = row.values
              } else if (row.values && typeof row.values === 'object') {
                const maxCol = sheet.columnCount
                for (let c = 0; c <= maxCol; c++) {
                  values.push((row.values as any)[c])
                }
              }

              if (rowNumber === 1) {
                // Appliquer la même normalisation que pour CSV
                headers = values.slice(1).map((v) =>
                  (v != null ? String(v) : '')
                    .replace(/^["'`]|["'`]$/g, '')
                    .trim()
                )
                return
              }

              const rowObj: Record<string, string> = {}
              headers.forEach((header, i) => {
                const cell = row.getCell(i + 1)
                let val = ''
                if (cell.value != null) {
                  if (typeof cell.value === 'object') {
                    if ('result' in cell.value) {
                      val = String(cell.value.result ?? '')
                    } else if ('text' in cell.value) {
                      val = String(cell.value.text ?? '')
                    } else if ('hyperlink' in cell.value) {
                      val = String((cell.value as any).text ?? cell.value.hyperlink ?? '')
                    } else {
                      val = JSON.stringify(cell.value)
                    }
                  } else {
                    val = String(cell.value)
                  }
                }
                if (header) {
                  rowObj[header] = val.trim()
                }
              })

              const mappedRow: Record<string, string> = {}
              Object.keys(rowObj).forEach((h) => {
                // resolveHeader normalise accents + alias composés (RAISON SOCIALE, SECTEUR D'ACTIVITE…)
                const canonicalKey = resolveHeader(h)
                mappedRow[canonicalKey] = rowObj[h] ?? ''
              })

              parsed.push({
                name: mappedRow.name ?? '',
                phone: mappedRow.phone ?? '',
                email: mappedRow.email ?? '',
                city: mappedRow.city ?? '',
                sector: mappedRow.sector ?? '',
                notes: mappedRow.notes ?? ''
              })
            })
          }
        } else {
          const text = e.target?.result as string
          parsed = parseCSV(text)
        }

        const validParsed = parsed.filter((r) => r.name || r.phone || r.email)
        if (validParsed.length === 0) {
          setError(t('team.errorNoValid'))
          return
        }
        if (validParsed.length > 3000) {
          setError(`${validParsed.length} ${t('team.errorMaxRows')}`)
          return
        }
        setRows(validParsed)
      } catch (err) {
        console.error('Error parsing file:', err)
        setError(t('team.errorRead'))
      }
    }
    
    if (isExcel) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file, 'UTF-8')
    }
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
      const token = user ? await user.getIdToken() : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/imports', {
        method: 'POST',
        headers,
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
          accept=".csv,.txt,.tsv,.xlsx,.xls"
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
