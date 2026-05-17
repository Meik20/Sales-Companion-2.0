export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import ExcelJS from 'exceljs'

async function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1]
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const doc = await adminDb.collection('users').doc(decoded.uid).get()
  if (doc.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

/* ── GET /api/admin/imports — history ── */
export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request)

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20', 10)

    const totalSnap = await adminDb.collection('imports').count().get()
    const total = totalSnap.data().count

    const snap = await adminDb
      .collection('imports')
      .orderBy('importedAt', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .get()

    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ items, total, page, pageSize })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Imports GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/* ── DELETE /api/admin/imports — clear history ── */
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdmin(request)

    const batchSize = 500
    while (true) {
      const snapshot = await adminDb.collection('imports').limit(batchSize).get()
      if (snapshot.empty) break

      const batch = adminDb.batch()
      snapshot.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Imports DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/* ── POST /api/admin/imports — upload + parse CSV/Excel and save to Firestore ── */
export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext) {
      return NextResponse.json({ error: 'Fichier sans extension' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── Parse the file ──
    let rows: Record<string, string>[] = []

    if (ext === 'csv') {
      const text = buffer.toString('utf-8')
      rows = parseCSV(text)
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = await parseExcel(buffer)
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Le fichier est vide ou non lisible' }, { status: 400 })
    }

    if (rows.length > 3000) {
      return NextResponse.json(
        { error: `${rows.length} lignes détectées. Maximum 3000 par lot.` },
        { status: 400 }
      )
    }

    // ── Column mapping (normalisation vers champs Firestore) ──
    const COLUMN_MAP: Record<string, string> = {
      RAISON_SOCIALE: 'raisonSociale',
      RAISONSOCIALE: 'raisonSociale',
      NOM_OU_RAISON_SOCIALE: 'raisonSociale',
      NOM_RAISON_SOCIALE: 'raisonSociale',
      NOM_RAISON_SOC: 'raisonSociale',
      NOM: 'raisonSociale',
      DENOMINATION: 'raisonSociale',
      COMPANY_NAME: 'raisonSociale',
      COMPANY: 'raisonSociale',
      NIU: 'niu',
      N_I_U: 'niu',
      N_U_I: 'niu',
      NUI: 'niu',
      IDENTIFIANT_FISCAL: 'niu',
      SIGLE: 'sigle',
      ABBREVIATION: 'sigle',
      ACTIVITE_PRINCIPALE: 'sector',
      ACTIVITEPRINCIPALE: 'sector',
      ACTIVITE: 'sector',
      SECTEUR: 'sector',
      SECTEUR_DACTIVITE: 'sector',
      SECTEUR_D_ACTIVITE: 'sector',
      CENTRE_DE_RATTACHEMENT: 'region',
      CENTRE_RATTACHEMENT: 'region',
      REGION: 'region',
      VILLE: 'city',
      CITY: 'city',
      TELEPHONE: 'telephone',
      TEL: 'telephone',
      PHONE: 'telephone',
      MOBILE: 'telephone',
      EMAIL: 'email',
      MAIL: 'email',
      DIRIGEANT: 'dirigeant',
      RESPONSABLE: 'dirigeant',
      MANAGER: 'dirigeant',
      RCCM: 'rccm',
      N_RCCM: 'rccm',
      ADRESSE: 'adresse',
      ADDRESS: 'adresse',
      BP: 'bp',
      BOITE_POSTALE: 'bp',
      PO_BOX: 'bp',
      CAPITAL: 'capital',
      DATE_CREATION: 'dateCreation',
      FORME_JURIDIQUE: 'formeJuridique',
      REGIME: 'regime',
      REGIME_FISCAL: 'regime'
    }

    const headers = Object.keys(rows[0] ?? {})
    const detectedColumns: Record<string, string> = {}
    headers.forEach((h) => {
      const normalized = normalizeHeader(h)
      const mapped = COLUMN_MAP[normalized]
      if (mapped) detectedColumns[h] = mapped
    })

    // ── Import rows into Firestore (multi-batch, max 499 ops each) ──
    let imported = 0,
      updated = 0,
      skipped = 0,
      errors = 0
    let currentBatch = adminDb.batch()
    let batchCount = 0

    const flushBatch = async () => {
      if (batchCount > 0) {
        await currentBatch.commit()
        currentBatch = adminDb.batch()
        batchCount = 0
      }
    }

    for (const row of rows) {
      try {
        // Build company document with ALL columns preserved
        const company: Record<string, unknown> = {}

        // 1. Map known columns to canonical field names
        headers.forEach((h) => {
          const normalized = normalizeHeader(h)
          const mapped = COLUMN_MAP[normalized]
          const val = (row[h] ?? '').trim()
          if (mapped && val) company[mapped] = val
        })

        // 2. Preserve ALL remaining columns as-is (sanitized key)
        headers.forEach((h) => {
          const sanitizedKey = h
            .trim()
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .toLowerCase()
          if (sanitizedKey && !Object.values(COLUMN_MAP).includes(sanitizedKey as string)) {
            const val = (row[h] ?? '').trim()
            if (val && !company[sanitizedKey]) company[sanitizedKey] = val
          }
        })

        // raisonSociale is mandatory
        if (!company.raisonSociale) {
          skipped++
          continue
        }

        // Use NIU as document ID for deduplication, or generate a stable one from name
        const niu = (company.niu as string)?.replace(/\s+/g, '').toUpperCase()
        const nameSlug = ((company.raisonSociale as string) || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_')
        const docId = niu || `name_${nameSlug}`
        const ref = adminDb.collection('companies').doc(docId)

        const existing = await ref.get()
        if (existing.exists) {
          currentBatch.update(ref, { ...company, updatedAt: new Date() })
          updated++
        } else {
          currentBatch.set(ref, { ...company, createdAt: new Date(), importedBy: decoded.uid })
          imported++
        }

        batchCount++
        // Commit every 499 writes (Firestore batch limit is 500)
        if (batchCount >= 499) {
          await flushBatch()
        }
      } catch (rowErr) {
        errors++
        console.error('[Admin Import] Row error:', {
          row: row['raisonSociale'] ?? row['NOM'] ?? '?',
          rowErr
        })
      }
    }

    // Flush remaining writes
    await flushBatch()

    // ── Save import log ──
    await adminDb.collection('imports').add({
      fileName: file.name,
      totalRecords: rows.length,
      successCount: imported + updated,
      errorCount: errors,
      imported,
      updated,
      skipped,
      errors,
      status: 'completed',
      importedBy: decoded.uid,
      importedAt: new Date(),
      columnsDetected: detectedColumns
    })

    console.log('[Admin Import] Successfully imported:', {
      fileName: file.name,
      imported,
      updated,
      skipped,
      errors
    })

    return NextResponse.json({
      total: rows.length,
      imported,
      updated,
      skipped,
      errors,
      columns_detected: detectedColumns
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Import POST error:', error)
    console.error('Import error details:', {
      message: msg,
      errorType: error?.constructor?.name,
      error
    })
    return NextResponse.json({ error: `Erreur d'import : ${msg}` }, { status: 500 })
  }
}

function normalizeHeader(header: string | null | undefined) {
  return String(header ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['"`]/g, '')
    .replace(/[^a-zA-Z0-9 _]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function splitCsvLine(line: string, sep: string = ',') {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (char === sep && !insideQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result.map((cell) => cell.replace(/^"|"$/g, '').trim())
}

/* ── CSV parser (no external dependency) ── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 1) return []

  // Détecter le séparateur : analyser le header pour trouver le plus fréquent
  // Supporter : virgule, point-virgule, tabulation, pipe, tilde
  const headerLine = lines[0]!
  let sep = ','

  // Compter les occurrences de chaque séparateur potentiel
  const separators = [',', ';', '\t', '|', '~']
  let maxCount = 0
  for (const s of separators) {
    const regex = new RegExp(`\\${s}`, 'g')
    const count = (headerLine.match(regex) || []).length
    if (count > maxCount) {
      maxCount = count
      sep = s
    }
  }

  const headers = splitCsvLine(headerLine, sep).map(normalizeHeader)
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]!, sep)
    if (values.every((v) => !v.trim())) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

/* ── Excel parser (using ExcelJS) ── */
async function parseExcel(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as any)

  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: Record<string, string>[] = []
  let headers: string[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row = headers
      const values = row.values as (string | number | undefined)[]
      headers = values.slice(1).map((v) => (v != null ? String(v) : ''))
      return
    }

    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      const cell = row.getCell(i + 1)
      obj[header] = (cell.value != null ? String(cell.value) : '').trim()
    })
    rows.push(obj)
  })

  return rows
}
