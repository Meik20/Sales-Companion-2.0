/**
 * exportDashboardPdf.ts
 * Utilitaire d'exportation PDF exécutive du tableau de bord de segment (Direction Générale / SM).
 * Génère une maquette imprimable vectorielle haute fidélité (A4 portrait) conforme à la charte de marque.
 */

import type { OrgReportResult } from '../hooks/useOrgReport'
import { formatCompactAmount } from '@/lib/formatters'
import { LOSS_REASONS } from '@sales-companion/shared'

export interface ExportPdfOptions {
  data: OrgReportResult
  seniorManagerName?: string | null
  companyName?: string | null
  periodLabel: string
  currency?: string
  lang?: 'fr' | 'en' | string
}

export function exportDashboardPdf({
  data,
  seniorManagerName,
  companyName,
  periodLabel,
  currency = 'XAF',
  lang = 'fr'
}: ExportPdfOptions) {
  const isEn = lang === 'en'
  const now = new Date()
  const formattedDate = now.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const targetVol = data.targets?.targetVolume ?? null
  const realVol = data.targets?.volumeRealized ?? data.globalCounts?.conclue ?? 0
  const volRate = data.targets?.volumeAttainmentRate ?? (targetVol && targetVol > 0 ? Math.round((realVol / targetVol) * 100) : null)

  const targetVal = data.targets?.targetValue ?? null
  const realVal = data.targets?.valueRealized ?? data.totalConcludedAmount ?? 0
  const valRate = data.targets?.valueAttainmentRate ?? (targetVal && targetVal > 0 ? Math.round((realVal / targetVal) * 100) : null)

  const activeCount = (data.globalCounts?.prospection || 0) + (data.globalCounts?.negociation || 0)
  const lostCount = data.globalCounts?.perdue || 0
  const totalConcludedOrLost = realVol + lostCount
  const winRate = totalConcludedOrLost > 0 ? Math.round((realVol / totalConcludedOrLost) * 100) : null

  // Résolution des libellés de motifs d'échec
  const lossReasonsEntries = Object.entries(data.lossReasonsSummary || {})

  const html = `
<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'fr'}">
<head>
  <meta charset="utf-8">
  <title>${isEn ? 'Executive Segment Report' : 'Rapport Exécutif de Bilan'} - ${data.orgCode}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1B7A3E;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-svg {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 3px 0 0 0;
    }
    .meta-box {
      text-align: right;
      font-size: 10.5px;
      color: #475569;
    }
    .meta-pill {
      display: inline-block;
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      margin-top: 4px;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .card-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .card-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
    }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-neutral { background: #e2e8f0; color: #475569; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 9px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="brand">
      <svg class="brand-logo-svg" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.30868945 59.22110435 199.3156565 60.93707796 199.32377625 62.65304565 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.39393171 173.17015282 199.39626591 178.00822924 199.41354179 182.84646225 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.40257205 198.16539178 199.40559649 199.82777486 199.41612244 201.49009705 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C140.08187416 256.81381641 138.36590055 256.82078345 136.64993286 256.8289032 C132.01344825 256.84677063 127.37715356 256.84567825 122.74064493 256.83996081 C118.85917783 256.83685939 114.97774671 256.84297205 111.09628475 256.84899956 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C74.18003921 256.83862091 64.75196458 256.85268979 55.32364285 256.87949413 C47.20610312 256.90170134 39.0886524 256.90827715 30.97108448 256.90241772 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C11.90417847 256.93421589 7.35225991 256.93009682 2.7999382 256.9113636 C1.13758673 256.907699 -0.52479635 256.91072344 -2.18711853 256.92124939 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.51083789 197.58700111 -57.51780494 195.87102751 -57.52592468 194.15505981 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.53388087 176.36430479 -57.53999354 172.48287366 -57.54602104 168.6014117 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.5356424 131.68516616 -57.54971128 122.25709154 -57.57651561 112.8287698 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.59608015 83.63795265 -57.59841435 78.79987623 -57.61569023 73.96164322 C-57.63123737 69.40930542 -57.62711831 64.85738686 -57.60838509 60.30506516 C-57.60472048 58.64271368 -57.60774492 56.98033061 -57.61827087 55.31800842 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="#1B7A3E" transform="translate(57.10107421875,-0.404052734375)" />
        <path d="M102 70 C102 62 108 56 116 56 C124 56 130 62 130 70 C130 84 102 96 102 110 L130 110" stroke="#FFFFFF" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div>
        <h1 class="brand-title">SALES COMPANION 2.0</h1>
        <p class="brand-subtitle">${isEn ? 'EXECUTIVE SEGMENT PERFORMANCE REPORT' : 'RAPPORT DE BILAN EXÉCUTIF — DIRECTION GÉNÉRALE'}</p>
        <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">
          ${companyName ? `<strong>${companyName}</strong> · ` : ''}Segment : <strong>${data.orgCode}</strong> · Senior Manager : <strong>${seniorManagerName || '—'}</strong>
        </div>
      </div>
    </div>
    <div class="meta-box">
      <div>${isEn ? 'Reporting Period' : 'Période analysée'} : <strong>${periodLabel}</strong></div>
      <div class="meta-pill">${isEn ? 'Certified on' : 'Certifié le'} : ${formattedDate}</div>
    </div>
  </div>

  <!-- Objectifs et Réalisations du Segment -->
  <div class="section-title">
    🎯 ${isEn ? 'Segment Targets & Realizations' : 'Objectifs & Réalisations du Segment'}
  </div>
  <div class="grid-2">
    <div class="card" style="border-left: 4px solid #10b981;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="card-label">${isEn ? 'Volume Target (Closed Deals)' : 'Objectif Volume (Opportunités conclues)'}</span>
        <span class="badge ${volRate != null ? (volRate >= 100 ? 'badge-success' : volRate >= 70 ? 'badge-warning' : 'badge-danger') : 'badge-neutral'}">
          ${volRate != null ? `${volRate}% ${isEn ? 'Attained' : 'atteint'}` : (isEn ? 'Not defined' : 'Non défini')}
        </span>
      </div>
      <div class="card-value" style="color: #10b981; margin-top: 4px;">
        ${realVol} <span style="font-size: 13px; font-weight: 600; color: #64748b;">/ ${targetVol != null ? targetVol : '—'} ${isEn ? 'closed' : 'conclues'}</span>
      </div>
    </div>

    <div class="card" style="border-left: 4px solid #3b82f6;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="card-label">${isEn ? 'Value Target (Revenue)' : 'Objectif Valeur (Chiffre d’affaires)'}</span>
        <span class="badge ${valRate != null ? (valRate >= 100 ? 'badge-success' : valRate >= 70 ? 'badge-warning' : 'badge-danger') : 'badge-neutral'}">
          ${valRate != null ? `${valRate}% ${isEn ? 'Attained' : 'atteint'}` : (isEn ? 'Not defined' : 'Non défini')}
        </span>
      </div>
      <div class="card-value" style="color: #3b82f6; margin-top: 4px;">
        ${formatCompactAmount(realVal, lang)} ${currency} <span style="font-size: 13px; font-weight: 600; color: #64748b;">/ ${targetVal != null ? `${formatCompactAmount(targetVal, lang)} ${currency}` : '—'}</span>
      </div>
    </div>
  </div>

  <!-- Métriques Globales du Segment -->
  <div class="section-title">
    📊 ${isEn ? 'Key Segment Metrics' : 'Indicateurs Clés du Segment'}
  </div>
  <div class="grid-4">
    <div class="card">
      <div class="card-label">${isEn ? 'Team Managers' : 'Team Managers'}</div>
      <div class="card-value">${data.totalManagers || 0}</div>
      <div class="card-sub">${isEn ? 'managed operational teams' : 'équipes opérationnelles'}</div>
    </div>
    <div class="card">
      <div class="card-label">${isEn ? 'Active Portfolio' : 'Portefeuille Actif'}</div>
      <div class="card-value">${activeCount}</div>
      <div class="card-sub">${data.globalCounts?.prospection || 0} prosp. · ${data.globalCounts?.negociation || 0} négo.</div>
    </div>
    <div class="card">
      <div class="card-label">${isEn ? 'Closed Deals' : 'Ventes Conclues'}</div>
      <div class="card-value" style="color: #10b981;">${realVol}</div>
      <div class="card-sub">${isEn ? 'signed contracts' : 'contrats signés'}</div>
    </div>
    <div class="card">
      <div class="card-label">${isEn ? 'Conversion Rate' : 'Taux de Conversion'}</div>
      <div class="card-value" style="color: #0ea5e9;">${data.conversionRate || 0}%</div>
      <div class="card-sub">${isEn ? 'closed / total pipeline' : 'conclus / total'}</div>
    </div>
  </div>

  <!-- Performance des Team Managers -->
  <div class="section-title">
    👥 ${isEn ? 'Performance by Team Manager' : 'Performance par Team Manager'}
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>${isEn ? 'Team Manager' : 'Team Manager'}</th>
        <th>Email</th>
        <th style="text-align: center;">${isEn ? 'Active' : 'Actif'}</th>
        <th style="text-align: center;">${isEn ? 'Closed' : 'Conclus'}</th>
        <th style="text-align: center;">${isEn ? 'Target (Vol)' : 'Objectif'}</th>
        <th style="text-align: center;">${isEn ? 'Attainment' : 'Atteinte'}</th>
      </tr>
    </thead>
    <tbody>
      ${
        !data.managers?.length
          ? `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 12px;">${isEn ? 'No Team Managers found' : 'Aucun Team Manager rattaché'}</td></tr>`
          : data.managers
              .map(
                (mgr, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td><strong>${mgr.name || '—'}</strong> ${mgr.isSenior ? '<span style="font-size: 9px; color: #6366f1;">(Senior)</span>' : ''}</td>
          <td style="color: #64748b;">${mgr.email || '—'}</td>
          <td style="text-align: center; color: #3b82f6; font-weight: 600;">${(mgr.stats.prospection || 0) + (mgr.stats.negociation || 0)}</td>
          <td style="text-align: center; color: #10b981; font-weight: 700;">${mgr.stats.conclue}</td>
          <td style="text-align: center;">${mgr.targetVolume != null ? mgr.targetVolume : '—'}</td>
          <td style="text-align: center;">
            <span class="badge ${mgr.volumeAttainmentRate != null ? (mgr.volumeAttainmentRate >= 100 ? 'badge-success' : mgr.volumeAttainmentRate >= 70 ? 'badge-warning' : 'badge-danger') : 'badge-neutral'}">
              ${mgr.volumeAttainmentRate != null ? `${mgr.volumeAttainmentRate}%` : '—'}
            </span>
          </td>
        </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <!-- Win / Loss & Analyse d'échec (P2) -->
  <div class="section-title">
    📉 ${isEn ? 'Win / Loss & Deal Failure Analysis' : 'Analyse Win/Loss & Causes d’Échec (Gouvernance)'}
  </div>
  <div class="grid-2" style="margin-bottom: 8px;">
    <div class="card" style="border-left: 4px solid #ef4444;">
      <div class="card-label">${isEn ? 'Lost Deals' : 'Affaires Perdues'}</div>
      <div class="card-value" style="color: #ef4444;">
        ${lostCount} <span style="font-size: 12px; font-weight: 600; color: #64748b;">(${data.totalLostAmount ? `${formatCompactAmount(data.totalLostAmount, lang)} ${currency}` : 'Montant non spécifié'})</span>
      </div>
      <div class="card-sub">${isEn ? 'excluded from active portfolio' : 'exclues du portefeuille actif'}</div>
    </div>
    <div class="card" style="border-left: 4px solid #6366f1;">
      <div class="card-label">${isEn ? 'Win / Loss Ratio' : 'Ratio de Victoire (Win Ratio)'}</div>
      <div class="card-value" style="color: #6366f1;">
        ${winRate != null ? `${winRate}%` : '—'}
      </div>
      <div class="card-sub">${realVol} ${isEn ? 'won vs' : 'gagnées contre'} ${lostCount} ${isEn ? 'lost' : 'perdues'}</div>
    </div>
  </div>

  ${
    lossReasonsEntries.length > 0
      ? `<table>
      <thead>
        <tr>
          <th>${isEn ? 'Declared Loss Reason' : 'Motif d’Échec Constaté'}</th>
          <th style="width: 100px; text-align: center;">${isEn ? 'Count' : 'Occurrences'}</th>
          <th style="width: 100px; text-align: right;">${isEn ? 'Share (%)' : 'Part (%)'}</th>
        </tr>
      </thead>
      <tbody>
        ${lossReasonsEntries
          .map(([reasonId, count]) => {
            const foundMeta = LOSS_REASONS.find((r) => r.id === reasonId)
            const label = foundMeta ? (isEn ? foundMeta.labelEn : foundMeta.labelFr) : reasonId
            const pct = lostCount > 0 ? Math.round((count / lostCount) * 100) : 0
            return `<tr>
              <td><strong>${label}</strong></td>
              <td style="text-align: center; font-weight: 700; color: #ef4444;">${count}</td>
              <td style="text-align: right; color: #64748b; font-weight: 600;">${pct}%</td>
            </tr>`
          })
          .join('')}
      </tbody>
    </table>`
      : `<div style="padding: 8px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 10.5px; color: #64748b; margin-bottom: 12px;">
      ${isEn ? 'No lost deals recorded for this period.' : 'Aucun motif d’échec enregistré pour cette période.'}
    </div>`
  }

  <!-- Activité Récente (Dernières conclusions) -->
  <div class="section-title">
    ⚡ ${isEn ? 'Recent Closed Opportunities' : 'Dernières Opportunités Conclues'}
  </div>
  <table>
    <thead>
      <tr>
        <th>${isEn ? 'Company / Lead' : 'Entreprise / Prospect'}</th>
        <th>${isEn ? 'Team Manager' : 'Team Manager'}</th>
        <th>${isEn ? 'Commercial' : 'Commercial'}</th>
        <th style="text-align: right;">${isEn ? 'Date' : 'Date'}</th>
      </tr>
    </thead>
    <tbody>
      ${
        !data.recentActivity?.length
          ? `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">${isEn ? 'No recent activity' : 'Aucune opportunité récente'}</td></tr>`
          : data.recentActivity
              .slice(0, 8)
              .map(
                (act) => `
        <tr>
          <td><strong>${act.companyName}</strong></td>
          <td>${act.managerName}</td>
          <td>${act.memberName || '—'}</td>
          <td style="text-align: right; color: #64748b;">${act.updatedAt ? new Date(act.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short' }) : '—'}</td>
        </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    <div>SALES COMPANION 2.0 · Plateforme de Pilotage Commercial B2B</div>
    <div>${isEn ? 'Certified Segment Performance Document · Page 1 of 1' : 'Document Certifié de Performance de Segment · Page 1 sur 1'}</div>
  </div>

</body>
</html>
`

  // Création d'une iframe invisible pour déclencher le print natif vectoriel
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()

    // Attente du chargement des styles avant le print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('Erreur print PDF:', err)
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 2000)
      }
    }, 400)
  }
}
