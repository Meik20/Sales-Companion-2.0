/**
 * exportDashboardPdf.ts
 * Utilitaire d'exportation PDF exécutive du tableau de bord de segment.
 * Génère une maquette imprimable vectorielle haute fidélité (A4 portrait/paysage).
 */

import type { OrgReportResult } from '../hooks/useOrgReport'
import { formatCompactAmount } from '@/lib/formatters'

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

  const html = `
<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'fr'}">
<head>
  <meta charset="utf-8">
  <title>${isEn ? 'Executive Segment Report' : 'Rapport Exécutif de Segment'} - ${data.orgCode}</title>
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
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .meta-box {
      text-align: right;
      font-size: 10.5px;
      color: #475569;
    }
    .meta-pill {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-top: 4px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
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
      font-size: 10px;
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
      font-size: 10px;
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
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 10px;
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
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="brand">
      <div class="brand-logo">SC</div>
      <div>
        <h1 class="brand-title">${isEn ? 'CONSOLIDATED SEGMENT REPORT' : 'RAPPORT CONSOLIDÉ DU SEGMENT'}</h1>
        <p class="brand-subtitle">${companyName ? `${companyName} · ` : ''}Segment : <strong>${data.orgCode}</strong> · Senior Manager : <strong>${seniorManagerName || '—'}</strong></p>
      </div>
    </div>
    <div class="meta-box">
      <div>${isEn ? 'Active month' : 'Mois actif'} : <strong>${periodLabel}</strong></div>
      <div class="meta-pill">${isEn ? 'Generated on' : 'Édité le'} : ${formattedDate}</div>
    </div>
  </div>

  <!-- Objectifs et Réalisations du Segment -->
  <div class="section-title">
    <span>🎯</span> ${isEn ? 'Segment Targets & Realizations' : 'Objectifs & Réalisations du Segment'}
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
    <span>📊</span> ${isEn ? 'Key Segment Metrics' : 'Indicateurs Clés du Segment'}
  </div>
  <div class="grid-4">
    <div class="card">
      <div class="card-label">${isEn ? 'Team Managers' : 'Team Managers'}</div>
      <div class="card-value">${data.totalManagers || 0}</div>
      <div class="card-sub">${isEn ? 'in your segment' : 'dans le segment'}</div>
    </div>
    <div class="card">
      <div class="card-label">${isEn ? 'Active Portfolio' : 'Portefeuille Actif'}</div>
      <div class="card-value">${(data.globalCounts?.prospection || 0) + (data.globalCounts?.negociation || 0)}</div>
      <div class="card-sub">${data.globalCounts?.prospection || 0} prosp. · ${data.globalCounts?.negociation || 0} négo.</div>
    </div>
    <div class="card">
      <div class="card-label">${isEn ? 'Closed Deals' : 'Contrats Conclus'}</div>
      <div class="card-value" style="color: #10b981;">${data.globalCounts?.conclue || 0}</div>
      <div class="card-sub">${isEn ? 'signed contracts' : 'contrats signés'}</div>
    </div>
    <div class="card">
      <div class="card-label">${isEn ? 'Conversion Rate' : 'Taux de Conversion'}</div>
      <div class="card-value" style="color: #0ea5e9;">${data.conversionRate || 0}%</div>
      <div class="card-sub">${isEn ? 'closed / total' : 'conclus / total'}</div>
    </div>
  </div>

  <!-- Performance des Team Managers -->
  <div class="section-title">
    <span>👥</span> ${isEn ? 'Performance by Team Manager' : 'Performance par Team Manager'}
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">#</th>
        <th>${isEn ? 'Team Manager' : 'Team Manager'}</th>
        <th>Email</th>
        <th style="text-align: center;">${isEn ? 'Prospection' : 'Prospection'}</th>
        <th style="text-align: center;">${isEn ? 'Negotiation' : 'Négociation'}</th>
        <th style="text-align: center;">${isEn ? 'Closed' : 'Conclus'}</th>
        <th style="text-align: center;">${isEn ? 'Target (Vol)' : 'Objectif (Vol)'}</th>
        <th style="text-align: center;">${isEn ? 'Attainment' : 'Atteinte'}</th>
      </tr>
    </thead>
    <tbody>
      ${
        !data.managers?.length
          ? `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 12px;">${isEn ? 'No Team Managers found' : 'Aucun Team Manager rattaché'}</td></tr>`
          : data.managers
              .map(
                (mgr, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td><strong>${mgr.name || '—'}</strong> ${mgr.isSenior ? '<span style="font-size: 9px; color: #6366f1;">(Senior)</span>' : ''}</td>
          <td style="color: #64748b;">${mgr.email || '—'}</td>
          <td style="text-align: center; color: #3b82f6; font-weight: 600;">${mgr.stats.prospection}</td>
          <td style="text-align: center; color: #f59e0b; font-weight: 600;">${mgr.stats.negociation}</td>
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

  <!-- Activité Récente (Dernières conclusions) -->
  <div class="section-title">
    <span>⚡</span> ${isEn ? 'Recent Closed Opportunities' : 'Dernières Opportunités Conclues'}
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
    <div>Sales Companion 2.0 · Plateforme de Pilotage Commercial B2B</div>
    <div>${isEn ? 'Page 1 of 1 · Certified Segment Performance Document' : 'Page 1 sur 1 · Document certifié de performance de segment'}</div>
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
