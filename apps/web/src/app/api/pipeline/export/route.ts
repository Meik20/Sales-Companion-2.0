export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/pipeline/export
 *
 * Génère un fichier Excel (.xlsx) multi-onglets avec :
 *  - Onglet 1 : Synthèse par membre (Volume, Valeur, Objectifs, Taux de réalisation, Objectif Global)
 *  - Onglet 2 : Détail des prospects
 *
 * Query params:
 *  - memberId?: string   — filtre sur un membre précis
 *  - from?:    string    — ISO date début  (ex. "2026-01-01")
 *  - to?:      string    — ISO date fin    (ex. "2026-05-31")
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

    // ── Fetch team members ──────────────────────────────────────────────────
    const membersSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', managerUid)
      .get()

    // Un Access ID valide contient toujours '@' (ex: kevinmbaye@myimmo)
    const isValidAccessId = (v?: string | null) => !!(v && v.includes('@'))

    // Construire la map initiale depuis users (champ : accessId)
    const membersMap = new Map<string, { name: string; accessId: string }>()
    membersSnap.docs.forEach((doc) => {
      const d = doc.data()
      membersMap.set(doc.id, {
        name: d.name || d.email || doc.id,
        // N'accepter que les accessId au bon format ; ignorer les UIDs Firebase bruts
        accessId: isValidAccessId(d.accessId) ? d.accessId : ''
      })
    })

    // Fallback : pour TOUS les membres (pas seulement ceux sans accessId),
    // chercher dans team_accesses si l'accessId actuel est vide ou mal formé
    try {
      const accessesSnap = await adminDb
        .collection('team_accesses')
        .where('managerUid', '==', managerUid)
        .get()

      // Index par firebaseUid ET par email pour maximiser les correspondances
      accessesSnap.docs.forEach((doc) => {
        const ad = doc.data()
        const validAccessId = isValidAccessId(ad.accessId)
          ? ad.accessId
          : isValidAccessId(doc.id)
            ? doc.id
            : null

        if (!validAccessId) return

        // Lookup par firebaseUid
        const fUid: string = ad.firebaseUid ?? ''
        if (fUid && membersMap.has(fUid) && !membersMap.get(fUid)!.accessId) {
          membersMap.get(fUid)!.accessId = validAccessId
        }

        // Lookup par email (second attempt)
        const email: string = ad.email ?? ''
        if (email) {
          membersMap.forEach((val, uid) => {
            if (!val.accessId) {
              const memberDoc = membersSnap.docs.find((d) => d.id === uid)
              if (memberDoc?.data()?.email === email) {
                val.accessId = validAccessId
              }
            }
          })
        }
      })
    } catch { /* ignore */ }

    // ── Formatage de la période brute en libellé lisible ───────────────────
    const MONTHS_FR = [
      'Janvier','Février','Mars','Avril','Mai','Juin',
      'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
    ]
    function formatPeriod(raw: string | null, from: Date | null, to: Date | null): string {
      if (raw) {
        // "2026-10" → "Octobre 2026"
        const monthMatch = raw.match(/^(\d{4})-(\d{2})$/)
        if (monthMatch) {
          const [, year, month] = monthMatch
          const m = parseInt(month!, 10)
          return `${MONTHS_FR[m - 1] ?? month} ${year}`
        }
        // "2026-Q1" → "T1 2026"
        const quarterMatch = raw.match(/^(\d{4})-Q(\d)$/i)
        if (quarterMatch) {
          const [, year, q] = quarterMatch
          return `T${q} ${year}`
        }
        // "2026-S1" → "S1 2026"
        const semMatch = raw.match(/^(\d{4})-S(\d)$/i)
        if (semMatch) {
          const [, year, s] = semMatch
          return `Semestre ${s} ${year}`
        }
        // Retourner tel quel si format inconnu
        return raw
      }
      // Fallback : construire depuis les dates de filtre
      if (from && to) {
        const f = from.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        const t = to.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        return f === t ? f : `${f} – ${t}`
      }
      if (from) return `Depuis ${from.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
      if (to) return `Jusqu'à ${to.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
      // Aucune période : utiliser le mois courant
      const now = new Date()
      return `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`
    }

    // ── Fetch objectifs par membre ─────────────────────────────────────────
    const targetsSnap = await adminDb
      .collection('teamTargets')
      .where('managerUid', '==', managerUid)
      .get()

    type MemberTarget = {
      targetVolume: number | null
      targetValue: number | null
      period: string | null
    }
    const targetsMap = new Map<string, MemberTarget>()
    targetsSnap.docs.forEach((doc) => {
      const d = doc.data()
      targetsMap.set(d.memberId as string, {
        targetVolume: typeof d.targetVolume === 'number' ? d.targetVolume : null,
        targetValue: typeof d.targetValue === 'number' ? d.targetValue : null,
        period: d.period ?? null
      })
    })

    // ── Fetch pipeline items ────────────────────────────────────────────────
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
      amount?: number
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
            amount: typeof d.amount === 'number' ? d.amount : undefined,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
            updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? null
          })
        }
      })
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    let filtered = allItems

    if (memberId) filtered = filtered.filter((i) => i.assignedTo === memberId)

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

    // ── Normalize status labels ───────────────────────────────────────────────
    const normalizeStatus = (s?: string) => {
      if (!s) return ''
      if (['prospection', 'prospect'].includes(s)) return 'Prospection'
      if (['negociation', 'negotiation'].includes(s)) return 'Négociation'
      if (['conclue', 'conclusion'].includes(s)) return 'Conclue'
      return s
    }

    // ── Build per-member summary ──────────────────────────────────────────────
    type MemberStat = {
      uid: string
      memberName: string
      memberAccessId: string
      total: number
      prospection: number
      negociation: number
      conclue: number
      conversionRate: number
      revenue: number
      targetVolume: number | null
      targetValue: number | null
      period: string | null
    }

    const byMember: Record<string, MemberStat> = {}

    for (const item of filtered) {
      const uid = item.assignedTo ?? '__manager__'

      let name = item.memberName
      // Prioriser memberAccessId du doc pipeline s'il a le bon format (contient '@')
      // Sinon, chercher dans membersMap
      let id = (item.memberAccessId && item.memberAccessId.includes('@'))
        ? item.memberAccessId
        : ''

      if (!name || !id) {
        if (uid !== '__manager__' && uid !== managerUid) {
          const m = membersMap.get(uid)
          name = name || m?.name || uid
          if (!id) id = m?.accessId || ''
        } else {
          name = 'Manager'
          id = ''
        }
      }

      if (!byMember[uid]) {
        const tgt = uid !== '__manager__' ? targetsMap.get(uid) : null
        byMember[uid] = {
          uid,
          memberName: name ?? '',
          memberAccessId: id ?? '',
          total: 0,
          prospection: 0,
          negociation: 0,
          conclue: 0,
          conversionRate: 0,
          revenue: 0,
          targetVolume: tgt?.targetVolume ?? null,
          targetValue: tgt?.targetValue ?? null,
          period: formatPeriod(tgt?.period ?? null, fromDate, toDate)
        }
      }

      const stat = byMember[uid]
      stat.total++

      const itemAmount = item.amount ?? 0
      const ns = normalizeStatus(item.status)
      if (ns === 'Prospection') stat.prospection++
      else if (ns === 'Négociation') stat.negociation++
      else if (ns === 'Conclue') {
        stat.conclue++
        stat.revenue += itemAmount
      }
    }

    // Compute conversion rate (conclue / total)
    for (const stat of Object.values(byMember)) {
      stat.conversionRate = stat.total > 0 ? Math.round((stat.conclue / stat.total) * 100) : 0
    }

    // ── Objectif Global du pipeline (tous membres) ────────────────────────────
    let globalTargetVolume: number | null = null
    let globalTargetValue: number | null = null
    targetsMap.forEach((t) => {
      if (t.targetVolume != null) globalTargetVolume = (globalTargetVolume ?? 0) + t.targetVolume
      if (t.targetValue != null) globalTargetValue = (globalTargetValue ?? 0) + t.targetValue
    })

    const totalRealizedVolume = Object.values(byMember).reduce((acc, s) => acc + s.conclue, 0)
    const totalRealizedValue = Object.values(byMember).reduce((acc, s) => acc + s.revenue, 0)

    // ── Excel generation ──────────────────────────────────────────────────────
    // Dynamic import to avoid issues in edge/serverless
    const ExcelJS = (await import('exceljs')).default

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sales Companion'
    workbook.created = new Date()

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  ONGLET 1 — SYNTHÈSE PAR MEMBRE                                      ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    const summarySheet = workbook.addWorksheet('Synthèse par membre', {
      pageSetup: { fitToPage: true, orientation: 'landscape' }
    })

    // ── Palette ───────────────────────────────────────────────────────────────
    const COLOR_HEADER_BG = '1A3A5C'  // bleu marine
    const COLOR_HEADER_FG = 'FFFFFF'
    const COLOR_SUBHEADER  = '2E6DA4'
    const COLOR_GLOBAL_BG  = '0D2137'  // bleu très sombre pour la ligne globale
    const COLOR_GLOBAL_FG  = 'FFD700'  // or pour ressortir
    const COLOR_ALT_ROW    = 'EBF5FB'  // bleu clair alternance
    const COLOR_GREEN      = '27AE60'
    const COLOR_ORANGE     = 'E67E22'
    const COLOR_RED        = 'E74C3C'

    const headerFont = { name: 'Calibri', bold: true, size: 11, color: { argb: COLOR_HEADER_FG } }
    const cellFont   = { name: 'Calibri', size: 10 }
    const boldFont   = { name: 'Calibri', bold: true, size: 10 }
    const globalFont = { name: 'Calibri', bold: true, size: 11, color: { argb: COLOR_GLOBAL_FG } }

    // Titre du rapport
    summarySheet.mergeCells('A1:N1')
    const titleCell = summarySheet.getCell('A1')
    titleCell.value = '📊 RAPPORT DE PERFORMANCE — PIPELINE COMMERCIAL'
    titleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: COLOR_HEADER_FG } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    summarySheet.getRow(1).height = 32

    // Sous-titre avec date
    summarySheet.mergeCells('A2:N2')
    const subTitleCell = summarySheet.getCell('A2')
    const today = new Date()
    subTitleCell.value = `Exporté le ${today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    subTitleCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'AAAAAA' } }
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D1B2A' } }
    subTitleCell.alignment = { horizontal: 'center' }
    summarySheet.getRow(2).height = 20

    // Ligne vide
    summarySheet.getRow(3).height = 8

    // Colonnes header (ligne 4)
    const summaryHeaders = [
      'Membre',
      'Access ID',
      'Période',
      'Total Prospects',
      'Prospection',
      'Négociation',
      'Conclue (Vol.)',
      'Taux Conversion',
      'CA Réalisé (FCFA)',
      'Obj. Volume',
      '% Réal. Volume',
      'Obj. Valeur (FCFA)',
      '% Réal. Valeur',
      'R/O'
    ]

    const headerRow = summarySheet.getRow(4)
    summaryHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = headerFont
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        bottom: { style: 'medium', color: { argb: COLOR_SUBHEADER } }
      }
    })
    headerRow.height = 40

    // Données par membre
    const statsArray = Object.values(byMember)
    statsArray.forEach((stat, rowIdx) => {
      const row = summarySheet.getRow(5 + rowIdx)
      const isAlt = rowIdx % 2 === 1
      const bgColor = isAlt ? COLOR_ALT_ROW : 'FFFFFF'

      const pctVolume =
        stat.targetVolume != null && stat.targetVolume > 0
          ? Math.round((stat.conclue / stat.targetVolume) * 100)
          : null

      const pctValue =
        stat.targetValue != null && stat.targetValue > 0
          ? Math.round((stat.revenue / stat.targetValue) * 100)
          : null

      // R/O = (% Réal. Volume + % Réal. Valeur) / 2
      // Si une seule des deux est disponible, on l'utilise seule
      const roValue: number | null = (() => {
        if (pctVolume != null && pctValue != null) return (pctVolume + pctValue) / 2 / 100
        if (pctVolume != null) return pctVolume / 100
        if (pctValue != null) return pctValue / 100
        return null
      })()

      const cells: (string | number | null)[] = [
        stat.memberName,
        stat.memberAccessId || '—',
        stat.period || formatPeriod(null, fromDate, toDate),
        stat.total,
        stat.prospection,
        stat.negociation,
        stat.conclue,
        stat.conversionRate / 100,   // formatté en % par Excel
        stat.revenue,
        stat.targetVolume,
        pctVolume != null ? pctVolume / 100 : null,
        stat.targetValue,
        pctValue != null ? pctValue / 100 : null,
        roValue
      ]

      cells.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1)
        cell.value = val as number | string | null
        cell.font = cellFont
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'left' : 'center' }

        // Formatage numérique
        if (colIdx === 7) cell.numFmt = '0%'           // Taux conversion
        if (colIdx === 8) cell.numFmt = '#,##0'         // CA Réalisé
        if (colIdx === 10) cell.numFmt = '0%'           // % Volume
        if (colIdx === 11) cell.numFmt = '#,##0'        // Obj. Valeur
        if (colIdx === 12) cell.numFmt = '0%'           // % Valeur
        if (colIdx === 13) cell.numFmt = '0%'           // R/O

        // Colorisation conditionnelle : cols 10, 12 et 13
        if ((colIdx === 10 || colIdx === 12 || colIdx === 13) && val != null) {
          const pct = (val as number) * 100
          cell.font = {
            ...cellFont,
            bold: colIdx === 13,   // R/O en gras pour le mettre en avant
            size: colIdx === 13 ? 11 : 10,
            color: {
              argb: pct >= 100 ? COLOR_GREEN : pct >= 75 ? COLOR_ORANGE : COLOR_RED
            }
          }
        }

        // Col R/O — fond légèrement différencié
        if (colIdx === 13) {
          if (val == null) {
            cell.value = '—'
            cell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: '999999' } }
          }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'DFF0EA' : 'EAF7F2' } }
        }
      })

      row.height = 22
    })

    // ── Ligne TOTAL ──────────────────────────────────────────────────────────
    const totalRowIdx = 5 + statsArray.length
    const totalRow = summarySheet.getRow(totalRowIdx)
    const totalConclue = statsArray.reduce((a, s) => a + s.conclue, 0)
    const totalRevenue = statsArray.reduce((a, s) => a + s.revenue, 0)
    const totalProspects = statsArray.reduce((a, s) => a + s.total, 0)
    const globalPctVolume =
      globalTargetVolume != null && globalTargetVolume > 0
        ? totalRealizedVolume / globalTargetVolume
        : null
    const globalPctValue =
      globalTargetValue != null && globalTargetValue > 0
        ? totalRealizedValue / globalTargetValue
        : null

    // R/O global = (globalPctVolume + globalPctValue) / 2
    const globalRO: number | null = (() => {
      if (globalPctVolume != null && globalPctValue != null) return (globalPctVolume + globalPctValue) / 2
      if (globalPctVolume != null) return globalPctVolume
      if (globalPctValue != null) return globalPctValue
      return null
    })()

    const totalLabel = memberId ? 'TOTAL' : 'TOTAL ÉQUIPE'

    const totalCells: (string | number | null)[] = [
      totalLabel,
      '',
      '',
      totalProspects,
      statsArray.reduce((a, s) => a + s.prospection, 0),
      statsArray.reduce((a, s) => a + s.negociation, 0),
      totalConclue,
      totalProspects > 0 ? totalConclue / totalProspects : null,
      totalRevenue,
      globalTargetVolume,
      globalPctVolume,
      globalTargetValue,
      globalPctValue,
      globalRO
    ]

    totalCells.forEach((val, colIdx) => {
      const cell = totalRow.getCell(colIdx + 1)
      cell.value = val as number | string | null
      cell.font = globalFont
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GLOBAL_BG } }
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'left' : 'center' }
      if (colIdx === 7) cell.numFmt = '0%'
      if (colIdx === 8) cell.numFmt = '#,##0'
      if (colIdx === 10) cell.numFmt = '0%'
      if (colIdx === 11) cell.numFmt = '#,##0'
      if (colIdx === 12) cell.numFmt = '0%'
      if (colIdx === 13) {
        cell.numFmt = '0%'
        if (val == null) {
          cell.value = '—'
          cell.font = { name: 'Calibri', italic: true, size: 11, color: { argb: '999999' } }
        }
      }
    })
    totalRow.height = 26

    // ── Largeurs colonnes ────────────────────────────────────────────────────
    summarySheet.columns = [
      { width: 22 },   // Membre
      { width: 14 },   // Access ID
      { width: 12 },   // Période
      { width: 14 },   // Total prospects
      { width: 13 },   // Prospection
      { width: 13 },   // Négociation
      { width: 13 },   // Conclue Vol.
      { width: 15 },   // Taux conversion
      { width: 18 },   // CA Réalisé
      { width: 13 },   // Obj. Volume
      { width: 15 },   // % Réal. Vol
      { width: 18 },   // Obj. Valeur
      { width: 15 },   // % Réal. Val
      { width: 26 }    // Obj. Global (R/O)
    ]

    // Freeze headers
    summarySheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }]

    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  ONGLET 2 — DÉTAIL DES PROSPECTS                                     ║
    // ╚══════════════════════════════════════════════════════════════════════╝
    const detailSheet = workbook.addWorksheet('Détail des prospects', {
      pageSetup: { fitToPage: true, orientation: 'landscape' }
    })

    const detailHeaders = [
      'Entreprise',
      'Statut',
      'Montant (FCFA)',
      'Membre',
      'Access ID',
      'Ville',
      'Secteur',
      'Téléphone',
      'Email',
      'Note',
      'Prochain suivi',
      'Date d\'ajout'
    ]

    // Titre
    detailSheet.mergeCells(`A1:${String.fromCharCode(64 + detailHeaders.length)}1`)
    const detailTitleCell = detailSheet.getCell('A1')
    detailTitleCell.value = '📋 DÉTAIL DES PROSPECTS'
    detailTitleCell.font = { name: 'Calibri', bold: true, size: 13, color: { argb: COLOR_HEADER_FG } }
    detailTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    detailTitleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    detailSheet.getRow(1).height = 28

    // Headers ligne 2
    const detailHeaderRow = detailSheet.getRow(2)
    detailHeaders.forEach((h, i) => {
      const cell = detailHeaderRow.getCell(i + 1)
      cell.value = h
      cell.font = headerFont
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        bottom: { style: 'medium', color: { argb: '1A3A5C' } }
      }
    })
    detailHeaderRow.height = 30

    // Rows
    filtered.forEach((item, rowIdx) => {
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

      const row = detailSheet.getRow(3 + rowIdx)
      const isAlt = rowIdx % 2 === 1
      const bgColor = isAlt ? 'EBF5FB' : 'FFFFFF'

      const statusNorm = normalizeStatus(item.status)
      const statusColor =
        statusNorm === 'Conclue' ? 'D5F5E3' : statusNorm === 'Négociation' ? 'FEF9E7' : 'EBF5FB'

      const rowData = [
        item.companyName ?? '',
        statusNorm,
        item.amount ?? '',
        name ?? '',
        id ?? '',
        item.companyCity ?? '',
        item.companySector ?? '',
        item.companyPhone ?? '',
        item.companyEmail ?? '',
        item.notes ?? item.note ?? '',
        item.nextFollowUp ?? '',
        item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : ''
      ]

      rowData.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1)
        cell.value = val as string | number
        cell.font = cellFont
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colIdx === 1 ? statusColor : bgColor }
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: colIdx === 2 ? 'right' : 'left',
          wrapText: colIdx === 9 // notes
        }
        if (colIdx === 2 && typeof val === 'number') cell.numFmt = '#,##0'
      })

      row.height = 20
    })

    detailSheet.columns = [
      { width: 24 },  // Entreprise
      { width: 14 },  // Statut
      { width: 16 },  // Montant
      { width: 20 },  // Membre
      { width: 13 },  // Access ID
      { width: 16 },  // Ville
      { width: 18 },  // Secteur
      { width: 16 },  // Téléphone
      { width: 24 },  // Email
      { width: 30 },  // Note
      { width: 14 },  // Prochain suivi
      { width: 14 }   // Date ajout
    ]

    detailSheet.views = [{ state: 'frozen', ySplit: 2, xSplit: 1 }]

    // ── Sérialiser en Buffer ───────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer()
    const today2 = new Date().toISOString().slice(0, 10)
    const filename = `pipeline_performances_${today2}.xlsx`

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[pipeline/export GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
