const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Monogramme SVG vectoriel officiel de Sales Companion 2.0
const svgLogo = (size = 72) => `
<svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.30868945 59.22110435 199.3156565 60.93707796 199.32377625 62.65304565 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.39393171 173.17015282 199.39626591 178.00822924 199.41354179 182.84646225 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.40257205 198.16539178 199.40559649 199.82777486 199.41612244 201.49009705 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C140.08187416 256.81381641 138.36590055 256.82078345 136.64993286 256.8289032 C132.01344825 256.84677063 127.37715356 256.84567825 122.74064493 256.83996081 C118.85917783 256.83685939 114.97774671 256.84297205 111.09628475 256.84899956 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C74.18003921 256.83862091 64.75196458 256.85268979 55.32364285 256.87949413 C47.20610312 256.90170134 39.0886524 256.90827715 30.97108448 256.90241772 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C11.90417847 256.93421589 7.35225991 256.93009682 2.7999382 256.9113636 C1.13758673 256.907699 -0.52479635 256.91072344 -2.18711853 256.92124939 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.51083789 197.58700111 -57.51780494 195.87102751 -57.52592468 194.15505981 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.53388087 176.36430479 -57.53999354 172.48287366 -57.54602104 168.6014117 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.5356424 131.68516616 -57.54971128 122.25709154 -57.57651561 112.8287698 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.59608015 83.63795265 -57.59841435 78.79987623 -57.61569023 73.96164322 C-57.63123737 69.40930542 -57.62711831 64.85738686 -57.60838509 60.30506516 C-57.60472048 58.64271368 -57.60774492 56.98033061 -57.61827087 55.31800842 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="#1B7A3E" transform="translate(57.10107421875,-0.404052734375)" />
  <path d="M0 0 C6.76365202 5.7170139 10.73854026 11.18270269 11.80078125 20.01171875 C11.89980059 21.34397901 11.98899858 22.67721318 12.05078125 24.01171875 C7.61292515 25.12337107 3.28121739 25.12699638 -1.26171875 25.07421875 C-2.00228516 25.06970703 -2.74285156 25.06519531 -3.50585938 25.06054688 C-5.32034774 25.0488405 -7.13479409 25.03090773 -8.94921875 25.01171875 C-9.22765625 23.91601562 -9.50609375 22.8203125 -9.79296875 21.69140625 C-11.10130964 17.52769976 -12.66136881 15.8063912 -15.94921875 13.01171875 C-19.17291702 11.39986962 -22.66110586 11.78550438 -26.19921875 11.76171875 C-26.95074219 11.74109375 -27.70226562 11.72046875 -28.4765625 11.69921875 C-33.3719832 11.66504478 -36.72524574 12.27253625 -40.94921875 15.01171875 C-43.11472991 18.25998549 -43.50078828 19.24266032 -42.94921875 23.01171875 C-38.08128243 30.31362323 -27.00883233 31.52187122 -19.07421875 33.38671875 C-8.32858133 35.94071694 4.06521138 39.43801152 10.48046875 49.18359375 C15.12171532 57.20744375 16.41880807 64.65954326 14.4375 73.859375 C11.8781828 81.87556235 7.61973471 88.33689726 0.26171875 92.64453125 C-8.15003463 96.61233945 -15.44156369 97.21689167 -24.63671875 97.26171875 C-25.67505859 97.28234375 -26.71339844 97.30296875 -27.78320312 97.32421875 C-38.58269047 97.37838546 -47.59991007 95.07898387 -55.94921875 88.01171875 C-62.8864151 80.82731718 -65.94921875 72.90375619 -65.94921875 63.01171875 C-59.67921875 62.35171875 -53.40921875 61.69171875 -46.94921875 61.01171875 C-46.24796875 62.88859375 -45.54671875 64.76546875 -44.82421875 66.69921875 C-42.60028081 72.05688742 -40.83844964 74.92937754 -35.94921875 78.01171875 C-29.65099205 80.11112765 -20.05915328 80.26326888 -13.76171875 77.82421875 C-10.54099717 75.74864262 -8.78886545 74.39666868 -6.94921875 71.01171875 C-6.35720399 67.88967867 -6.06516904 65.08118326 -6.94921875 62.01171875 C-11.22574129 57.15579638 -17.43731324 56.18200038 -23.44921875 54.57421875 C-25.61944398 53.96170486 -27.7887276 53.3458444 -29.95703125 52.7265625 C-30.99504883 52.43120605 -32.03306641 52.13584961 -33.10253906 51.83154297 C-44.24578888 48.62236348 -53.63891512 44.76338276 -60.453125 34.81640625 C-63.70302604 28.49778331 -64.00700516 21.65784213 -62.44140625 14.78125 C-60.03064978 7.6182552 -55.98988318 1.82376963 -49.3515625 -1.921875 C-34.92840123 -8.32435147 -13.40870391 -9.03977522 0 0 Z" fill="#FBFCFB" transform="translate(104.94921875,82.76797)" />
  <path d="M0 0 C5.56900635 4.91638842 9.61305685 10.74520397 12 17.765625 C12 18.755625 12 19.745625 12 20.765625 C-1.6332574 25.17336987 -1.6332574 25.17336987 -8 25.765625 C-8.45439453 24.75242187 -8.45439453 24.75242187 -8.91796875 23.71875 C-11.87571009 17.42103612 -14.18581689 13.58190267 -20.625 10.515625 C-27.78544256 8.92441554 -34.73421156 8.66371123 -41.21875 12.4375 C-48.04183464 17.52488767 -51.72431369 24.40652263 -53 32.765625 C-53.8680591 46.02921075 -53.23496924 57.13883581 -47.3125 69.203125 C-43.38585324 73.55427411 -39.11209193 76.29704298 -33.25 77.1796875 C-25.85394722 77.405678 -19.81274293 76.38213005 -14.3125 71.265625 C-11.06248929 66.91016847 -9.08406112 61.749635 -7 56.765625 C-0.45044429 58.24854327 5.72318367 60.38874235 12 62.765625 C10.45955828 73.20639663 5.33543097 81.67448477 -2.88671875 88.33203125 C-13.96916596 95.85006845 -27.0548355 95.93239973 -40 94.765625 C-51.04493187 92.10750862 -60.47152954 84.97571657 -67 75.765625 C-75.91218136 60.0908128 -77.29644659 42.37873237 -73.0390625 25.05078125 C-69.01506196 12.3282833 -62.35093608 3.0577456 -50.8671875 -3.7578125 C-35.26628838 -11.792063 -14.21262388 -10.34595415 0 0 Z" fill="#FBFCFC" transform="translate(203,85.014065)" />
</svg>
`;

function getLinkedInBannerHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1584px;
      height: 396px;
      background: #070B14;
      font-family: 'Outfit', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 56px;
    }

    /* Fond & Effets d'éclairage sophistiqués */
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.04) 1px, transparent 1px);
      background-size: 32px 32px, 64px 64px, 64px 64px;
      z-index: 1;
    }

    .glow-green {
      position: absolute;
      top: -120px;
      right: 15%;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(27, 122, 62, 0.28) 0%, rgba(27, 122, 62, 0.05) 50%, transparent 70%);
      filter: blur(50px);
      z-index: 2;
      pointer-events: none;
    }

    .glow-gold {
      position: absolute;
      bottom: -150px;
      right: 42%;
      width: 450px;
      height: 450px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 65%);
      filter: blur(60px);
      z-index: 2;
      pointer-events: none;
    }

    .glow-corner {
      position: absolute;
      bottom: -100px;
      left: -100px;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(27, 122, 62, 0.15) 0%, transparent 65%);
      filter: blur(50px);
      z-index: 2;
      pointer-events: none;
    }

    /* Container Principal */
    .banner-content {
      position: relative;
      z-index: 10;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
    }

    /* Zone Gauche : Safe zone LinkedIn protégée, Titre & Accroche */
    .left-section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 780px;
      /* On décale légèrement pour laisser respirer l'avatar LinkedIn */
      padding-left: 20px;
    }

    .brand-header {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 14px;
    }

    .logo-box {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px -5px rgba(27, 122, 62, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15);
      background: #111827;
      overflow: hidden;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 38px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
      text-transform: none;
      color: #FFFFFF;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .brand-name .version-badge {
      font-size: 20px;
      font-weight: 800;
      color: #1B7A3E;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(27, 122, 62, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.35);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4ADE80;
      width: fit-content;
      margin-bottom: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 8px #22C55E;
    }

    .headline {
      font-size: 27px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.01em;
      color: #F8FAFC;
      margin-bottom: 12px;
    }

    .headline span.highlight {
      background: linear-gradient(135deg, #4ADE80 0%, #10B981 60%, #F59E0B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sub-headline {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14.5px;
      font-weight: 400;
      line-height: 1.5;
      color: #94A3B8;
      max-width: 680px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tag-geo {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #CBD5E1;
      font-weight: 600;
      font-size: 13px;
      background: rgba(255, 255, 255, 0.06);
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Zone Droite : Les 3 Piliers de Valeur / Cards Glassmorphism */
    .right-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 580px;
      flex-shrink: 0;
    }

    .feature-card {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.75), rgba(15, 23, 42, 0.6));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--card-accent, #1B7A3E);
      border-radius: 3px 0 0 3px;
    }

    .card-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--icon-bg, rgba(27, 122, 62, 0.2));
      border: 1px solid var(--icon-border, rgba(34, 197, 94, 0.3));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      flex-shrink: 0;
    }

    .card-text {
      flex: 1;
    }

    .card-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .card-metric {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--metric-color, #4ADE80);
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .card-desc {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.35;
    }

    /* Footer de la bannière (URL + Label) */
    .banner-footer {
      position: absolute;
      bottom: 16px;
      right: 56px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #64748B;
      z-index: 15;
    }

    .banner-url {
      color: #4ADE80;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-green"></div>
  <div class="glow-gold"></div>
  <div class="glow-corner"></div>

  <div class="banner-content">
    <!-- Zone de gauche : Identité de marque et Proposition de valeur -->
    <div class="left-section">
      <div class="brand-header">
        <div class="logo-box">
          ${svgLogo(60)}
        </div>
        <div>
          <div class="badge-pill">
            <span class="pulse-dot"></span>
            Workspace Commercial & Prospection
          </div>
          <div class="brand-name">
            Sales Companion <span class="version-badge">2.0</span>
          </div>
        </div>
      </div>

      <h1 class="headline">
        L'intelligence commerciale & prospection <br>
        au service du <span class="highlight">closing de vos équipes</span>.
      </h1>

      <p class="sub-headline">
        La plateforme tout-en-un pour identifier, qualifier et convertir les entreprises au Cameroun & en Afrique.
        <span class="tag-geo">Douala · Yaoundé · CEMAC</span>
      </p>
    </div>

    <!-- Zone de droite : Les 3 fonctionnalités reines -->
    <div class="right-section">
      <!-- Item 1 : Base d'entreprises -->
      <div class="feature-card" style="--card-accent: #1B7A3E; --icon-bg: rgba(27, 122, 62, 0.25); --icon-border: rgba(34, 197, 94, 0.4); --metric-color: #4ADE80;">
        <div class="card-icon-wrap" style="color: #4ADE80;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>
        <div class="card-text">
          <div class="card-title">
            <span>Base d'Entreprises Vérifiées</span>
            <span class="card-metric">+50 000 Sociétés</span>
          </div>
          <div class="card-desc">Fiches complètes avec RCCM, NIU fiscal & contacts directs des dirigeants.</div>
        </div>
      </div>

      <!-- Item 2 : Pipeline CRM -->
      <div class="feature-card" style="--card-accent: #3B82F6; --icon-bg: rgba(59, 130, 246, 0.25); --icon-border: rgba(96, 165, 250, 0.4); --metric-color: #60A5FA;">
        <div class="card-icon-wrap">⚡</div>
        <div class="card-text">
          <div class="card-title">
            <span>Pipeline CRM & Portefeuille Actif</span>
            <span class="card-metric" style="color: #60A5FA;">Supervision 360°</span>
          </div>
          <div class="card-desc">Pilotage par objectifs, gouvernance Senior & Team Managers, zéro déperdition.</div>
        </div>
      </div>

      <!-- Item 3 : IA Commerciale -->
      <div class="feature-card" style="--card-accent: #F59E0B; --icon-bg: rgba(245, 158, 11, 0.25); --icon-border: rgba(251, 191, 36, 0.4); --metric-color: #FBBF24;">
        <div class="card-icon-wrap" style="color: #FBBF24;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg></div>
        <div class="card-text">
          <div class="card-title">
            <span>Companion IA Commercial</span>
            <span class="card-metric" style="color: #FBBF24;">Closing 24/7</span>
          </div>
          <div class="card-desc">Pitchs sur-mesure, qualification intelligente et scripts WhatsApp & appels terrain.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="banner-footer">
    <span>salescompanion2-0.com</span>
    <span style="opacity: 0.4;">•</span>
    <span class="banner-url">Rejoignez le réseau leader</span>
  </div>
</body>
</html>
`;
}

function getTwitterBannerHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1500px;
      height: 500px;
      background: #060A12;
      font-family: 'Outfit', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 50px 70px;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.05) 1px, transparent 1px);
      background-size: 36px 36px, 72px 72px, 72px 72px;
      z-index: 1;
    }

    .glow-center {
      position: absolute;
      top: 50%;
      right: 25%;
      transform: translate(50%, -50%);
      width: 700px;
      height: 700px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(27, 122, 62, 0.3) 0%, rgba(27, 122, 62, 0.05) 55%, transparent 75%);
      filter: blur(60px);
      z-index: 2;
    }

    .glow-gold {
      position: absolute;
      bottom: -100px;
      left: 30%;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, transparent 65%);
      filter: blur(70px);
      z-index: 2;
    }

    .top-bar {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-box {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: #0F172A;
      box-shadow: 0 8px 24px rgba(27, 122, 62, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-title {
      font-size: 34px;
      font-weight: 600;
      letter-spacing: -0.02em;
      text-transform: none;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .brand-version {
      font-size: 18px;
      font-weight: 800;
      color: #1B7A3E;
      font-weight: 600;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      background: rgba(27, 122, 62, 0.25);
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4ADE80;
    }

    .pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 10px #22C55E;
    }

    .main-body {
      position: relative;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 50px;
      margin-top: 20px;
    }

    .hero-text {
      max-width: 780px;
    }

    .h1-title {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      margin-bottom: 16px;
    }

    .h1-title span.grad {
      background: linear-gradient(135deg, #4ADE80 0%, #10B981 50%, #F59E0B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .h1-sub {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 17px;
      line-height: 1.5;
      color: #94A3B8;
      max-width: 660px;
    }

    .stats-row {
      display: flex;
      gap: 16px;
      flex-shrink: 0;
    }

    .stat-box {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(10, 15, 29, 0.7));
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 16px 20px;
      min-width: 170px;
      backdrop-filter: blur(14px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .stat-number {
      font-size: 26px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stat-number span.star {
      color: #F59E0B;
      font-size: 20px;
    }

    .stat-label {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      color: #94A3B8;
      font-weight: 500;
      line-height: 1.3;
    }

    .bottom-bar {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #64748B;
    }

    .territories {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #CBD5E1;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
    }

    .site-link {
      color: #4ADE80;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-center"></div>
  <div class="glow-gold"></div>

  <div class="top-bar">
    <div class="brand-wrap">
      <div class="logo-box">
        ${svgLogo(56)}
      </div>
      <div class="brand-title">
        Sales Companion <span class="brand-version">2.0</span>
      </div>
    </div>
    <div class="badge">
      <span class="pulse"></span>
      Workspace Commercial & Prospection
    </div>
  </div>

  <div class="main-body">
    <div class="hero-text">
      <h1 class="h1-title">
        Le Workspace commercial de référence pour <br>
        <span class="grad">accélérer vos ventes et closing</span>.
      </h1>
      <p class="h1-sub">
        Accédez à la base de données certifiée d'entreprises, pilotez votre CRM d'équipe avec rigueur, et activez l'IA pour signer plus vite.
      </p>
    </div>

    <div class="stats-row">
      <div class="stat-box" style="border-top: 2px solid #1B7A3E;">
        <div class="stat-number">50K+ <span class="star">★</span></div>
        <div class="stat-label">Entreprises vérifiées avec RCCM & NIU</div>
      </div>
      <div class="stat-box" style="border-top: 2px solid #3B82F6;">
        <div class="stat-number">100%</div>
        <div class="stat-label">Pipeline CRM & Portefeuille Actif</div>
      </div>
      <div class="stat-box" style="border-top: 2px solid #F59E0B;">
        <div class="stat-number">IA 24/7</div>
        <div class="stat-label">Scripts WhatsApp & Closing d'Impact</div>
      </div>
    </div>
  </div>

  <div class="bottom-bar">
    <div class="territories">
      <span>Cameroun</span>
      <span>•</span>
      <span>Douala & Yaoundé</span>
      <span>•</span>
      <span>Marchés CEMAC & Afrique</span>
    </div>
    <div class="site-link">
      salescompanion2-0.com
    </div>
  </div>
</body>
</html>
`;
}

function getOpenGraphBannerHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1200px;
      height: 630px;
      background: #060A13;
      font-family: 'Outfit', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 80px;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.06) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.05) 1px, transparent 1px);
      background-size: 40px 40px, 80px 80px, 80px 80px;
      z-index: 1;
    }

    .glow-bg {
      position: absolute;
      top: 50%;
      right: 15%;
      transform: translate(0, -50%);
      width: 750px;
      height: 750px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(27, 122, 62, 0.32) 0%, rgba(27, 122, 62, 0.08) 55%, transparent 75%);
      filter: blur(70px);
      z-index: 2;
    }

    .glow-gold {
      position: absolute;
      bottom: -120px;
      left: 20%;
      width: 550px;
      height: 550px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 65%);
      filter: blur(80px);
      z-index: 2;
    }

    .top-header {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo-box {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      background: #0F172A;
      box-shadow: 0 12px 30px rgba(27, 122, 62, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-title {
      font-size: 40px;
      font-weight: 600;
      letter-spacing: -0.02em;
      text-transform: none;
      line-height: 1;
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .brand-version {
      font-size: 22px;
      font-weight: 800;
      color: #1B7A3E;
      font-weight: 600;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(27, 122, 62, 0.25);
      border: 1px solid rgba(34, 197, 94, 0.4);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4ADE80;
    }

    .center-content {
      position: relative;
      z-index: 10;
      max-width: 900px;
      margin: 30px 0;
    }

    .main-title {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }

    .main-title span.grad {
      background: linear-gradient(135deg, #4ADE80 0%, #10B981 45%, #F59E0B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .main-subtitle {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 20px;
      line-height: 1.5;
      color: #94A3B8;
      max-width: 820px;
    }

    .features-strip {
      position: relative;
      z-index: 10;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 10px;
    }

    .strip-card {
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.75), rgba(15, 23, 42, 0.6));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 16px 20px;
      backdrop-filter: blur(14px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .strip-card-title {
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .strip-card-sub {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.4;
    }

    .bottom-footer {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #64748B;
    }

    .bottom-footer strong {
      color: #4ADE80;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-bg"></div>
  <div class="glow-gold"></div>

  <div class="top-header">
    <div class="brand-group">
      <div class="logo-box">
        ${svgLogo(72)}
      </div>
      <div>
        <div class="brand-title">
          Sales Companion <span class="brand-version">2.0</span>
        </div>
      </div>
    </div>
    <div class="badge-pill">
      Workspace Commercial & Prospection
    </div>
  </div>

  <div class="center-content">
    <h1 class="main-title">
      L'intelligence commerciale au service de votre <br>
      <span class="grad">croissance sur le terrain</span>.
    </h1>
    <p class="main-subtitle">
      La solution intégrée pour commerciaux, managers et indépendants : base d'entreprises géolocalisée, pipeline CRM rigoureux et closing accéléré par l'IA.
    </p>
  </div>

  <div class="features-strip">
    <div class="strip-card" style="border-top: 2px solid #1B7A3E;">
      <div class="strip-card-title">+50 000 Entreprises Vérifiées</div>
      <div class="strip-card-sub">RCCM, NIU fiscal & contacts dirigeants directs à Douala, Yaoundé & régions.</div>
    </div>
    <div class="strip-card" style="border-top: 2px solid #3B82F6;">
      <div class="strip-card-title">⚡ CRM & Portefeuille Actif</div>
      <div class="strip-card-sub">Suivi des deals, passation de service sans perte et pilotage d'objectifs mensuels.</div>
    </div>
    <div class="strip-card" style="border-top: 2px solid #F59E0B;">
      <div class="strip-card-title">Companion IA Dédié</div>
      <div class="strip-card-sub">Génération d'angles d'attaque, pitchs d'approche et scripts de closing.</div>
    </div>
  </div>

  <div class="bottom-footer">
    <span>Conçu pour le marché camerounais & africain</span>
    <span><strong>salescompanion2-0.com</strong></span>
  </div>
</body>
</html>
`;
}

async function generateBanners() {
  console.log('🚀 Démarrage de la génération des bannières officielles Sales Companion 2.0...');

  // Dossiers de sortie
  const artifactsDir = path.resolve('C:\\Users\\MEIK20\\.gemini\\antigravity\\brain\\145914e9-53ff-4bd1-a8f6-b1dc8bca6e31');
  const publicBannersDir = path.resolve(__dirname, '../apps/web/public/banners');

  if (!fs.existsSync(publicBannersDir)) {
    fs.mkdirSync(publicBannersDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const tasks = [
    {
      name: 'Bannière LinkedIn (1584 × 396 px)',
      filename: 'sales-companion-banner-linkedin.png',
      width: 1584,
      height: 396,
      html: getLinkedInBannerHtml(),
      scale: 2 // Rendu Retina 3168 x 792 pour netteté cristalline
    },
    {
      name: 'Bannière Twitter / X (1500 × 500 px)',
      filename: 'sales-companion-banner-twitter.png',
      width: 1500,
      height: 500,
      html: getTwitterBannerHtml(),
      scale: 2 // Rendu Retina 3000 x 1000
    },
    {
      name: 'Bannière Réseaux Sociaux & Open Graph (1200 × 630 px)',
      filename: 'sales-companion-banner-opengraph.png',
      width: 1200,
      height: 630,
      html: getOpenGraphBannerHtml(),
      scale: 2 // Rendu Retina 2400 x 1260
    }
  ];

  for (const t of tasks) {
    console.log(`📸 Génération de : ${t.name}...`);
    const page = await browser.newPage({
      viewport: { width: t.width, height: t.height },
      deviceScaleFactor: t.scale
    });

    await page.setContent(t.html, { waitUntil: 'networkidle' });
    // Pause pour s'assurer que les polices Google Fonts et SVG sont parfaitement peints
    await page.waitForTimeout(1000);

    // Sauvegarde dans artifacts
    const artifactPath = path.join(artifactsDir, t.filename);
    await page.screenshot({ path: artifactPath, type: 'png' });
    console.log(`  ✅ Enregistré dans artifacts : ${artifactPath}`);

    // Sauvegarde dans public/banners
    const publicPath = path.join(publicBannersDir, t.filename);
    await page.screenshot({ path: publicPath, type: 'png' });
    console.log(`  ✅ Enregistré dans public : ${publicPath}`);

    // Si c'est l'open graph, mettons également à jour public/og-image.png
    if (t.filename === 'sales-companion-banner-opengraph.png') {
      const ogPath = path.resolve(__dirname, '../apps/web/public/og-image.png');
      await page.screenshot({ path: ogPath, type: 'png' });
      console.log(`  ✅ Mis à jour public/og-image.png pour le partage web !`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✨ Toutes les bannières ont été générées avec succès !');
}

generateBanners().catch(err => {
  console.error('❌ Erreur lors de la génération des bannières :', err);
  process.exit(1);
});
