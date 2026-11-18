const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const svgLogo = `
<svg width="80" height="80" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
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
  <title>Document Général de Projet — Sales Companion 2.0</title>
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
      background: linear-gradient(145deg, #070a10 0%, #0d1524 55%, #081d13 100%);
      color: #ffffff;
      padding: 32mm 20mm;
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
      top: -120px;
      right: -120px;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(47,91,234,0.3) 0%, rgba(27,122,62,0.2) 50%, transparent 70%);
      border-radius: 50%;
    }

    .cover-logo-container {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 24mm;
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
      background: rgba(27, 122, 62, 0.25);
      border: 1px solid rgba(27, 122, 62, 0.5);
      color: #86efac;
      font-family: 'Outfit', sans-serif;
      font-size: 9.5pt;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border-radius: 20px;
      margin-bottom: 10mm;
    }

    .cover-main-title {
      font-family: 'Outfit', sans-serif;
      font-size: 32pt;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -1px;
      color: #ffffff;
      margin-bottom: 6mm;
    }

    .cover-subtitle {
      font-size: 13.5pt;
      color: #94a3b8;
      max-width: 540px;
      line-height: 1.5;
      margin-bottom: 22mm;
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
      font-size: 10.5pt;
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
      margin-bottom: 7mm;
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
      font-size: 17pt;
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
      font-size: 12.5pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 5mm;
      margin-bottom: 2.5mm;
    }

    p {
      margin-bottom: 3mm;
      color: #334155;
      text-align: justify;
    }

    ul, ol {
      margin-bottom: 3.5mm;
      padding-left: 18px;
    }

    li {
      margin-bottom: 1.5mm;
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

    .rule-box.highlight {
      background: #f0fdf4;
      border-color: #bbf7d0;
      border-left-color: #1B7A3E;
      color: #14532d;
    }

    .rule-box.amber {
      background: #fffbeb;
      border-color: #fde68a;
      border-left-color: #d97706;
      color: #92400e;
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
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #fafafa;
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
      line-height: 1.35;
    }

    /* ─── TIMELINE D'EXPANSION ─────────────────── */
    .timeline-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 5mm 0;
    }

    .timeline-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-top: 3px solid #1B7A3E;
      border-radius: 6px;
      padding: 10px 8px;
    }

    .timeline-phase {
      font-family: 'Outfit', sans-serif;
      font-size: 8pt;
      font-weight: 700;
      color: #1B7A3E;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }

    .timeline-title {
      font-family: 'Outfit', sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .timeline-text {
      font-size: 8pt;
      color: #475467;
      line-height: 1.35;
    }

    /* ─── FOOTER ────────────────────────────────── */
    .footer-note {
      margin-top: 8mm;
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

      <div class="cover-badge">Livre Blanc & Cadre Stratégique</div>
      <h1 class="cover-main-title">Document Général<br>de Projet</h1>
      <p class="cover-subtitle">
        Vision Fondatrice, Architecture Métier, Gouvernance d'Entreprise et Stratégie d'Expansion Panafricaine & Internationale.
      </p>
    </div>

    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <label>Nature du Document</label>
        <span>Master Project Blueprint</span>
      </div>
      <div class="cover-meta-item">
        <label>Marchés Cibles</label>
        <span>CEMAC · UEMOA · Panafricain</span>
      </div>
      <div class="cover-meta-item">
        <label>Édition Officielle</label>
        <span>Novembre 2026 — v2.0</span>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== SECTION 1 : RÉSUMÉ EXÉCUTIF & CONTEXTE ==================== -->
  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="80" height="80"', 'width="20" height="20"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 1 · Contexte de Marché & Problématique</div>
  </div>

  <h2>1. Contexte de Marché & Genèse</h2>
  <p>
    Dans les économies émergentes et particulièrement en Afrique subsaharienne, le développement commercial B2B fait face à une anomalie structurelle : 
    bien que le tissu économique regorge d'opportunités en forte croissance, <strong>la prospection reste artisanale, opaque et coûteuse</strong>.
  </p>

  <div class="rule-box amber">
    <strong>Le Constat Fondateur :</strong> Les entreprises perdent jusqu'à 65% du temps de leurs équipes commerciales à rechercher manuellement des contacts non qualifiés, 
    naviguer dans des annuaires statiques obsolètes, et tenter de joindre des numéros inactifs sans certitude sur l'existence légale de leur interlocuteur.
  </div>

  <h3>Les 4 Freins Majeurs de la Prospection B2B Actuelle</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Frein Structurel</th>
        <th style="width: 35%;">Manifestation sur le Terrain</th>
        <th style="width: 40%;">Impact Économique Client</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Obsolescence des Répertoires</strong></td>
        <td>Annuaires papier ou web statiques, numéros coupés, entreprises ayant déménagé ou cessé leur activité.</td>
        <td>Coût d'acquisition client (CAC) exorbitant, découragement des commerciaux de terrain.</td>
      </tr>
      <tr>
        <td><strong>Inadaptation des CRM Occidentaux</strong></td>
        <td>Solutions lourdes (Salesforce, HubSpot) exigeant une connexion 4G continue et ignorant WhatsApp.</td>
        <td>Taux d'adoption quasi nul par les équipes mobiles ; rejet des outils par la force de vente.</td>
      </tr>
      <tr>
        <td><strong>Dispersion de la Gouvernance</strong></td>
        <td>Suivi sur carnets papier ou fichiers Excel isolés. Le management découvre les retards en fin de mois.</td>
        <td>Incapacité pour la direction de piloter les prévisions de vente (forecast) et d'ajuster les quotas.</td>
      </tr>
      <tr>
        <td><strong>Fuite du Capital Client</strong></td>
        <td>Au départ d'un commercial, son carnet de prospects et l'historique de ses négociations disparaissent avec lui.</td>
        <td>Perte sèche d'actifs immatériels et rupture de relation avec les comptes en négociation.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== SECTION 2 : LA VISION WORKSPACE ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="80" height="80"', 'width="20" height="20"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 2 · La Vision Sales Intelligence Workspace</div>
  </div>

  <h2>2. La Vision : Le Sales Intelligence Workspace</h2>
  <p>
    Sales Companion 2.0 opère une rupture conceptuelle : <strong>l'application n'est pas un annuaire d'entreprises auquel on a ajouté des fonctionnalités de CRM, 
    mais un espace unifié de prospection intelligente et de pilotage d'affaires.</strong>
  </p>

  <div class="rule-box highlight">
    <strong>Notre Définition du Sales Intelligence Workspace :</strong> Un environnement numérique complet où chaque fiche d'entreprise découverte devient 
    instantanément un objet commercial exploitable, enrichi par l'intelligence artificielle, tracé dans un pipeline collaboratif, et sécurisé au profit de l'entreprise cliente.
  </div>

  <h3>Le Parcours Commercial Unifié en 5 Temps</h3>
  <div class="pillars-grid">
    <div class="pillar-card">
      <div class="pillar-step">1</div>
      <div class="pillar-name">Découvrir</div>
      <div class="pillar-desc">Ciblage géospatial et sectoriel précis avec données légales certifiées (NIU, RCCM).</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">2</div>
      <div class="pillar-name">Analyser</div>
      <div class="pillar-desc">Diagnostic de potentiel, structure du compte et estimation de solvabilité.</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">3</div>
      <div class="pillar-name">Contacter</div>
      <div class="pillar-desc">Companion IA, pitchs d'approche sur-mesure, appels directs et WhatsApp commercial.</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">4</div>
      <div class="pillar-name">Convertir</div>
      <div class="pillar-desc">Pipeline dynamique, alertes de relances expirées et sauvetage des leads stagnants.</div>
    </div>
    <div class="pillar-card">
      <div class="pillar-step">5</div>
      <div class="pillar-name">Piloter</div>
      <div class="pillar-desc">Reporting consolidé multi-équipes, objectifs volume/valeur et calcul du taux R/O.</div>
    </div>
  </div>

  <h3>Les Trois Principes Invariants de la Plateforme</h3>
  <ul>
    <li><strong>Souveraineté des Données Entreprise</strong> : La base clients appartient à la personne morale cliente. Le turnover des commerciaux ne doit jamais amputer le portefeuille de l'entreprise.</li>
    <li><strong>Actionnabilité Zéro-Friction</strong> : Moins de 3 clics entre la découverte d'une opportunité et l'envoi d'un message commercial contextualisé.</li>
    <li><strong>Excellence d'Interface B2B</strong> : Conformité stricte aux standards modernes : design bimodal (Clair/Sombre), 100% vectoriel, aucune exposition d'identifiants techniques bruts.</li>
  </ul>

  <!-- ==================== SECTION 3 : GOUVERNANCE HIÉRARCHIQUE ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="80" height="80"', 'width="20" height="20"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 3 · Modèle des Rôles & Gouvernance</div>
  </div>

  <h2>3. Modèle des Utilisateurs & Gouvernance</h2>
  <p>
    Sales Companion 2.0 concilie deux réalités économiques majeures : d'une part les <strong>professionnels indépendants autonomes</strong> 
    (apporteurs d'affaires, consultants, courtiers), et d'autre part les <strong>organisations hiérarchisées</strong> (PME, grands comptes, banques, télécoms) :
  </p>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 4mm 0;">
    <div style="background: #f8fafc; border: 1.5px solid #2F5BEA; border-radius: 8px; padding: 10px 12px;">
      <div style="font-family: 'Outfit', sans-serif; font-size: 10pt; font-weight: 700; color: #2F5BEA; margin-bottom: 4px;">
        1. Mode Autonome (Indépendants)
      </div>
      <div style="font-size: 8pt; color: #475467; line-height: 1.35;">
        Propriétaires exclusifs de leur portefeuille. Pipeline privé, Companion IA et quotas personnels sans aucun lien de subordination ni code organisation.
      </div>
    </div>
    <div style="background: #f8fafc; border: 1.5px solid #1B7A3E; border-radius: 8px; padding: 10px 12px;">
      <div style="font-family: 'Outfit', sans-serif; font-size: 10pt; font-weight: 700; color: #1B7A3E; margin-bottom: 4px;">
        2. Mode Organisationnel (Entreprise)
      </div>
      <div style="font-size: 8pt; color: #475467; line-height: 1.35;">
        Structure d'entreprise unifiée sous un <code>orgCode</code>. Segmentation métier, quotas d'équipe, délégation managériale et consolidation multi-branches.
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Rôle Métier</th>
        <th style="width: 38%;">Attributions & Périmètre</th>
        <th style="width: 40%;">Règles Architecturales Strictes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Indépendant (<code>independent</code>)</strong></td>
        <td>
          Apporteur d'affaires, consultant B2B, commercial autonome. Gère son propre pipeline et sa base de données clients privée.
        </td>
        <td>
          <strong>Aucun rattachement à un <code>orgCode</code>.</strong> 
          Peut à tout moment créer son organisation (SM1) ou rejoindre une entreprise cliente via invitation.
        </td>
      </tr>
      <tr>
        <td><strong>Senior Manager (<code>senior_manager</code>)</strong></td>
        <td>
          Supervise un segment d'activité complet (ex: Grands Comptes, Réseau Nord). 
          Accède aux dashboards consolidés et arbitre l'allocation des commerciaux.
        </td>
        <td>
          <strong>Ne gère aucun portefeuille opérationnel de routine.</strong> 
          Délègue les prospects aux Team Managers. Ses cibles résiduelles sont exclues de l'objectif consolidé.
        </td>
      </tr>
      <tr>
        <td><strong>Team Manager (<code>team_manager</code>)</strong></td>
        <td>
          Manager d'équipe opérationnel. Pilote directement ses commerciaux, attribue les prospects importés 
          et porte les objectifs de vente consolidés.
        </td>
        <td>
          Rejoint l'organisation via le code d'invitation <code>orgCode</code>. 
          Est seul habilité à recevoir les transferts de prospects du Senior Manager.
        </td>
      </tr>
      <tr>
        <td><strong>Commercial (<code>member</code>)</strong></td>
        <td>
          Force de vente nomade de terrain. Traite son portefeuille actif en prospection et négociation 
          via le mobile et la PWA hors-ligne.
        </td>
        <td>
          Opère sur les opportunités assignées. En cas de mobilité vers un autre TM, 
          ses affaires conclues restent dans la base clients de son ancien manager.
        </td>
      </tr>
      <tr>
        <td><strong>Agent Support Transversal (<code>support_agent</code>)</strong></td>
        <td>
          Assistance technique, SAV et relation client post-signature. 
          Rattaché aux Team Managers pour le suivi des dossiers conclus.
        </td>
        <td>
          <strong>Confinement strict :</strong> n'apparaît jamais dans les formulaires de Team Managers et ne reçoit aucun prospect commercial.
        </td>
      </tr>
    </tbody>
  </table>

  <div class="rule-box highlight">
    <strong>Sanctification de la Base Clients (Règle Inviolable AGENTS.md) :</strong><br>
    Lorsqu'un commercial est transféré vers un nouveau Team Manager, <strong>seules ses opportunités actives en cours</strong> 
    (prospection et négociation) suivent le transfert. Toutes les affaires conclues antérieures demeurent définitivement sous la responsabilité 
    de l'ancien Team Manager et alimentent la base clients historique de son équipe.
  </div>

  <!-- ==================== SECTION 4 : EXPANSION GÉOGRAPHIQUE ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="80" height="80"', 'width="20" height="20"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 4 · Trajectoire d'Expansion Géographique</div>
  </div>

  <h2>4. Expansion Territoriale & Marchés Hors-CEMAC</h2>
  <p>
    Si le Cameroun et la zone CEMAC constituent le socle de lancement et de validation opérationnelle du produit, 
    <strong>Sales Companion 2.0 est expressément conçu pour conquérir les marchés d'Afrique de l'Ouest, l'Afrique anglophone et les corridors internationaux.</strong>
  </p>

  <div class="timeline-container">
    <div class="timeline-card">
      <div class="timeline-phase">Phase 1 · Socle</div>
      <div class="timeline-title">Zone CEMAC</div>
      <div class="timeline-text">
        Cameroun, Gabon, Congo, Tchad. Monnaie commune (XAF), droit OHADA. 
        Constitution de la base de référence de plus de 50 000 entreprises qualifiées.
      </div>
    </div>
    <div class="timeline-card">
      <div class="timeline-phase">Phase 2 · Échelle</div>
      <div class="timeline-title">Zone UEMOA</div>
      <div class="timeline-text">
        Côte d'Ivoire (hub stratégique), Sénégal, Bénin, Togo. Même législation OHADA, 
        monnaie jumelle (XOF), intégration de Wave et Orange Money.
      </div>
    </div>
    <div class="timeline-card">
      <div class="timeline-phase">Phase 3 · Panafricain</div>
      <div class="timeline-title">Afrique Anglophone</div>
      <div class="timeline-text">
        Nigéria, Ghana, Kenya, Rwanda. Exploitation du bilinguisme natif (FR/EN), 
        multi-devises (NGN, KES, USD) et mapping des identifiants TIN/CAC.
      </div>
    </div>
    <div class="timeline-card">
      <div class="timeline-phase">Phase 4 · Global</div>
      <div class="timeline-title">International</div>
      <div class="timeline-text">
        Maghreb, Europe, Moyen-Orient. Outil de Due Diligence pour les investisseurs 
        et entreprises étrangères ciblant les marchés émergents.
      </div>
    </div>
  </div>

  <h3>Prérequis Techniques Déjà Déployés pour l'International</h3>
  <ul>
    <li><strong>Internationalisation Intégrale (i18n)</strong> : Support bilingue natif Français / Anglais sur 100% des interfaces, filtres et métriques.</li>
    <li><strong>Sélecteur de Territoire Dynamique</strong> : Architecture prête à commuter instantanément de pays, adaptant les indicatifs téléphoniques, les devises et les drapeaux officiels vectoriels.</li>
    <li><strong>Modèle de Données Élastique</strong> : Prise en charge des variantes d'immatriculation fiscale selon les pays (NIU, NINEA, NCC, TIN, SIREN).</li>
  </ul>

  <!-- ==================== SECTION 5 : MODÈLE ÉCONOMIQUE & FINALITÉ ==================== -->
  <div class="page-break"></div>

  <div class="header-bar">
    <div class="header-brand">
      ${svgLogo.replace('width="80" height="80"', 'width="20" height="20"')}
      <span>Sales Companion 2.0</span>
    </div>
    <div class="header-doc-title">Section 5 · Modèle Économique & Finalité</div>
  </div>

  <h2>5. Modèle Économique & Monétisation</h2>
  <p>Sales Companion 2.0 repose sur un modèle d'abonnement SaaS B2B récurrent (MRR/ARR) à forte valeur d'usage :</p>

  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Offre</th>
        <th style="width: 30%;">Cible Utilisateur</th>
        <th style="width: 50%;">Fonctionnalités & Valeur Clé</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Découverte (Gratuit)</strong></td>
        <td>Nouveaux utilisateurs, curieux</td>
        <td>10 recherches qualifiées par mois pour constater la fraîcheur et la véracité des données.</td>
      </tr>
      <tr>
        <td><strong>Pro Indépendant</strong></td>
        <td>Consultants, commerciaux indépendants</td>
        <td>Recherches illimitées, export de données, pipeline personnel et suggestions d'accroches IA.</td>
      </tr>
      <tr>
        <td><strong>Business Team</strong></td>
        <td>PME / PMI avec 1 équipe commerciale</td>
        <td>1 Team Manager + Commerciaux terrain, attribution des prospects, PWA mobile hors-ligne.</td>
      </tr>
      <tr>
        <td><strong>Enterprise Multi-Segments</strong></td>
        <td>Grandes entreprises, groupes multi-villes</td>
        <td>
          Supervision Senior Managers, Team Managers illimités, consolidation multi-branches, 
          support prioritaire dédié et intégration sur-mesure.
        </td>
      </tr>
    </tbody>
  </table>

  <h2>6. Finalité Stratégique & Impact à Long Terme</h2>
  <p>
    La finalité ultime de Sales Companion 2.0 dépasse la seule fourniture d'un outil logiciel : 
    <strong>la plateforme vise à devenir le standard d'infrastructure commerciale des marchés émergents.</strong>
  </p>

  <div class="rule-box highlight">
    <strong>Les Trois Impacts Majeurs de Sales Companion 2.0 :</strong>
    <ol style="margin-top: 6px; padding-left: 18px;">
      <li><strong>Formalisation des Flux d'Affaires</strong> : En liant chaque prospect à des identifiants légaux vérifiés, l'application accélère la formalisation de l'économie et la conformité contractuelle.</li>
      <li><strong>Démocratisation de l'Intelligence Commerciale</strong> : Rendre accessibles aux PME locales des technologies prédictives auparavant réservées aux géants internationaux.</li>
      <li><strong>Revalorisation du Métier Commercial</strong> : Libérer les commerciaux des corvées de saisie et de recherche aveugle pour en faire de véritables conseillers d'affaires à forte valeur ajoutée.</li>
    </ol>
  </div>

  <div class="footer-note">
    <span>Sales Companion 2.0 — Document Cadre Stratégique</span>
    <span>Édition Officielle de Référence · 2026</span>
  </div>

</body>
</html>
`;

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    const outputPathWorkspace = path.resolve('Document_General_Projet_Sales_Companion_2.0.pdf');
    const outputPathArtifact = path.resolve('C:\\Users\\MEIK20\\.gemini\\antigravity\\brain\\145914e9-53ff-4bd1-a8f6-b1dc8bca6e31\\Document_General_Projet_Sales_Companion_2.0.pdf');

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
