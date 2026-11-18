const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Monogramme SVG vectoriel officiel de Sales Companion 2.0 (ScIcon)
const svgScLogo = (size = 64) => `
<svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.30868945 59.22110435 199.3156565 60.93707796 199.32377625 62.65304565 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.39393171 173.17015282 199.39626591 178.00822924 199.41354179 182.84646225 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.40257205 198.16539178 199.40559649 199.82777486 199.41612244 201.49009705 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C140.08187416 256.81381641 138.36590055 256.82078345 136.64993286 256.8289032 C132.01344825 256.84677063 127.37715356 256.84567825 122.74064493 256.83996081 C118.85917783 256.83685939 114.97774671 256.84297205 111.09628475 256.84899956 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C74.18003921 256.83862091 64.75196458 256.85268979 55.32364285 256.87949413 C47.20610312 256.90170134 39.0886524 256.90827715 30.97108448 256.90241772 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C11.90417847 256.93421589 7.35225991 256.93009682 2.7999382 256.9113636 C1.13758673 256.907699 -0.52479635 256.91072344 -2.18711853 256.92124939 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.51083789 197.58700111 -57.51780494 195.87102751 -57.52592468 194.15505981 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.53388087 176.36430479 -57.53999354 172.48287366 -57.54602104 168.6014117 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.5356424 131.68516616 -57.54971128 122.25709154 -57.57651561 112.8287698 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.59608015 83.63795265 -57.59841435 78.79987623 -57.61569023 73.96164322 C-57.63123737 69.40930542 -57.62711831 64.85738686 -57.60838509 60.30506516 C-57.60472048 58.64271368 -57.60774492 56.98033061 -57.61827087 55.31800842 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="#1B7A3E" transform="translate(57.10107421875,-0.404052734375)" />
  <path d="M0 0 C6.76365202 5.7170139 10.73854026 11.18270269 11.80078125 20.01171875 C11.89980059 21.34397901 11.98899858 22.67721318 12.05078125 24.01171875 C7.61292515 25.12337107 3.28121739 25.12699638 -1.26171875 25.07421875 C-2.00228516 25.06970703 -2.74285156 25.06519531 -3.50585938 25.06054688 C-5.32034774 25.0488405 -7.13479409 25.03090773 -8.94921875 25.01171875 C-9.22765625 23.91601562 -9.50609375 22.8203125 -9.79296875 21.69140625 C-11.10130964 17.52769976 -12.66136881 15.8063912 -15.94921875 13.01171875 C-19.17291702 11.39986962 -22.66110586 11.78550438 -26.19921875 11.76171875 C-26.95074219 11.74109375 -27.70226562 11.72046875 -28.4765625 11.69921875 C-33.3719832 11.66504478 -36.72524574 12.27253625 -40.94921875 15.01171875 C-43.11472991 18.25998549 -43.50078828 19.24266032 -42.94921875 23.01171875 C-38.08128243 30.31362323 -27.00883233 31.52187122 -19.07421875 33.38671875 C-8.32858133 35.94071694 4.06521138 39.43801152 10.48046875 49.18359375 C15.12171532 57.20744375 16.41880807 64.65954326 14.4375 73.859375 C11.8781828 81.87556235 7.61973471 88.33689726 0.26171875 92.64453125 C-8.15003463 96.61233945 -15.44156369 97.21689167 -24.63671875 97.26171875 C-25.67505859 97.28234375 -26.71339844 97.30296875 -27.78320312 97.32421875 C-38.58269047 97.37838546 -47.59991007 95.07898387 -55.94921875 88.01171875 C-62.8864151 80.82731718 -65.94921875 72.90375619 -65.94921875 63.01171875 C-59.67921875 62.35171875 -53.40921875 61.69171875 -46.94921875 61.01171875 C-46.24796875 62.88859375 -45.54671875 64.76546875 -44.82421875 66.69921875 C-42.60028081 72.05688742 -40.83844964 74.92937754 -35.94921875 78.01171875 C-29.65099205 80.11112765 -20.05915328 80.26326888 -13.76171875 77.82421875 C-10.54099717 75.74864262 -8.78886545 74.39666868 -6.94921875 71.01171875 C-6.35720399 67.88967867 -6.06516904 65.08118326 -6.94921875 62.01171875 C-11.22574129 57.15579638 -17.43731324 56.18200038 -23.44921875 54.57421875 C-25.61944398 53.96170486 -27.7887276 53.3458444 -29.95703125 52.7265625 C-30.99504883 52.43120605 -32.03306641 52.13584961 -33.10253906 51.83154297 C-44.24578888 48.62236348 -53.63891512 44.76338276 -60.453125 34.81640625 C-63.70302604 28.49778331 -64.00700516 21.65784213 -62.44140625 14.78125 C-60.03064978 7.6182552 -55.98988318 1.82376963 -49.3515625 -1.921875 C-34.92840123 -8.32435147 -13.40870391 -9.03977522 0 0 Z" fill="#FBFCFB" transform="translate(104.94921875,123.98828125)" />
  <path d="M0 0 C5.56900635 4.91638842 9.61305685 10.74520397 12 17.765625 C12 18.755625 12 19.745625 12 20.765625 C-1.6332574 25.17336987 -1.6332574 25.17336987 -8 25.765625 C-8.45439453 24.75242187 -8.45439453 24.75242187 -8.91796875 23.71875 C-11.87571009 17.42103612 -14.18581689 13.58190267 -20.625 10.515625 C-27.78544256 8.92441554 -34.73421156 8.66371123 -41.21875 12.4375 C-48.04183464 17.52488767 -51.72431369 24.40652263 -53 32.765625 C-53.8680591 46.02921075 -53.23496924 57.13883581 -47.3125 69.203125 C-43.38585324 73.55427411 -39.11209193 76.29704298 -33.25 77.1796875 C-25.85394722 77.405678 -19.81274293 76.38213005 -14.3125 71.265625 C-11.06248929 66.91016847 -9.08406112 61.749635 -7 56.765625 C-0.45044429 58.24854327 5.72318367 60.38874235 12 62.765625 C10.45955828 73.20639663 5.33543097 81.67448477 -2.88671875 88.33203125 C-13.96916596 95.85006845 -27.0548355 95.93239973 -40 94.765625 C-51.04493187 92.10750862 -60.47152954 84.97571657 -67 75.765625 C-75.91218136 60.0908128 -77.29644659 42.37873237 -73.0390625 25.05078125 C-69.01506196 12.3282833 -62.35093608 3.0577456 -50.8671875 -3.7578125 C-35.26628838 -11.792063 -14.21262388 -10.34595415 0 0 Z" fill="#FBFCFC" transform="translate(203,126.234375)" />
</svg>
`;

// Icônes vectorielles SVG strictes (Lucide React style)
const icons = {
  building: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
    </svg>`,
  kanban: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/>
    </svg>`,
  sparkles: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>`,
  shieldCheck: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 4.81 17 6 19 6a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>`,
  trendingUp: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>`,
  arrowRight: `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>`
};

// Réseau vectoriel SVG haute définition reproduisant et magnifiant la constellation de l'ancienne bannière
function getNetworkGraphSvg(width = 460, height = 320) {
  return `
<svg width="${width}" height="${height}" viewBox="0 0 460 320" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Filtre Glow Néon pour les nœuds -->
    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Dégradés de lignes -->
    <linearGradient id="lineGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B7A3E" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#22C55E" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#10B981" stop-opacity="0.4" />
    </linearGradient>

    <linearGradient id="lineGradSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22C55E" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.5" />
    </linearGradient>
  </defs>

  <!-- Arêtes / Lignes de connexion du réseau de données -->
  <g stroke-linecap="round" stroke-linejoin="round">
    <!-- Connexions principales -->
    <line x1="220" y1="155" x2="140" y2="80" stroke="url(#lineGradPrimary)" stroke-width="2.2" stroke-opacity="0.8" />
    <line x1="220" y1="155" x2="310" y2="95" stroke="url(#lineGradPrimary)" stroke-width="2.2" stroke-opacity="0.8" />
    <line x1="220" y1="155" x2="330" y2="200" stroke="url(#lineGradPrimary)" stroke-width="2.5" stroke-opacity="0.85" />
    <line x1="220" y1="155" x2="250" y2="250" stroke="url(#lineGradPrimary)" stroke-width="2.2" stroke-opacity="0.8" />
    <line x1="220" y1="155" x2="135" y2="210" stroke="url(#lineGradPrimary)" stroke-width="2" stroke-opacity="0.75" />
    <line x1="220" y1="155" x2="100" y2="150" stroke="url(#lineGradPrimary)" stroke-width="1.8" stroke-opacity="0.7" />

    <!-- Connexions secondaires du cluster (forme de constellation d'affaires) -->
    <line x1="140" y1="80" x2="100" y2="150" stroke="#16A34A" stroke-width="1.5" stroke-opacity="0.6" />
    <line x1="140" y1="80" x2="235" y2="60" stroke="#22C55E" stroke-width="1.6" stroke-opacity="0.65" />
    <line x1="235" y1="60" x2="310" y2="95" stroke="#16A34A" stroke-width="1.5" stroke-opacity="0.6" />
    <line x1="310" y1="95" x2="390" y2="70" stroke="#22C55E" stroke-width="1.3" stroke-opacity="0.5" />
    <line x1="310" y1="95" x2="330" y2="200" stroke="#10B981" stroke-width="1.8" stroke-opacity="0.65" />
    <line x1="330" y1="200" x2="410" y2="180" stroke="#16A34A" stroke-width="1.4" stroke-opacity="0.5" />
    <line x1="330" y1="200" x2="370" y2="270" stroke="#22C55E" stroke-width="1.5" stroke-opacity="0.6" />
    <line x1="250" y1="250" x2="370" y2="270" stroke="#10B981" stroke-width="1.2" stroke-opacity="0.5" />
    <line x1="250" y1="250" x2="180" y2="285" stroke="#16A34A" stroke-width="1.5" stroke-opacity="0.6" />
    <line x1="135" y1="210" x2="180" y2="285" stroke="#22C55E" stroke-width="1.5" stroke-opacity="0.6" />
    <line x1="135" y1="210" x2="80" y2="245" stroke="#16A34A" stroke-width="1.3" stroke-opacity="0.5" />
    <line x1="100" y1="150" x2="60" y2="110" stroke="#10B981" stroke-width="1.2" stroke-opacity="0.5" />
    <line x1="100" y1="150" x2="80" y2="245" stroke="#22C55E" stroke-width="1.3" stroke-opacity="0.5" />
    <line x1="60" y1="110" x2="140" y2="80" stroke="#16A34A" stroke-width="1.2" stroke-opacity="0.45" />

    <!-- Lignes d'extension vers l'extérieur (dynamisme) -->
    <line x1="390" y1="70" x2="445" y2="120" stroke="url(#lineGradSecondary)" stroke-width="1.2" stroke-opacity="0.4" stroke-dasharray="3 3" />
    <line x1="410" y1="180" x2="445" y2="120" stroke="url(#lineGradSecondary)" stroke-width="1.2" stroke-opacity="0.4" stroke-dasharray="3 3" />
    <line x1="60" y1="110" x2="25" y2="160" stroke="#16A34A" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="2 3" />
    <line x1="80" y1="245" x2="25" y2="160" stroke="#16A34A" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="2 3" />
  </g>

  <!-- Nœuds / Cercles avec lueurs et gradients -->
  <!-- Nœuds périphériques fins -->
  <circle cx="25" cy="160" r="5" fill="#1B7A3E" stroke="#4ADE80" stroke-width="1.5" opacity="0.6" />
  <circle cx="445" cy="120" r="5.5" fill="#1B7A3E" stroke="#F59E0B" stroke-width="1.5" opacity="0.7" />

  <!-- Nœuds satellites standard -->
  <circle cx="60" cy="110" r="7" fill="#15803D" stroke="#4ADE80" stroke-width="2" filter="url(#softGlow)" />
  <circle cx="80" cy="245" r="7.5" fill="#166534" stroke="#4ADE80" stroke-width="2" filter="url(#softGlow)" />
  <circle cx="180" cy="285" r="8" fill="#15803D" stroke="#22C55E" stroke-width="2" filter="url(#softGlow)" />
  <circle cx="370" cy="270" r="8.5" fill="#166534" stroke="#4ADE80" stroke-width="2" filter="url(#softGlow)" />
  <circle cx="410" cy="180" r="7" fill="#15803D" stroke="#22C55E" stroke-width="2" filter="url(#softGlow)" />
  <circle cx="390" cy="70" r="7.5" fill="#166534" stroke="#4ADE80" stroke-width="2" filter="url(#softGlow)" />
  <circle cx="235" cy="60" r="9" fill="#15803D" stroke="#22C55E" stroke-width="2.2" filter="url(#softGlow)" />

  <!-- Nœuds intermédiaires clés -->
  <circle cx="100" cy="150" r="11" fill="#166534" stroke="#4ADE80" stroke-width="2.5" filter="url(#softGlow)" />
  <circle cx="140" cy="80" r="13" fill="#15803D" stroke="#22C55E" stroke-width="2.5" filter="url(#softGlow)" />
  <circle cx="135" cy="210" r="12" fill="#166534" stroke="#4ADE80" stroke-width="2.5" filter="url(#softGlow)" />
  <circle cx="250" cy="250" r="13" fill="#15803D" stroke="#22C55E" stroke-width="2.5" filter="url(#softGlow)" />
  <circle cx="310" cy="95" r="14" fill="#166534" stroke="#4ADE80" stroke-width="2.5" filter="url(#softGlow)" />
  <circle cx="330" cy="200" r="15" fill="#15803D" stroke="#22C55E" stroke-width="3" filter="url(#softGlow)" />

  <!-- Nœud Central Hub - Écosystème Sales Companion 2.0 -->
  <!-- Halo externe pulsant -->
  <circle cx="220" cy="155" r="28" fill="rgba(34, 197, 94, 0.15)" />
  <circle cx="220" cy="155" r="23" fill="rgba(34, 197, 94, 0.25)" />
  <!-- Nœud principal -->
  <circle cx="220" cy="155" r="17" fill="#1B7A3E" stroke="#4ADE80" stroke-width="3.5" filter="url(#neonGlow)" />
  <!-- Cœur lumineux blanc-vert -->
  <circle cx="220" cy="155" r="7" fill="#FFFFFF" opacity="0.9" />
</svg>
`;
}

// =========================================================================
// BANNIÈRE V2 AMÉLIORÉE - FORMAT LINKEDIN (1584 x 396 px)
// Version épurée, ultra-tech, respectant l'esprit de l'ancienne bannière
// mais sans B2B, avec le logo officiel ScIcon et icônes vectorielles strictes.
// =========================================================================
function getImprovedLinkedInBannerHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1584px;
      height: 396px;
      background: #060911;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 64px;
    }

    /* Grille et fonds texturés de l'univers tech */
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.04) 1px, transparent 1px);
      background-size: 32px 32px, 64px 64px, 64px 64px;
      z-index: 1;
    }

    /* Halo vert néon immersif à droite (comme sur l'image originale mais magnifié) */
    .halo-right {
      position: absolute;
      top: -60px;
      right: -100px;
      width: 750px;
      height: 520px;
      background: radial-gradient(ellipse at center, rgba(27, 122, 62, 0.38) 0%, rgba(34, 197, 94, 0.15) 45%, rgba(6, 9, 17, 0) 75%);
      filter: blur(55px);
      z-index: 2;
      pointer-events: none;
    }

    /* Halo subtil à gauche pour équilibrer la composition */
    .halo-left {
      position: absolute;
      bottom: -150px;
      left: 10%;
      width: 500px;
      height: 400px;
      background: radial-gradient(circle, rgba(27, 122, 62, 0.12) 0%, transparent 70%);
      filter: blur(60px);
      z-index: 2;
      pointer-events: none;
    }

    /* Zone de contenu principale */
    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 60px;
    }

    /* Colonne Gauche : Identité & Message */
    .left-col {
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 820px;
      padding-left: 20px;
    }

    /* Badge surtitre officiel */
    .pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      background: rgba(27, 122, 62, 0.22);
      border: 1px solid rgba(74, 222, 128, 0.35);
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: #4ADE80;
      width: fit-content;
      margin-bottom: 14px;
      box-shadow: 0 0 15px rgba(34, 197, 94, 0.15);
    }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ADE80;
      box-shadow: 0 0 8px #4ADE80;
    }

    /* Bloc Titre avec Logo Officiel */
    .brand-row {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 12px;
    }

    .logo-container {
      width: 68px;
      height: 68px;
      border-radius: 18px;
      background: #0B1320;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px -4px rgba(27, 122, 62, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.14);
      flex-shrink: 0;
    }

    /* Le titre textuel avec glow néon vert inspiré de l'ancienne bannière */
    .main-title {
      font-family: 'Outfit', sans-serif;
      font-size: 50px;
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.05;
      color: #FFFFFF;
      /* Effet néon doux et propre */
      text-shadow: 0 0 20px rgba(34, 197, 94, 0.45), 0 0 45px rgba(27, 122, 62, 0.25);
    }

    .main-title .version-tag {
      font-weight: 900;
      background: linear-gradient(135deg, #4ADE80, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-left: 6px;
    }

    /* Sous-titre officiel - Remplace l'ancien "L'annuaire B2B des entreprises camerounaises" */
    .sub-title {
      font-size: 20px;
      font-weight: 500;
      color: #94A3B8;
      line-height: 1.4;
      margin-bottom: 20px;
      letter-spacing: -0.01em;
    }

    .sub-title strong {
      color: #E2E8F0;
      font-weight: 600;
    }

    /* Bandeau des 3 Piliers avec icônes vectorielles STRICTES (sans aucun emoji) */
    .features-strip {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 13.5px;
      font-weight: 600;
      color: #CBD5E1;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .feature-icon {
      color: #4ADE80;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Colonne Droite : Le Réseau de Nœuds Vectoriel Magnifié */
    .right-col {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
      margin-right: 10px;
    }

    /* Carte flottante badge de certification discrète */
    .geo-floating-badge {
      position: absolute;
      bottom: -10px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(11, 19, 32, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      color: #94A3B8;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    }

    .geo-floating-badge span.dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #F59E0B;
    }

    /* Footer discret */
    .banner-subfooter {
      position: absolute;
      bottom: 14px;
      left: 84px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 10;
    }

    .banner-subfooter .highlight-url {
      color: #22C55E;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="halo-right"></div>
  <div class="halo-left"></div>

  <div class="container">
    <!-- Zone Gauche -->
    <div class="left-col">
      <!-- Badge de positionnement -->
      <div class="pill-badge">
        <span class="pill-dot"></span>
        Workspace Commercial & Prospection
      </div>

      <!-- Marque & Logo officiel vectoriel -->
      <div class="brand-row">
        <div class="logo-container">
          ${svgScLogo(64)}
        </div>
        <h1 class="main-title">
          Sales Companion <span class="version-tag">2.0</span>
        </h1>
      </div>

      <!-- Sous-titre amélioré (sans terme B2B) -->
      <p class="sub-title">
        Le Workspace commercial de référence pour les <strong>entreprises camerounaises & africaines</strong>.
      </p>

      <!-- 3 Piliers Clés avec icônes vectorielles conformes à la Charte -->
      <div class="features-strip">
        <div class="feature-item">
          <span class="feature-icon">${icons.building}</span>
          <span>+50 000 Entreprises Vérifiées</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon" style="color: #60A5FA;">${icons.trendingUp}</span>
          <span>Pipeline CRM & Supervision 360°</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon" style="color: #FBBF24;">${icons.sparkles}</span>
          <span>Companion IA de Closing</span>
        </div>
      </div>
    </div>

    <!-- Zone Droite : Le Réseau de Nœuds (Reproduction fidèle et magnifiée de l'ancienne bannière) -->
    <div class="right-col">
      ${getNetworkGraphSvg(480, 330)}
      <div class="geo-floating-badge">
        <span class="dot"></span>
        <span>Douala · Yaoundé · CEMAC</span>
      </div>
    </div>
  </div>

  <div class="banner-subfooter">
    <span class="highlight-url">salescompanion2-0.com</span>
    <span>•</span>
    <span>L'intelligence commerciale au service du terrain</span>
  </div>
</body>
</html>
`;
}

// =========================================================================
// BANNIÈRE V2 AMÉLIORÉE - FORMAT TWITTER / X (1500 x 500 px)
// =========================================================================
function getImprovedTwitterBannerHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1500px;
      height: 500px;
      background: #060911;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 48px 70px;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.04) 1px, transparent 1px);
      background-size: 34px 34px, 68px 68px, 68px 68px;
      z-index: 1;
    }

    .halo-right {
      position: absolute;
      top: -30px;
      right: -80px;
      width: 780px;
      height: 560px;
      background: radial-gradient(ellipse at center, rgba(27, 122, 62, 0.38) 0%, rgba(34, 197, 94, 0.14) 45%, rgba(6, 9, 17, 0) 75%);
      filter: blur(55px);
      z-index: 2;
    }

    .top-row {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .logo-container {
      width: 64px;
      height: 64px;
      border-radius: 17px;
      background: #0B1320;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px -4px rgba(27, 122, 62, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.14);
    }

    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      text-shadow: 0 0 22px rgba(34, 197, 94, 0.45);
    }

    .brand-title .version {
      background: linear-gradient(135deg, #4ADE80, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .top-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 15px;
      background: rgba(27, 122, 62, 0.22);
      border: 1px solid rgba(74, 222, 128, 0.35);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4ADE80;
    }

    .middle-row {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 50px;
    }

    .text-block {
      max-width: 740px;
    }

    .tagline {
      font-size: 32px;
      font-weight: 800;
      line-height: 1.25;
      color: #F8FAFC;
      margin-bottom: 14px;
      letter-spacing: -0.02em;
    }

    .tagline span.accent {
      background: linear-gradient(135deg, #4ADE80, #10B981 50%, #F59E0B);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .desc {
      font-size: 16.5px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .pills-container {
      display: flex;
      gap: 16px;
    }

    .pill-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      color: #E2E8F0;
      backdrop-filter: blur(10px);
    }

    .pill-card .icon-wrap {
      color: #4ADE80;
      display: flex;
    }

    .bottom-row {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      padding-top: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #64748B;
    }

    .bottom-row .url {
      color: #22C55E;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="halo-right"></div>

  <div class="top-row">
    <div class="brand-wrap">
      <div class="logo-container">
        ${svgScLogo(60)}
      </div>
      <div class="brand-title">
        Sales Companion <span class="version">2.0</span>
      </div>
    </div>
    <div class="top-badge">
      Workspace Commercial & Prospection
    </div>
  </div>

  <div class="middle-row">
    <div class="text-block">
      <h2 class="tagline">
        Le Workspace commercial pour <span class="accent">identifier, prospecter et convertir</span> vos clients.
      </h2>
      <p class="desc">
        La première base d'entreprises qualifiée avec RCCM, NIU & contacts dirigeants, propulsée par un CRM d'équipe rigoureux et une IA d'assistance au closing.
      </p>

      <div class="pills-container">
        <div class="pill-card">
          <span class="icon-wrap">${icons.building}</span>
          <span>+50 000 Entreprises Vérifiées</span>
        </div>
        <div class="pill-card">
          <span class="icon-wrap" style="color: #60A5FA;">${icons.trendingUp}</span>
          <span>Supervision CRM 360°</span>
        </div>
        <div class="pill-card">
          <span class="icon-wrap" style="color: #FBBF24;">${icons.sparkles}</span>
          <span>Companion IA Closing</span>
        </div>
      </div>
    </div>

    <!-- Réseau de nœuds vectoriel -->
    <div>
      ${getNetworkGraphSvg(480, 310)}
    </div>
  </div>

  <div class="bottom-row">
    <span>🇨🇲 Conçu pour le Cameroun & l'Afrique · Douala · Yaoundé · CEMAC</span>
    <span class="url">salescompanion2-0.com</span>
  </div>
</body>
</html>
`;
}

// =========================================================================
// BANNIÈRE V2 AMÉLIORÉE - FORMAT OPEN GRAPH / PARTAGE WEB (1200 x 630 px)
// =========================================================================
function getImprovedOpenGraphBannerHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1200px;
      height: 630px;
      background: #060911;
      font-family: 'Plus Jakarta Sans', sans-serif;
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
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.04) 1px, transparent 1px);
      background-size: 38px 38px, 76px 76px, 76px 76px;
      z-index: 1;
    }

    .halo-right {
      position: absolute;
      top: 50%;
      right: -50px;
      transform: translateY(-50%);
      width: 700px;
      height: 550px;
      background: radial-gradient(ellipse at center, rgba(27, 122, 62, 0.38) 0%, rgba(34, 197, 94, 0.15) 50%, rgba(6, 9, 17, 0) 75%);
      filter: blur(60px);
      z-index: 2;
    }

    .header-row {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo-container {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      background: #0B1320;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 30px -4px rgba(27, 122, 62, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.15);
    }

    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 46px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      text-shadow: 0 0 25px rgba(34, 197, 94, 0.5);
    }

    .brand-title .version {
      background: linear-gradient(135deg, #4ADE80, #10B981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 18px;
      background: rgba(27, 122, 62, 0.25);
      border: 1px solid rgba(74, 222, 128, 0.4);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4ADE80;
    }

    .content-row {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
      margin: 20px 0;
    }

    .left-text {
      max-width: 620px;
    }

    .main-tagline {
      font-size: 38px;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
    }

    .main-tagline span.glow {
      background: linear-gradient(135deg, #4ADE80, #10B981 50%, #F59E0B);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .main-desc {
      font-size: 18px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feature-card-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 18px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      color: #F1F5F9;
      backdrop-filter: blur(12px);
    }

    .feature-card-item .icon-box {
      color: #4ADE80;
      display: flex;
    }

    .footer-row {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 18px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #64748B;
    }

    .footer-row .highlight {
      color: #22C55E;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="halo-right"></div>

  <div class="header-row">
    <div class="brand-wrap">
      <div class="logo-container">
        ${svgScLogo(72)}
      </div>
      <div class="brand-title">
        Sales Companion <span class="version">2.0</span>
      </div>
    </div>
    <div class="badge-pill">
      Workspace Commercial & Prospection
    </div>
  </div>

  <div class="content-row">
    <div class="left-text">
      <h2 class="main-tagline">
        Le Workspace commercial des <span class="glow">entreprises camerounaises & africaines</span>.
      </h2>
      <p class="main-desc">
        La plateforme complète pour qualifier vos cibles, structurer votre pipeline CRM et accélérer vos signatures grâce à l'IA.
      </p>

      <div class="features-list">
        <div class="feature-card-item">
          <span class="icon-box">${icons.building}</span>
          <span>Base certifiée de +50 000 Entreprises (RCCM, NIU & Dirigeants)</span>
        </div>
        <div class="feature-card-item">
          <span class="icon-box" style="color: #60A5FA;">${icons.trendingUp}</span>
          <span>Pipeline CRM & Portefeuille Actif rigoureusement encadré</span>
        </div>
        <div class="feature-card-item">
          <span class="icon-box" style="color: #FBBF24;">${icons.sparkles}</span>
          <span>Companion IA expert en closing et arguments d'impact terrain</span>
        </div>
      </div>
    </div>

    <!-- Réseau de nœuds vectoriel -->
    <div>
      ${getNetworkGraphSvg(460, 320)}
    </div>
  </div>

  <div class="footer-row">
    <span>🇨🇲 Douala · Yaoundé · CEMAC & Afrique</span>
    <span class="highlight">salescompanion2-0.com</span>
  </div>
</body>
</html>
`;
}

async function run() {
  console.log('🚀 Démarrage de la génération de la nouvelle bannière améliorée...');

  const artifactsDir = path.resolve('C:\\Users\\MEIK20\\.gemini\\antigravity\\brain\\145914e9-53ff-4bd1-a8f6-b1dc8bca6e31');
  const publicBannersDir = path.resolve(__dirname, '../apps/web/public/banners');

  if (!fs.existsSync(publicBannersDir)) {
    fs.mkdirSync(publicBannersDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const tasks = [
    {
      name: 'Bannière LinkedIn V2 Améliorée (1584 × 396 px)',
      filename: 'sales-companion-banner-linkedin-v2.png',
      width: 1584,
      height: 396,
      html: getImprovedLinkedInBannerHtml(),
      scale: 2
    },
    {
      name: 'Bannière Twitter/X V2 Améliorée (1500 × 500 px)',
      filename: 'sales-companion-banner-twitter-v2.png',
      width: 1500,
      height: 500,
      html: getImprovedTwitterBannerHtml(),
      scale: 2
    },
    {
      name: 'Bannière OpenGraph V2 Améliorée (1200 × 630 px)',
      filename: 'sales-companion-banner-opengraph-v2.png',
      width: 1200,
      height: 630,
      html: getImprovedOpenGraphBannerHtml(),
      scale: 2
    }
  ];

  for (const t of tasks) {
    console.log(`📸 Génération de : ${t.name}...`);
    const page = await browser.newPage({
      viewport: { width: t.width, height: t.height },
      deviceScaleFactor: t.scale
    });

    await page.setContent(t.html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Sauvegarde artifacts
    const artifactPath = path.join(artifactsDir, t.filename);
    await page.screenshot({ path: artifactPath, type: 'png' });
    console.log(`  ✅ Enregistré dans artifacts : ${artifactPath}`);

    // Sauvegarde public
    const publicPath = path.join(publicBannersDir, t.filename);
    await page.screenshot({ path: publicPath, type: 'png' });
    console.log(`  ✅ Enregistré dans public : ${publicPath}`);

    // Remplacement également des fichiers principaux officiels
    const standardName = t.filename.replace('-v2.png', '.png');
    const standardPublicPath = path.join(publicBannersDir, standardName);
    await page.screenshot({ path: standardPublicPath, type: 'png' });

    if (t.filename === 'sales-companion-banner-opengraph-v2.png') {
      const ogPath = path.resolve(__dirname, '../apps/web/public/og-image.png');
      await page.screenshot({ path: ogPath, type: 'png' });
      console.log(`  ✅ Mis à jour public/og-image.png !`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✨ Génération terminée avec succès !');
}

run().catch(err => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
