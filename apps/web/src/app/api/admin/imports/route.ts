import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

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
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Imports GET error:', error)
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
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez .csv, .xlsx ou .xls' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── Parse the file ──
    let rows: Record<string, string>[] = []

    if (ext === 'csv') {
      const text = buffer.toString('utf-8')
      rows = parseCSV(text)
    } else {
      // Excel support requires the xlsx package — not currently installed
      // Guide the user to convert their file to CSV
      return NextResponse.json({
        error:
          'Le format Excel (.xlsx/.xls) n\'est pas encore supporté directement. ' +
          'Ouvrez votre fichier dans Excel ou Google Sheets, puis enregistrez-le au format CSV (UTF-8) et réessayez.',
      }, { status: 415 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Le fichier est vide ou non lisible' }, { status: 400 })
    }

    // ── Column mapping ──
    const COLUMN_MAP: Record<string, string> = {
      'RAISON_SOCIALE': 'raisonSociale',
      'RAISON SOCIALE': 'raisonSociale',
      'NOM': 'raisonSociale',
      'NIU': 'niu',
      'SIGLE': 'sigle',
      'ACTIVITE_PRINCIPALE': 'sector',
      'ACTIVITE PRINCIPALE': 'sector',
      'SECTEUR': 'sector',
      'CENTRE_DE_RATTACHEMENT': 'region',
      'CENTRE DE RATTACHEMENT': 'region',
      'REGION': 'region',
      'VILLE': 'city',
      'TELEPHONE': 'telephone',
      'TEL': 'telephone',
      'EMAIL': 'email',
      'DIRIGEANT': 'dirigeant',
      'RCCM': 'rccm',
    }

    const detectedColumns: Record<string, string> = {}
    const headers = Object.keys(rows[0] ?? {})
    headers.forEach((h) => {
      const mapped = COLUMN_MAP[h.toUpperCase().trim()]
      if (mapped) detectedColumns[h] = mapped
    })

    // ── Import rows into Firestore ──
    let imported = 0, updated = 0, skipped = 0, errors = 0
    const batch = adminDb.batch()
    let batchCount = 0

    for (const row of rows) {
      try {
        const company: Record<string, unknown> = {}
        headers.forEach((h) => {
          const mapped = COLUMN_MAP[h.toUpperCase().trim()]
          if (mapped && row[h]) company[mapped] = row[h].trim()
        })

        if (!company.raisonSociale) { skipped++; continue }

        // Use NIU as document ID for deduplication, or generate one
        const docId = (company.niu as string) || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const ref = adminDb.collection('companies').doc(docId)

        const existing = await ref.get()
        if (existing.exists) {
          batch.update(ref, { ...company, updatedAt: new Date() })
          updated++
        } else {
          batch.set(ref, { ...company, createdAt: new Date(), importedBy: decoded.uid })
          imported++
        }

        batchCount++
        // Commit every 400 writes (Firestore batch limit is 500)
        if (batchCount >= 400) {
          await batch.commit()
          batchCount = 0
        }
      } catch {
        errors++
      }
    }

    if (batchCount > 0) {
      await batch.commit()
    }

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
      columnsDetected: detectedColumns,
    })

    return NextResponse.json({
      total: rows.length,
      imported,
      updated,
      skipped,
      errors,
      columns_detected: detectedColumns,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Import POST error:', error)
    return NextResponse.json({ error: `Erreur d'import : ${msg}` }, { status: 500 })
  }
}

/* ── CSV parser (no external dependency) ── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0]!)
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]!)
    if (values.every((v) => !v.trim())) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
