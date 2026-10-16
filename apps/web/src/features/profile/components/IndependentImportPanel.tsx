'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { Panel } from '@/components/ui/index'
import { routes } from '@/constants/routes'
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
  Lock,
  Sparkles
} from 'lucide-react'

// ── Normalisation des en-têtes (insensible à la casse, accents et caractères spéciaux) ──
function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/['\'\-]/g, '') // remove apostrophes / hyphens
    .replace(/[^a-z0-9]+/g, '_') // non-alphanum → underscore
    .replace(/^_+|_+$/g, '') // trim underscores
}

const HEADER_ALIASES: Record<string, string> = {
  // ── Raison sociale / Nom entreprise / Contact ──────────────
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
  contact: 'name',
  prospect: 'name',
  client: 'name',

  // ── Téléphone ──────────────────────────────────────────────
  telephone: 'phone',
  tel: 'phone',
  phone: 'phone',
  mobile: 'phone',
  numero: 'phone',
  num: 'phone',
  gsm: 'phone',
  portable: 'phone',
  contact_tel: 'phone',

  // ── Email ──────────────────────────────────────────────────
  email: 'email',
  mail: 'email',
  courriel: 'email',
  adresse_email: 'email',
  adresse_mail: 'email',
  contact_email: 'email',

  // ── Ville / Adresse ────────────────────────────────────────
  ville: 'city',
  localite: 'city',
  city: 'city',
  region: 'city',
  adresse: 'city',
  address: 'city',
  lieu: 'city',
  commune: 'city',
  pays: 'city',
  country: 'city',

  // ── Secteur ────────────────────────────────────────────────
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
  categorie: 'sector',

  // ── Notes / Commentaires ───────────────────────────────────
  notes: 'notes',
  note: 'notes',
  remarque: 'notes',
  commentaire: 'notes',
  observations: 'notes',
  description: 'notes',
  details: 'notes'
}

function resolveHeader(raw: string): string {
  const key = normalizeHeader(raw)
  return HEADER_ALIASES[key] ?? key
}

type ParsedProspect = {
  name: string
  phone: string
  email: string
  city: string
  sector: string
  notes: string
}

type ImportResult = {
  count: number
}

// ── Parse CSV avec détection de séparateur et normalisation ───────────────
function parseCSV(text: string): ParsedProspect[] {
  const cleanText = text.replace(/^\uFEFF/, '').trim()
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headerLine = lines[0]!
  let sep = ','

  // Détecter le séparateur le plus fréquent parmi , ; \t | ~
  const separators = [',', ';', '\t', '|', '~']
  let maxCount = 0
  for (const s of separators) {
    const count = (headerLine.match(new RegExp(`\\${s}`, 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      sep = s
    }
  }

  const rawHeaders = headerLine.split(sep).map((h) => h.replace(/^["'`]|["'`]$/g, '').trim())
  const mappedHeaders = rawHeaders.map(resolveHeader)

  const rows: ParsedProspect[] = []
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r]!.split(sep).map((c) => c.replace(/^["'`]|["'`]$/g, '').trim())
    const prospect: ParsedProspect = {
      name: '',
      phone: '',
      email: '',
      city: '',
      sector: '',
      notes: ''
    }
    mappedHeaders.forEach((field, i) => {
      if (field in prospect) {
        (prospect as Record<string, string>)[field] = cols[i] ?? ''
      }
    })
    if (prospect.name || prospect.phone || prospect.email) {
      rows.push(prospect)
    }
  }
  return rows
}

// ── Parse Excel (.xlsx, .xls) via ExcelJS ───────────────────────────────────
async function parseExcelBuffer(buffer: ArrayBuffer): Promise<ParsedProspect[]> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: ParsedProspect[] = []
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
      headers = values
        .slice(1)
        .map((v) => (v != null ? String(v) : '').replace(/^["'`]|["'`]$/g, '').trim())
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

    const prospect: ParsedProspect = {
      name: '',
      phone: '',
      email: '',
      city: '',
      sector: '',
      notes: ''
    }

    Object.keys(rowObj).forEach((h) => {
      const canonicalKey = resolveHeader(h)
      if (canonicalKey in prospect) {
        (prospect as Record<string, string>)[canonicalKey] = rowObj[h] ?? ''
      }
    })

    if (prospect.name || prospect.phone || prospect.email) {
      rows.push(prospect)
    }
  })

  return rows
}

// ── Download template ──────────────────────────────────────────────────────
function downloadTemplate() {
  const header = 'nom;téléphone;email;ville;secteur;notes'
  const example =
    'Entreprise Exemple;+237 6XX XXX XXX;contact@exemple.cm;Douala;Commerce;Client potentiel'
  const blob = new Blob([`${header}\n${example}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modele_prospects.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Main component ─────────────────────────────────────────────────────────
export function IndependentImportPanel() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const router = useRouter()

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedProspect[]>([])
  const [preview, setPreview] = useState<ParsedProspect[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setRows([])
    setPreview([])
    setParseError(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const processFile = useCallback(async (f: File) => {
    setResult(null)
    setParseError(null)
    setRows([])
    setPreview([])

    const isExcel = Boolean(f.name.match(/\.(xlsx|xls)$/i))
    const isText = Boolean(
      f.type.startsWith('text/') || f.name.match(/\.(csv|txt|tsv|dat|log)$/i)
    )

    if (!isExcel && !isText) {
      setParseError('Format non supporté. Utilisez un fichier CSV (.csv) ou Excel (.xlsx, .xls).')
      return
    }

    try {
      let parsed: ParsedProspect[] = []
      if (isExcel) {
        const buffer = await f.arrayBuffer()
        parsed = await parseExcelBuffer(buffer)
      } else {
        const text = await f.text()
        parsed = parseCSV(text)
      }

      if (parsed.length === 0) {
        setParseError(
          'Aucun prospect détecté. Vérifiez que votre fichier contient au moins une colonne de contact (nom, entreprise, raison sociale, téléphone ou email).'
        )
        return
      }

      if (parsed.length > 3000) {
        setParseError(`${parsed.length} prospects détectés. Le maximum autorisé est de 3 000 par import.`)
        return
      }

      setFile(f)
      setRows(parsed)
      setPreview(parsed.slice(0, 5))
    } catch (err) {
      console.error('[IndependentImportPanel] file processing error:', err)
      setParseError('Impossible de lire le fichier. Assurez-vous qu’il n’est pas corrompu ou protégé.')
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) void processFile(f)
    },
    [processFile]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void processFile(f)
  }

  const handleImport = async () => {
    if (!file || rows.length === 0 || !user?.uid) return
    setImporting(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ managerId: user.uid, prospects: rows })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur lors de l’import')
      }

      const data = await res.json()
      setResult({ count: data.count ?? rows.length })
      pushToast({
        type: 'success',
        title: 'Import réussi',
        description: `${data.count ?? rows.length} prospects importés avec succès dans votre pipeline commercial.`
      })
      reset()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue'
      setParseError(msg)
      pushToast({
        type: 'error',
        title: 'Erreur d’import',
        description: msg
      })
    } finally {
      setImporting(false)
    }
  }

  const isFree = (user?.plan ?? 'free') === 'free'

  // ── CTA Upgrade pour les FREE ────────────────────────────────────
  if (isFree) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Lock size={24} className="text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
              <FileSpreadsheet size={16} className="text-primary" />
              Importer ma base de prospects
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              L’import de votre base de prospects est réservé aux indépendants avec un plan payant.
              Passez à un plan supérieur pour débloquer cette fonctionnalité.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                `${routes.upgrade}?redirect=${encodeURIComponent(routes.importProspects)}`
              )
            }
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles size={15} />
            UPGRADE — Débloquer l’import
          </button>
        </div>
      </Panel>
    )
  }

  const inputStyle: React.CSSProperties = {
    height: 34,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: 12,
    outline: 'none',
    width: '100%'
  }

  return (
    <Panel>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-primary" />
          Importer ma base de prospects
        </h3>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition-colors cursor-pointer"
        >
          <Download size={13} />
          Télécharger le modèle CSV
        </button>
      </div>

      {/* ── Notice ── */}
      <div
        className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/8 px-3 py-2.5 mb-4"
        style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
      >
        <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
        <span>
          Importez vos prospects existants depuis un fichier <strong>CSV ou Excel (.xlsx, .xls)</strong>.
          Colonnes reconnues : <code>nom / raison sociale</code>, <code>téléphone</code>, <code>email</code>,{' '}
          <code>ville</code>, <code>secteur</code>, <code>notes</code>. Max 3 000 lignes.
        </span>
      </div>

      {/* ── Zone de dépôt ── */}
      {!file && !result && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center"
          style={{
            borderColor: dragging ? 'var(--primary)' : 'var(--border)',
            background: dragging ? 'var(--primary)/5' : 'var(--secondary, #1e293b)'
          }}
        >
          <Upload
            size={32}
            strokeWidth={1.5}
            style={{ color: dragging ? 'var(--primary)' : 'var(--muted-foreground)' }}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Glisser-déposer votre fichier CSV ou Excel ici
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ou cliquer pour sélectionner (.csv, .xlsx, .xls)
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── Erreur de parsing ── */}
      {parseError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2.5 mt-3">
          <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <span className="text-xs text-red-400">{parseError}</span>
        </div>
      )}

      {/* ── Aperçu ── */}
      {file && preview.length > 0 && (
        <div className="mt-2 flex flex-col gap-3">
          {/* Fichier sélectionné */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate max-w-[220px]">
                {file.name}
              </span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Tableau aperçu */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Aperçu (5 premières lignes)
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/80">
                    {['Nom', 'Téléphone', 'Email', 'Ville', 'Secteur'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground border-b border-border"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/30'}>
                      <td className="px-3 py-2 text-foreground font-medium truncate max-w-[120px]">
                        {p.name || '—'}
                      </td>
                      <td className="px-3 py-2 text-foreground truncate max-w-[100px]">
                        {p.phone || '—'}
                      </td>
                      <td className="px-3 py-2 text-foreground truncate max-w-[140px]">
                        {p.email || '—'}
                      </td>
                      <td className="px-3 py-2 text-foreground">{p.city || '—'}</td>
                      <td className="px-3 py-2 text-foreground">{p.sector || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={13} />
              Annuler
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Importation…
                </>
              ) : (
                <>
                  <Upload size={13} /> Importer les prospects
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Résultat ── */}
      {result && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/8 px-4 py-3 mt-2">
          <CheckCircle2 size={20} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
              {result.count} prospect{result.count > 1 ? 's' : ''} importé
              {result.count > 1 ? 's' : ''} avec succès
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ils sont maintenant disponibles dans votre base de prospects.
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}
