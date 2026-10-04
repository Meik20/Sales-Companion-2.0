'use client'

import { useState, useRef, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { Panel } from '@/components/ui/index'
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Info
} from 'lucide-react'

// ── Colonnes attendues (insensible à la casse) ─────────────────────────────
const COLUMN_ALIASES: Record<string, string> = {
  // name
  nom: 'name', name: 'name', entreprise: 'name', company: 'name', société: 'name',
  // phone
  téléphone: 'phone', telephone: 'phone', phone: 'phone', tel: 'phone', mobile: 'phone',
  // email
  email: 'email', mail: 'email', courriel: 'email',
  // city
  ville: 'city', city: 'city', localité: 'city',
  // sector
  secteur: 'sector', sector: 'sector', activité: 'sector', activity: 'sector',
  // notes
  notes: 'notes', note: 'notes', commentaire: 'notes', remarque: 'notes'
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

// ── Parse CSV ──────────────────────────────────────────────────────────────
function parseCSV(text: string): ParsedProspect[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  // Detect delimiter
  const firstLine = lines[0]!
  const delimiter = firstLine.includes(';') ? ';' : ','

  const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Map header → field
  const fieldMap: Record<number, string> = {}
  headers.forEach((h, i) => {
    const field = COLUMN_ALIASES[h]
    if (field) fieldMap[i] = field
  })

  const rows: ParsedProspect[] = []
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r]!.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''))
    const prospect: ParsedProspect = { name: '', phone: '', email: '', city: '', sector: '', notes: '' }
    cells.forEach((val, i) => {
      const field = fieldMap[i]
      if (field) (prospect as Record<string, string>)[field] = val
    })
    if (prospect.name || prospect.phone || prospect.email) rows.push(prospect)
  }
  return rows
}

// ── Download template ──────────────────────────────────────────────────────
function downloadTemplate() {
  const header = 'nom;téléphone;email;ville;secteur;notes'
  const example = 'Entreprise Exemple;+237 6XX XXX XXX;contact@exemple.cm;Douala;Commerce;Client potentiel'
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

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ParsedProspect[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setPreview([])
    setParseError(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const processFile = useCallback((f: File) => {
    setResult(null)
    setParseError(null)

    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      setParseError('Format non supporté. Utilisez un fichier CSV (.csv).')
      return
    }

    // Only CSV parsing for now (no xlsx binary without server)
    if (!f.name.match(/\.csv$/i)) {
      setParseError('Pour l\'import depuis le profil, seul le format CSV est supporté. Téléchargez le modèle ci-dessous.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (rows.length === 0) {
        setParseError('Aucun prospect détecté. Vérifiez les colonnes du fichier (nom, téléphone, email, ville, secteur, notes).')
        return
      }
      if (rows.length > 3000) {
        setParseError('Maximum 3 000 prospects par import.')
        return
      }
      setFile(f)
      setPreview(rows.slice(0, 5))
    }
    reader.onerror = () => setParseError('Impossible de lire le fichier.')
    reader.readAsText(f, 'UTF-8')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) processFile(f)
    },
    [processFile]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleImport = async () => {
    if (!file || preview.length === 0 || !user?.uid) return
    setImporting(true)
    try {
      // Re-parse full file
      const text = await file.text()
      const prospects = parseCSV(text)

      const token = await user.getIdToken()
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ managerId: user.uid, prospects })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur serveur' }))
        throw new Error(err.message ?? 'Erreur import')
      }

      const data = (await res.json()) as ImportResult
      setResult(data)
      pushToast({
        type: 'success',
        title: 'Import réussi',
        description: `${data.count} prospect${data.count > 1 ? 's' : ''} importé${data.count > 1 ? 's' : ''} dans votre base.`
      })
      reset()
    } catch (err) {
      pushToast({
        type: 'error',
        title: "Erreur d'import",
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
    } finally {
      setImporting(false)
    }
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
          Importez vos prospects existants depuis un fichier <strong>CSV</strong>.{' '}
          Colonnes reconnues : <code>nom</code>, <code>téléphone</code>, <code>email</code>,{' '}
          <code>ville</code>, <code>secteur</code>, <code>notes</code>. Max 3 000 lignes.
        </span>
      </div>

      {/* ── Zone de dépôt ── */}
      {!file && !result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center"
          style={{
            borderColor: dragging ? 'var(--primary)' : 'var(--border)',
            background: dragging ? 'var(--primary)/5' : 'var(--secondary, #1e293b)',
          }}
        >
          <Upload
            size={32}
            strokeWidth={1.5}
            style={{ color: dragging ? 'var(--primary)' : 'var(--muted-foreground)' }}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Glisser-déposer votre fichier CSV ici
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ou cliquer pour sélectionner
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
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
              <span className="text-sm font-semibold text-foreground truncate max-w-[220px]">{file.name}</span>
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
                      <td className="px-3 py-2 text-foreground font-medium truncate max-w-[120px]">{p.name || '—'}</td>
                      <td className="px-3 py-2 text-foreground truncate max-w-[100px]">{p.phone || '—'}</td>
                      <td className="px-3 py-2 text-foreground truncate max-w-[140px]">{p.email || '—'}</td>
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
              {importing
                ? <><Loader2 size={13} className="animate-spin" /> Importation…</>
                : <><Upload size={13} /> Importer les prospects</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Résultat ── */}
      {result && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 mt-2">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-400">
              {result.count} prospect{result.count > 1 ? 's' : ''} importé{result.count > 1 ? 's' : ''} avec succès
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
