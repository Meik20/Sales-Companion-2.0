const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const svgLogo = `
<svg width="84" height="84" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.30868945 59.22110435 199.3156565 60.93707796 199.32377625 62.65304565 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.39393171 173.17015282 199.39626591 178.00822924 199.41354179 182.84646225 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.40257205 198.16539178 199.40559649 199.82777486 199.41612244 201.49009705 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C140.08187416 256.81381641 138.36590055 256.82078345 136.64993286 256.8289032 C132.01344825 256.84677063 127.37715356 256.84567825 122.74064493 256.83996081 C118.85917783 256.83685939 114.97774671 256.84297205 111.09628475 256.84899956 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C74.18003921 256.83862091 64.75196458 256.85268979 55.32364285 256.87949413 C47.20610312 256.90170134 39.0886524 256.90827715 30.97108448 256.90241772 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C11.90417847 256.93421589 7.35225991 256.93009682 2.7999382 256.9113636 C1.13758673 256.907699 -0.52479635 256.91072344 -2.18711853 256.92124939 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.51083789 197.58700111 -57.51780494 195.87102751 -57.52592468 194.15505981 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.53388087 176.36430479 -57.53999354 172.48287366 -57.54602104 168.6014117 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.5356424 131.68516616 -57.54971128 122.25709154 -57.57651561 112.8287698 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.59608015 83.63795265 -57.59841435 78.79987623 -57.61569023 73.96164322 C-57.63123737 69.40930542 -57.62711831 64.85738686 -57.60838509 60.30506516 C-57.60472048 58.64271368 -57.60774492 56.98033061 -57.61827087 55.31800842 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="#1B7A3E" transform="translate(57.10107421875,-0.404052734375)" />
  <path d="M0 0 C6.76365202 5.7170139 10.73854026 11.18270269 11.80078125 20.01171875 C11.89980059 21.34397901 11.98899858 22.67721318 12.05078125 24.01171875 C7.61292515 25.12337107 3.28121739 25.12699638 -1.26171875 25.07421875 C-2.00228516 25.06970703 -2.74285156 25.06519531 -3.50585938 25.06054688 C-5.32034774 25.0488405 -7.13479409 25.03090773 -8.94921875 25.01171875 C-9.22765625 23.91601562 -9.50609375 22.8203125 -9.79296875 21.69140625 C-11.10130964 17.52769976 -12.66136881 15.8063912 -15.94921875 13.01171875 C-19.17291702 11.39986962 -22.66110586 11.78550438 -26.19921875 11.76171875 C-26.95074219 11.74109375 -27.70226562 11.72046875 -28.4765625 11.69921875 C-33.3719832 11.66504478 -36.72524574 12.27253625 -40.94921875 15.01171875 C-43.11472991 18.25998549 -43.50078828 19.24266032 -42.94921875 23.01171875 C-38.08128243 30.31362323 -27.00883233 31.52187122 -19.07421875 33.38671875 C-8.32858133 35.94071694 4.06521138 39.43801152 10.48046875 49.18359375 C15.12171532 57.20744375 16.41880807 64.65954326 14.4375 73.859375 C11.8781828 81.87556235 7.61973471 88.33689726 0.26171875 92.64453125 C-8.15003463 96.61233945 -15.44156369 97.21689167 -24.63671875 97.26171875 C-25.67505859 97.28234375 -26.71339844 97.30296875 -27.78320312 97.32421875 C-38.58269047 97.37838546 -47.59991007 95.07898387 -55.94921875 88.01171875 C-62.8864151 80.82731718 -65.94921875 72.90375619 -65.94921875 63.01171875 C-59.67921875 62.35171875 -53.40921875 61.69171875 -46.94921875 61.01171875 C-46.24796875 62.88859375 -45.54671875 64.76546875 -44.82421875 66.69921875 C-42.60028081 72.05688742 -40.83844964 74.92937754 -35.94921875 78.01171875 C-29.65099205 80.11112765 -20.05915328 80.26326888 -13.76171875 77.82421875 C-10.54099717 75.74864262 -8.78886545 74.39666868 -6.94921875 71.01171875 C-6.35720399 67.88967867 -6.06516904 65.08118326 -6.94921875 62.01171875 C-11.22574129 57.15579638 -17.43731324 56.18200038 -23.44921875 54.57421875 C-25.61944398 53.96170486 -27.7887276 53.3458444 -29.95703125 52.7265625 C-30.99504883 52.43120605 -32.03306641 52.13584961 -33.10253906 51.83154297 C-44.24578888 48.62236348 -53.63891512 44.76338276 -60.453125 34.81640625 C-63.70302604 28.49778331 -64.00700516 21.65784213 -62.44140625 14.78125 C-60.03064978 7.6182552 -55.98988318 1.82376963 -49.3515625 -1.921875 C-34.92840123 -8.32435147 -13.40870391 -9.03977522 0 0 Z" fill="#FBFCFB" transform="translate(104.94921875,123.98828125)" />
  <path d="M0 0 C5.56900635 4.91638842 9.61305685 10.74520397 12 17.765625 C12 18.755625 12 19.745625 12 20.765625 C-1.6332574 25.17336987 -1.6332574 25.17336987 -8 25.765625 C-8.45439453 24.75242187 -8.45439453 24.75242187 -8.91796875 23.71875 C-11.87571009 17.42103612 -14.18581689 13.58190267 -20.625 10.515625 C-27.78544256 8.92441554 -34.73421156 8.66371123 -41.21875 12.4375 C-48.04183464 17.52488767 -51.72431369 24.40652263 -53 32.765625 C-53.8680591 46.02921075 -53.23496924 57.13883581 -47.3125 69.203125 C-43.38585324 73.55427411 -39.11209193 76.29704298 -33.25 77.1796875 C-25.85394722 77.405678 -19.81274293 76.38213005 -14.3125 71.265625 C-11.06248929 66.91016847 -9.08406112 61.749635 -7 56.765625 C-0.45044429 58.24854327 5.72318367 60.38874235 12 62.765625 C10.45955828 73.20639663 5.33543097 81.67448477 -2.88671875 88.33203125 C-13.96916596 95.85006845 -27.0548355 95.93239973 -40 94.765625 C-51.04493187 92.10750862 -60.47152954 84.97571657 -67 75.765625 C-75.91218136 60.0908128 -77.29644659 42.37873237 -73.0390625 25.05078125 C-69.01506196 12.3282833 -62.35093608 3.0577456 -50.8671875 -3.7578125 C-35.26628838 -11.792063 -14.21262388 -10.34595415 0 0 Z" fill="#FBFCFC" transform="translate(203,126.234375)" />
</svg>
`;

const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Charte Graphique & Design System — Sales Companion 2.0</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 16mm 18mm 18mm 18mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Source Sans 3', sans-serif;
        font-size: 9pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-break {
      page-break-before: always;
    }

    /* ─── COUVERTURE ────────────────────────────── */
    .cover-page {
      min-height: 250mm;
      background: linear-gradient(145deg, #070a10 0%, #0d1524 60%, #0b1a14 100%);
      color: #ffffff;
      padding: 35mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(47,91,234,0.25) 0%, rgba(27,122,62,0.15) 50%, transparent 70%);
      border-radius: 50%;
    }

    .cover-logo-container {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 30mm;
    }

    .cover-brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
    }

    .cover-brand-version {
      color: #1B7A3E;
      font-weight: 800;
    }

    .cover-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(47, 91, 234, 0.2);
      border: 1px solid rgba(47, 91, 234, 0.4);
      color: #93c5fd;
      font-family: 'Outfit', sans-serif;
      font-size: 9.5pt;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border-radius: 20px;
      margin-bottom: 12mm;
    }

    .cover-main-title {
      font-family: 'Outfit', sans-serif;
      font-size: 34pt;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -1px;
      color: #ffffff;
      margin-bottom: 6mm;
    }

    .cover-subtitle {
      font-size: 14pt;
      color: #94a3b8;
      max-width: 500px;
      line-height: 1.5;
      margin-bottom: 25mm;
      font-weight: 400;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 8mm;
    }

    .cover-meta-item label {
      display: block;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 3px;
    }

    .cover-meta-item span {
      font-family: 'Outfit', sans-serif;
      font-size: 11pt;
      font-weight: 600;
      color: #e2e8f0;
    }

    /* ─── CORPS DU DOCUMENT ──────────────────────── */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4mm;
      margin-bottom: 8mm;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
    }

    .header-doc-title {
      font-size: 8.5pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 18pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin-top: 6mm;
      margin-bottom: 3mm;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 20px;
      background: #1B7A3E;
      border-radius: 2px;
    }

    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 13pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 5mm;
      margin-bottom: 2.5mm;
    }

    p {
      margin-bottom: 3.5mm;
      color: #334155;
    }

    /* ─── BOXES & ALERTES ────────────────────────── */
    .rule-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2F5BEA;
      padding: 10px 14px;
      border-radius: 6px;
      margin: 4mm 0;
      font-size: 9.5pt;
    }

    .rule-box.caution {
      background: #fef2f2;
      border-color: #fecaca;
      border-left-color: #dc2626;
      color: #991b1b;
    }

    .rule-box.success {
      background: #f0fdf4;
      border-color: #bbf7d0;
      border-left-color: #16a34a;
      color: #166534;
    }

    /* ─── TABLEAUX ──────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4mm 0 6mm 0;
      font-size: 9pt;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #cbd5e1;
    }

    td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #fafafa;
    }

    /* ─── COLOR SWATCHES ────────────────────────── */
    .color-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 4mm 0 6mm 0;
    }

    .color-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .color-preview {
      height: 48px;
      width: 100%;
    }

    .color-details {
      padding: 8px 10px;
    }

    .color-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      font-size: 9pt;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .color-hex {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 2px;
    }

    .color-desc {
      font-size: 7.5pt;
      color: #475467;
      line-height: 1.3;
    }

    /* ─── PILIERS WORKSPACE ─────────────────────── */
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin: 5mm 0;
    }

    .pillar-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 8px;
      text-align: center;
    }

    .pillar-step {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      border-radius: 50%;
      background: #2F5BEA;
      color: #ffffff;
      font-weight: 700;
      font-size: 9pt;
      margin-bottom: 6px;
    }

    .pillar-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .pillar-desc {
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.3;
    }

    /* ─── TYPOGRAPHY SHOWCASE ───────────────────── */
    .type-specimen {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 4mm 0;
    }

    .type-sample {
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #cbd5e1;
    }

    .type-sample:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    /* ─── FOOTER ────────────────────────────────── */
    .footer-note {
      margin-top: 10mm;
      padding-top: 4mm;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- ==================== COUVERTURE ==================== -->
  <div class="cover-page">
    <div>
      <div class="cover-logo-container">
        ${svgLogo}
        <div class="cover-brand-title">
          Sales Companion <span class="cover-brand-version">2.0</span>
        </div>
      </div>

      <div class="cover-badge">Document de Référence Officiel</div>
      <h1 class="cover-main-title">Charte Graphique<br>& Design System</h1>
      <p class="cover-subtitle">
        Normes visuelles, identité de marque, palettes sémantiques et invariants d'interface pour le Sales Intelligence Workspace B2B.
      </p>
    </div>

    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <label>Version</label>
        <span>2.0.0 (Officielle)</span>
      </div>
      <div class="cover-meta-item">
        <label>Application</label>
        <span>Web, Mobile & CRM</span>
      </div>
      <div class="cover-meta-item">
        <label>Dernière Révision</label>
        <span>Novembre 2026</span>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== SECTION 1 : VISION & POSITIONNEMENT ==================== -->
  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="84" height="84"', 'width="22" height="22"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 1 · Vision & Positionnement</div>
  </div>

  <h2>1. Positionnement & Piliers Métier</h2>
  <p>
    Sales Companion 2.0 n'est pas un simple annuaire d'entreprises avec quelques fonctionnalités CRM ajoutées. 
    C'est un véritable <strong>Sales Intelligence Workspace</strong> conçu pour les forces commerciales en Afrique subsaharienne (espace CEMAC et international).
  </p>

  <h3>Le Parcours Commercial en 5 Étapes</h3>
  <p>
    L'ensemble de l'interface utilisateur (recherche, fiches de prospects, pipeline, tableaux de bord et companion IA) 
    doit refléter ce parcours commercial continu et sans rupture :
  </p>

  <div class="pillars-grid">
    <div class="pillar-card">
      <div class="pillar-step">1</div>
      <div class="pillar-name">Découvrir</div>
      <div class="pillar-desc">Ciblage fin par secteur, ville, zone et statut fiscal (NIU, RCCM).</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">2</div>
      <div class="pillar-name">Analyser</div>
      <div class="pillar-desc">Évaluation du potentiel, coordonnées vérifiées et géolocalisation.</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">3</div>
      <div class="pillar-name">Contacter</div>
      <div class="pillar-desc">Scripts d'appel, WhatsApp directs et argumentaires propulsés par l'IA.</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">4</div>
      <div class="pillar-name">Convertir</div>
      <div class="pillar-desc">Gestion des opportunités du pipeline, relances actives et négociation.</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">5</div>
      <div class="pillar-name">Piloter</div>
      <div class="pillar-desc">Tableau de bord consolidé, objectifs individuels et suivi de performance.</div>
    </div>
  </div>

  <h3>Principes Directeurs du Design</h3>
  <ul>
    <li><strong>Sobriété & Efficacité Opérationnelle</strong> : Priorité absolue à la lisibilité des chiffres, statuts et coordonnées. Zéro fioriture superflue.</li>
    <li><strong>Contraste Élevé & Accessibilité (WCAG AA/AAA)</strong> : Rendu irréprochable sur écrans nomades, en plein soleil sur le terrain comme en bureau.</li>
    <li><strong>Élégance Fintech & Ancrage Local</strong> : Mariage équilibré du Vert Cameroun institutionnel (fiabilité, légitimité) et du Bleu Roi d'action (puissance technologique).</li>
  </ul>

  <div class="rule-box">
    <strong>Règle Fondamentale :</strong> Toute évolution de l'interface doit servir directement au moins l'un des 5 piliers métier.
  </div>

  <!-- ==================== SECTION 2 : LOGOTYPE & EMBLÈME ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="84" height="84"', 'width="22" height="22"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 2 · Identité de Marque & Logo</div>
  </div>

  <h2>2. Logotype & Emblème Officiel</h2>

  <div style="display: flex; align-items: center; gap: 24px; background: #0b0f17; padding: 18px 24px; border-radius: 10px; margin: 5mm 0;">
    ${svgLogo}
    <div>
      <div style="font-family: 'Outfit', sans-serif; font-size: 20pt; font-weight: 700; color: #ffffff;">
        Sales Companion <span style="color: #1B7A3E;">2.0</span>
      </div>
      <div style="font-size: 9pt; color: #94a3b8; margin-top: 4px;">
        Emblème officiel vectoriel (Vert Cameroun <code>#1B7A3E</code> + Monogramme Bézier <code>SC</code> blanc)
      </div>
    </div>
  </div>

  <h3>2.1 Anatomie du Logo</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Élément</th>
        <th style="width: 35%;">Spécification</th>
        <th style="width: 40%;">Règles d'Usage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Emblème</strong></td>
        <td>Composant <code>&lt;ScIcon /&gt;</code> en SVG inline</td>
        <td>Coins arrondis, ratio 1:1, fond vert <code>#1B7A3E</code> avec monogramme blanc pur.</td>
      </tr>
      <tr>
        <td><strong>Typographie Titrage</strong></td>
        <td><code>Outfit</code> Semi-Bold (600)</td>
        <td>Police de titrage officielle. Ne jamais substituer par Arial ou Roboto.</td>
      </tr>
      <tr>
        <td><strong>Suffixe 2.0</strong></td>
        <td><code>#1B7A3E</code> en gras (800)</td>
        <td>Matérialise le saut générationnel vers le Sales Intelligence Workspace.</td>
      </tr>
      <tr>
        <td><strong>Zone d'Exclusion</strong></td>
        <td>Padding minimal de 16px à 24px</td>
        <td>Isoler le logo du reste de la navbar par un séparateur subtil (<code>border-r border-border/60</code>).</td>
      </tr>
    </tbody>
  </table>

  <h3>2.2 Interdictions Formelles (Règle 11 AGENTS.md)</h3>
  <div class="rule-box caution">
    <strong>ATTENTION — PROHIBITIONS STRICTES :</strong>
    <ul style="margin-top: 4px; padding-left: 18px;">
      <li>Interdiction absolue de simuler le logo avec du texte brut : <code>&lt;div&gt;SC&lt;/div&gt;</code> est banni.</li>
      <li>Ne jamais déformer, étirer ou modifier les proportions de l'icône vectorielle.</li>
      <li>Ne jamais remplacer l'icône par un emoji ou un fichier bitmap basse résolution (PNG flou).</li>
    </ul>
  </div>

  <!-- ==================== SECTION 3 : SYSTÈME DE COULEURS ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="84" height="84"', 'width="22" height="22"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 3 · Couleurs & Tokens Sémantiques</div>
  </div>

  <h2>3. Système de Couleurs & Thèmes</h2>
  <p>L'application repose sur un système bimodal fluide : <strong>Mode Clair (Fintech Nette)</strong> et <strong>Mode Sombre (Obsidian Deep)</strong>.</p>

  <h3>3.1 Couleurs Identitaires Majeures</h3>
  <div class="color-grid">
    <div class="color-card">
      <div class="color-preview" style="background: #2F5BEA;"></div>
      <div class="color-details">
        <div class="color-name">Bleu Royal (Primary)</div>
        <div class="color-hex">#2F5BEA</div>
        <div class="color-desc">Actions principales, CTA, liens d'action, focus ring.</div>
      </div>
    </div>
    <div class="color-card">
      <div class="color-preview" style="background: #1B7A3E;"></div>
      <div class="color-details">
        <div class="color-name">Vert Cameroun (Brand)</div>
        <div class="color-hex">#1B7A3E</div>
        <div class="color-desc">Logo officiel, suffixe 2.0, badges vérifiés et ancrage territorial.</div>
      </div>
    </div>
    <div class="color-card">
      <div class="color-preview" style="background: #047857;"></div>
      <div class="color-details">
        <div class="color-name">Émeraude (Conclue)</div>
        <div class="color-hex">#047857</div>
        <div class="color-desc">Opportunités conclues, réussites, chiffres d'affaires signés.</div>
      </div>
    </div>
    <div class="color-card">
      <div class="color-preview" style="background: #b91c1c;"></div>
      <div class="color-details">
        <div class="color-name">Rouge Alerte (Danger)</div>
        <div class="color-hex">#B91C1C</div>
        <div class="color-desc">Relances expirées, actions en retard, suppressions critiques.</div>
      </div>
    </div>
  </div>

  <h3>3.2 Nuancier des Thèmes (Clair vs Sombre)</h3>
  <table>
    <thead>
      <tr>
        <th>Token Tailwind / CSS</th>
        <th>Mode Clair (Fintech)</th>
        <th>Mode Sombre (Obsidian)</th>
        <th>Usage dans l'interface</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>--background</code></td>
        <td><code>#F7F8FA</code> (Gris doux)</td>
        <td><code>#0B0F17</code> (Noir profond)</td>
        <td>Fond de page général</td>
      </tr>
      <tr>
        <td><code>--card</code> / <code>--popover</code></td>
        <td><code>#FFFFFF</code> (Blanc pur)</td>
        <td><code>#121826</code> (Bleu nuit dense)</td>
        <td>Conteneurs, modales, drawers (100% opaque)</td>
      </tr>
      <tr>
        <td><code>--border</code></td>
        <td><code>#E6E8EC</code></td>
        <td><code>#1F2937</code></td>
        <td>Bordures subtiles des cartes et champs</td>
      </tr>
      <tr>
        <td><code>--foreground</code></td>
        <td><code>#101828</code> (Texte haute densité)</td>
        <td><code>#F8FAFC</code> (Blanc cassé doux)</td>
        <td>Titres et corps de texte principal</td>
      </tr>
      <tr>
        <td><code>--muted-foreground</code></td>
        <td><code>#475467</code></td>
        <td><code>#94A3B8</code></td>
        <td>Métadonnées, labels secondaires, infobulles</td>
      </tr>
    </tbody>
  </table>

  <h3>3.3 Statuts Visuels du Pipeline Commercial</h3>
  <table>
    <thead>
      <tr>
        <th>Statut Métier</th>
        <th>Couleur de Texte</th>
        <th>Fond Doux (Clair)</th>
        <th>Signification Opérationnelle</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Conclue (Gagnée)</strong></td>
        <td><code style="color: #047857; font-weight: 700;">#047857</code></td>
        <td><code>#ECFDF5</code></td>
        <td>Contrat signé, chiffre d'affaires sécurisé</td>
      </tr>
      <tr>
        <td><strong>En Négociation / En Cours</strong></td>
        <td><code style="color: #1d4ed8; font-weight: 700;">#1D4ED8</code></td>
        <td><code>#EFF6FF</code></td>
        <td>Offre en discussion, prospect chaud</td>
      </tr>
      <tr>
        <td><strong>Lead Stagnant (Vigilance)</strong></td>
        <td><code style="color: #b45309; font-weight: 700;">#B45309</code></td>
        <td><code>#FFFBEB</code></td>
        <td>Aucune interaction depuis plus de 15 jours</td>
      </tr>
      <tr>
        <td><strong>Relance en Retard</strong></td>
        <td><code style="color: #b91c1c; font-weight: 700;">#B91C1C</code></td>
        <td><code>#FEF2F2</code></td>
        <td>Date d'échéance dépassée — intervention requise</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== SECTION 4 : TYPOGRAPHIE ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="84" height="84"', 'width="22" height="22"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 4 · Typographie & Hiérarchie</div>
  </div>

  <h2>4. Typographie & Lisibilité</h2>

  <p>Le système typographique combine expressivité moderne et lisibilité maximale :</p>

  <div class="type-specimen">
    <div class="type-sample">
      <div style="font-family: 'Outfit', sans-serif; font-size: 22pt; font-weight: 700; color: #0f172a;">
        Outfit — Titrage & Identité
      </div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
        Sans-serif géométrique aux courbes tendues. Utilisé pour les H1, H2, H3, chiffres clés de KPI et le logo.
      </div>
    </div>
    <div class="type-sample">
      <div style="font-family: 'Source Sans 3', sans-serif; font-size: 13pt; font-weight: 600; color: #1e293b;">
        Source Sans 3 / Inter — Corps & Interface
      </div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
        Sans-serif humaniste hautement lisible en petite taille. Utilisé pour les formulaires, tableaux, listes et descriptions.
      </div>
    </div>
    <div class="type-sample">
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 11pt; color: #334155;">
        Monospace — Données Chiffrées & Fiscale (NIU, RCCM, Codes)
      </div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">
        Alignement parfait des chiffres et identifiants officiels d'entreprises (ex: <code>RC/DLA/2021/B/1420</code>).
      </div>
    </div>
  </div>

  <h3>Échelle des Tailles & Usages</h3>
  <table>
    <thead>
      <tr>
        <th>Niveau</th>
        <th>Taille / Interligne</th>
        <th>Graisse (Weight)</th>
        <th>Composants Cibles</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Display / H1</strong></td>
        <td><code>2.25rem</code> (36px) / 1.2</td>
        <td>Extra-Bold (800)</td>
        <td>Titres principaux des pages d'accueil et bannières</td>
      </tr>
      <tr>
        <td><strong>Page Title / H2</strong></td>
        <td><code>1.5rem</code> (24px) / 1.25</td>
        <td>Bold (700)</td>
        <td>Titres de page CRM, Tableaux de bord, En-têtes</td>
      </tr>
      <tr>
        <td><strong>Section / H3</strong></td>
        <td><code>1.125rem</code> (18px) / 1.35</td>
        <td>Semi-Bold (600)</td>
        <td>Cartes KPIs, étapes du pipeline, modales</td>
      </tr>
      <tr>
        <td><strong>Card Title / H4</strong></td>
        <td><code>0.9375rem</code> (15px) / 1.4</td>
        <td>Semi-Bold (600)</td>
        <td>Noms des prospects, items de liste</td>
      </tr>
      <tr>
        <td><strong>Body (Base)</strong></td>
        <td><code>0.875rem</code> (14px) / 1.5</td>
        <td>Regular (400) ou Medium (500)</td>
        <td>Paragraphes courants, inputs, libellés</td>
      </tr>
      <tr>
        <td><strong>Caption / Tags</strong></td>
        <td><code>0.75rem</code> (12px) / 1.4</td>
        <td>Semi-Bold (600)</td>
        <td>Badges de statut, pastilles, compteurs de colonnes</td>
      </tr>
      <tr>
        <td><strong>Micro</strong></td>
        <td><code>0.6875rem</code> (11px) / 1.3</td>
        <td>Medium (500)</td>
        <td>Horodatages, infobulles, mentions légales</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== SECTION 5 : ICONOGRAPHIE ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="84" height="84"', 'width="22" height="22"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 5 · Iconographie & Éléments Vectoriels</div>
  </div>

  <h2>5. Iconographie (Politique Zéro Emoji)</h2>

  <div class="rule-box caution">
    <strong>RÈGLE D'OR INVIOLABLE (Règle 6 AGENTS.md) :</strong><br>
    Toutes les icônes de l'interface utilisateur <strong>DOIVENT être vectorielles</strong>. 
    L'utilisation d'émojis Unicode bruts (ex: 🥇, 🔥, ⚠️, ✓, 🟢, 🔴) en lieu et place d'icônes d'interface est strictement interdite dans le code JSX/TSX.
  </div>

  <h3>5.1 Sources Officielles Autorisées</h3>
  <table>
    <thead>
      <tr>
        <th>Source</th>
        <th>Composant / Bibliothèque</th>
        <th>Cas d'Usage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Lucide React</strong></td>
        <td><code>lucide-react</code></td>
        <td>Ensemble des icônes UI génériques : navigation, recherche, filtre, corbeille, calendrier, etc.</td>
      </tr>
      <tr>
        <td><strong>Logo Officiel</strong></td>
        <td><code>&lt;ScIcon /&gt;</code></td>
        <td>Marque Sales Companion 2.0 exclusivement.</td>
      </tr>
      <tr>
        <td><strong>Drapeaux Territoriaux</strong></td>
        <td><code>&lt;CountryFlag /&gt;</code></td>
        <td>Drapeaux SVG nets (Cameroun, Côte d'Ivoire, Sénégal, etc.).</td>
      </tr>
      <tr>
        <td><strong>Indicateurs de Couleur</strong></td>
        <td>Pastille CSS <code>&lt;span&gt;</code></td>
        <td>Cercles de couleur pleine pour matérialiser les statuts (jamais 🟢🔴🟡).</td>
      </tr>
    </tbody>
  </table>

  <h3>5.2 Exemples Concrets d'Application</h3>
  <table>
    <thead>
      <tr>
        <th>Besoin Visuel</th>
        <th>Pattern Interdit ❌</th>
        <th>Pattern Conforme ✅</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Avertissement / Alerte</td>
        <td><code>&lt;span&gt;⚠️&lt;/span&gt;</code></td>
        <td><code>&lt;AlertTriangle size={16} className="text-amber-500" /&gt;</code></td>
      </tr>
      <tr>
        <td>Validation / Succès</td>
        <td><code>&lt;span&gt;✓&lt;/span&gt;</code></td>
        <td><code>&lt;Check size={16} className="text-emerald-500" /&gt;</code></td>
      </tr>
      <tr>
        <td>Téléchargement</td>
        <td><code>&lt;button&gt;⬇ Télécharger&lt;/button&gt;</code></td>
        <td><code>&lt;Download size={14} className="mr-1.5" /&gt; Télécharger</code></td>
      </tr>
      <tr>
        <td>Classement / Réussite</td>
        <td><code>&lt;div&gt;🥇 Rang 1&lt;/div&gt;</code></td>
        <td><code>&lt;Medal size={16} style={{ color: '#fbbf24' }} /&gt; Rang 1</code></td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== SECTION 6 : COMPOSANTS & RÈGLES UI ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="84" height="84"', 'width="22" height="22"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 6 · Composants UI & Invariants Inviolables</div>
  </div>

  <h2>6. Rayons, Élévations & Invariants UI</h2>

  <h3>6.1 Échelle des Rayons de Courbure (Radii)</h3>
  <ul>
    <li><strong><code>rounded-xs</code> (4px) & <code>rounded-sm</code> (6px)</strong> : Micro-badges, tags de filtre internes.</li>
    <li><strong><code>rounded-md</code> (8px)</strong> : Champs de formulaire, selects, boutons secondaires.</li>
    <li><strong><code>rounded-lg</code> (12px)</strong> : Boutons primaires CTA, cartes de liste standard.</li>
    <li><strong><code>rounded-xl</code> (16px) & <code>rounded-2xl</code> (20px)</strong> : Grandes cartes KPIs du dashboard, modales.</li>
    <li><strong><code>rounded-full</code> (9999px)</strong> : Avatars, pastilles d'état, boutons circulaires.</li>
  </ul>

  <h3>6.2 Règle d'Or — Opacité 100% des Popovers & Menus (Règle 8 AGENTS.md)</h3>
  <div class="rule-box caution">
    <strong>INTERDICTION FORMELLE DE TRANSPARENCES DÉCORATIVES :</strong><br>
    Les menus déroulants (profil, sélecteurs pays, filtres), popovers et modales ne doivent <strong>JAMAIS</strong> être translucides 
    (interdiction de <code>bg-card/90</code> ou <code>backdrop-blur</code> partiel qui laisse transparaître le texte sous-jacent).<br>
    Ils doivent obligatoirement être <strong>100% opaques</strong> (<code>backgroundColor: var(--card)</code> solide).
  </div>

  <h3>6.3 Règle d'Or — Zéro Affichage d'UID Technique (Règle 13 AGENTS.md)</h3>
  <div class="rule-box caution">
    <strong>ZÉRO TOLÉRANCE POUR LES UIDS BRUTS EN INTERFACE :</strong><br>
    Les identifiants Firebase Auth ou Supabase (ex: <code>Nst48TDCkfemRwou9E1h6hHkZrC2</code>) ne doivent <strong>JAMAIS</strong> être affichés à l'utilisateur. 
    Les routes API et composants résolvent toujours le nom humain ou utilisent un libellé métier qualifié (<em>Team Manager</em>, <em>Commercial</em>).
  </div>

  <h3>6.4 Règle d'Or — Internationalisation Bilingue Intégrale (Règle 10 AGENTS.md)</h3>
  <div class="rule-box success">
    <strong>BILINGUISME PARFAIT FR / EN :</strong><br>
    Tous les mois, qualificatifs de métriques, suffixes d'objectifs, infobulles et boutons s'adaptent instantanément à la langue active. 
    Aucun texte temporel n'est laissé en dur.
  </div>

  <div class="footer-note">
    <span>Sales Companion 2.0 — Guide Officiel du Design System</span>
    <span>Document d'Intégrité Architecturale</span>
  </div>

</body>
</html>
`;

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    const outputPathWorkspace = path.resolve('Charte_Graphique_Sales_Companion_2.0.pdf');
    const outputPathArtifact = path.resolve('C:\\Users\\MEIK20\\.gemini\\antigravity\\brain\\145914e9-53ff-4bd1-a8f6-b1dc8bca6e31\\Charte_Graphique_Sales_Companion_2.0.pdf');

    await page.pdf({
      path: outputPathWorkspace,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        bottom: '14mm',
        left: '14mm',
        right: '14mm'
      }
    });

    fs.copyFileSync(outputPathWorkspace, outputPathArtifact);
    await browser.close();

    console.log('SUCCESS');
    console.log('Workspace PDF:', outputPathWorkspace);
    console.log('Artifact PDF:', outputPathArtifact);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();
