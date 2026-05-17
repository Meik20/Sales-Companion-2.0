export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/pipeline/export
 *
 * Generates an Excel-compatible CSV with pipeline performance data
 * for all (or a specific) team member, optionally filtered by date range.
 *
 * Query params:
 *  - memberId?: string   — filter to a specific member UID (omit = all members)
 *  - from?:    string   — ISO date start  (e.g. "2026-01-01")
 *  - to?:      string   — ISO date end    (e.g. "2026-05-31")
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId') || null
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : null
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')! + 'T23:59:59Z') : null

    // ── Fetch team members to resolve missing names ──────────────────────
    const membersSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', managerUid)
      .get()

    const membersMap = new Map<string, { name: string; accessId: string }>()
    membersSnap.docs.forEach((doc) => {
      const d = doc.data()
      membersMap.set(doc.id, {
        name: d.name || d.email || doc.id,
        accessId: d.teamAccessId || ''
      })
    })

    // ── Fetch all pipeline items under this manager ──────────────────────
    const teamSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .get()

    const ownSnap = await adminDb.collection('pipeline').where('userId', '==', managerUid).get()

    const seen = new Set<string>()
    type RawItem = {
      id: string
      companyName?: string
      status?: string
      assignedTo?: string
      memberName?: string
      memberAccessId?: string
      companyCity?: string
      companySector?: string
      companyPhone?: string
      companyEmail?: string
      note?: string
      notes?: string
      nextFollowUp?: string
      createdAt?: string | null
      updatedAt?: string | null
    }
    const allItems: RawItem[] = []

    for (const snap of [teamSnap, ownSnap]) {
      snap.docs.forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          const d = doc.data()
          allItems.push({
            id: doc.id,
            companyName: d.companyName,
            status: d.status,
            assignedTo: d.assignedTo,
            memberName: d.memberName,
            memberAccessId: d.memberAccessId,
            companyCity: d.companyCity,
            companySector: d.companySector,
            companyPhone: d.companyPhone,
            companyEmail: d.companyEmail,
            note: d.note,
            notes: d.notes,
            nextFollowUp: d.nextFollowUp,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
            updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? null
          })
        }
      })
    }

    // ── Filters ──────────────────────────────────────────────────────────
    let filtered = allItems

    if (memberId) {
      filtered = filtered.filter((i) => i.assignedTo === memberId)
    }

    if (fromDate) {
      filtered = filtered.filter((i) => {
        if (!i.createdAt) return false
        return new Date(i.createdAt) >= fromDate
      })
    }

    if (toDate) {
      filtered = filtered.filter((i) => {
        if (!i.createdAt) return false
        return new Date(i.createdAt) <= toDate
      })
    }

    // ── Normalize status labels ───────────────────────────────────────────
    const normalizeStatus = (s?: string) => {
      if (!s) return ''
      if (['prospection', 'prospect'].includes(s)) return 'Prospection'
      if (['negociation', 'negotiation'].includes(s)) return 'Négociation'
      if (['conclue', 'conclusion'].includes(s)) return 'Conclue'
      return s
    }

    // ── Build per-member summary ─────────────────────────────────────────
    type MemberStat = {
      memberName: string
      memberAccessId: string
      total: number
      prospection: number
      negociation: number
      conclue: number
      conversionRate: string
    }

    const byMember: Record<string, MemberStat> = {}
    for (const item of filtered) {
      const uid = item.assignedTo ?? '__manager__'

      let name = item.memberName
      let id = item.memberAccessId

      if (!name || !id) {
        if (uid !== '__manager__' && uid !== managerUid) {
          const m = membersMap.get(uid)
          name = name || m?.name || uid
          id = id || m?.accessId || ''
        } else {
          name = 'Manager'
          id = ''
        }
      }

      if (!byMember[uid]) {
        byMember[uid] = {
          memberName: name,
          memberAccessId: id,
          total: 0,
          prospection: 0,
          negociation: 0,
          conclue: 0,
          conversionRate: '0%'
        }
      }

      const stat = byMember[uid]
      stat.total++

      const ns = normalizeStatus(item.status)
      if (ns === 'Prospection') stat.prospection++
      else if (ns === 'Négociation') stat.negociation++
      else if (ns === 'Conclue') stat.conclue++
    }

    // Compute conversion rate (conclue / total)
    for (const stat of Object.values(byMember)) {
      stat.conversionRate =
        stat.total > 0 ? `${Math.round((stat.conclue / stat.total) * 100)}%` : '0%'
    }

    // ── Build CSV ────────────────────────────────────────────────────────
    // Sheet 1 — Summary per member
    const summaryHeader = [
      'Membre',
      'Access ID',
      'Total prospects',
      'Prospection',
      'Négociation',
      'Conclue',
      'Taux conversion'
    ]

    const summaryRows = Object.values(byMember).map((s) => [
      s.memberName,
      s.memberAccessId,
      String(s.total),
      String(s.prospection),
      String(s.negociation),
      String(s.conclue),
      s.conversionRate
    ])

    // Sheet 2 — Detailed items
    const detailHeader = [
      'Entreprise',
      'Statut',
      'Membre',
      'Access ID',
      'Ville',
      'Secteur',
      'Téléphone',
      'Email',
      'Note',
      'Prochain suivi',
      'Date ajout'
    ]

    const detailRows = filtered.map((i) => {
      const uid = i.assignedTo ?? '__manager__'
      let name = i.memberName
      let id = i.memberAccessId

      if (!name || !id) {
        if (uid !== '__manager__' && uid !== managerUid) {
          const m = membersMap.get(uid)
          name = name || m?.name || uid
          id = id || m?.accessId || ''
        } else {
          name = 'Manager'
          id = ''
        }
      }

      return [
        i.companyName ?? '',
        normalizeStatus(i.status),
        name,
        id,
        i.companyCity ?? '',
        i.companySector ?? '',
        i.companyPhone ?? '',
        i.companyEmail ?? '',
        i.notes ?? i.note ?? '',
        i.nextFollowUp ?? '',
        i.createdAt ? new Date(i.createdAt).toLocaleDateString('fr-FR') : ''
      ]
    })

    // Escape a single CSV cell (wraps in quotes if needed)
    const esc = (v: string) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`
      }
      return v
    }

    const rowToCsv = (cells: string[]) => cells.map(esc).join(',')

    const lines: string[] = [
      // Separator hint for Excel (French locale)
      'sep=,',
      '',
      '=== SYNTHÈSE PAR MEMBRE ===',
      rowToCsv(summaryHeader),
      ...summaryRows.map(rowToCsv),
      '',
      '=== DÉTAIL DES PROSPECTS ===',
      rowToCsv(detailHeader),
      ...detailRows.map(rowToCsv)
    ]

    // Force unaccented English characters for maximum compatibility
    const rawCsvString = lines.join('\r\n')
    const unaccentedCsvString = rawCsvString.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Build a proper UTF-8 BOM + content buffer
    const bomBytes = Buffer.from([0xef, 0xbb, 0xbf]) // UTF-8 BOM
    const contentBytes = Buffer.from(unaccentedCsvString, 'utf-8') // CSV body
    const csvBuffer = Buffer.concat([bomBytes, contentBytes])

    // filename with date range
    const today = new Date().toISOString().slice(0, 10)
    const filename = `pipeline_performances_${today}.csv`

    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[pipeline/export GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
