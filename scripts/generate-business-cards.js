const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Monogramme SVG vectoriel officiel centré de Sales Companion 2.0 (<ScIcon />)
const svgScLogo = (size = 80, bgFill = "#1B7A3E") => `
<svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.30868945 59.22110435 199.3156565 60.93707796 199.32377625 62.65304565 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.39393171 173.17015282 199.39626591 178.00822924 199.41354179 182.84646225 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.40257205 198.16539178 199.40559649 199.82777486 199.41612244 201.49009705 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C140.08187416 256.81381641 138.36590055 256.82078345 136.64993286 256.8289032 C132.01344825 256.84677063 127.37715356 256.84567825 122.74064493 256.83996081 C118.85917783 256.83685939 114.97774671 256.84297205 111.09628475 256.84899956 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C74.18003921 256.83862091 64.75196458 256.85268979 55.32364285 256.87949413 C47.20610312 256.90170134 39.0886524 256.90827715 30.97108448 256.90241772 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C11.90417847 256.93421589 7.35225991 256.93009682 2.7999382 256.9113636 C1.13758673 256.907699 -0.52479635 256.91072344 -2.18711853 256.92124939 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.51083789 197.58700111 -57.51780494 195.87102751 -57.52592468 194.15505981 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.53388087 176.36430479 -57.53999354 172.48287366 -57.54602104 168.6014117 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.5356424 131.68516616 -57.54971128 122.25709154 -57.57651561 112.8287698 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.59608015 83.63795265 -57.59841435 78.79987623 -57.61569023 73.96164322 C-57.63123737 69.40930542 -57.62711831 64.85738686 -57.60838509 60.30506516 C-57.60472048 58.64271368 -57.60774492 56.98033061 -57.61827087 55.31800842 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="${bgFill}" transform="translate(57.10107421875,-0.404052734375)" />
  <path d="M0 0 C6.76365202 5.7170139 10.73854026 11.18270269 11.80078125 20.01171875 C11.89980059 21.34397901 11.98899858 22.67721318 12.05078125 24.01171875 C7.61292515 25.12337107 3.28121739 25.12699638 -1.26171875 25.07421875 C-2.00228516 25.06970703 -2.74285156 25.06519531 -3.50585938 25.06054688 C-5.32034774 25.0488405 -7.13479409 25.03090773 -8.94921875 25.01171875 C-9.22765625 23.91601562 -9.50609375 22.8203125 -9.79296875 21.69140625 C-11.10130964 17.52769976 -12.66136881 15.8063912 -15.94921875 13.01171875 C-19.17291702 11.39986962 -22.66110586 11.78550438 -26.19921875 11.76171875 C-26.95074219 11.74109375 -27.70226562 11.72046875 -28.4765625 11.69921875 C-33.3719832 11.66504478 -36.72524574 12.27253625 -40.94921875 15.01171875 C-43.11472991 18.25998549 -43.50078828 19.24266032 -42.94921875 23.01171875 C-38.08128243 30.31362323 -27.00883233 31.52187122 -19.07421875 33.38671875 C-8.32858133 35.94071694 4.06521138 39.43801152 10.48046875 49.18359375 C15.12171532 57.20744375 16.41880807 64.65954326 14.4375 73.859375 C11.8781828 81.87556235 7.61973471 88.33689726 0.26171875 92.64453125 C-8.15003463 96.61233945 -15.44156369 97.21689167 -24.63671875 97.26171875 C-25.67505859 97.28234375 -26.71339844 97.30296875 -27.78320312 97.32421875 C-38.58269047 97.37838546 -47.59991007 95.07898387 -55.94921875 88.01171875 C-62.8864151 80.82731718 -65.94921875 72.90375619 -65.94921875 63.01171875 C-59.67921875 62.35171875 -53.40921875 61.69171875 -46.94921875 61.01171875 C-46.24796875 62.88859375 -45.54671875 64.76546875 -44.82421875 66.69921875 C-42.60028081 72.05688742 -40.83844964 74.92937754 -35.94921875 78.01171875 C-29.65099205 80.11112765 -20.05915328 80.26326888 -13.76171875 77.82421875 C-10.54099717 75.74864262 -8.78886545 74.39666868 -6.94921875 71.01171875 C-6.35720399 67.88967867 -6.06516904 65.08118326 -6.94921875 62.01171875 C-11.22574129 57.15579638 -17.43731324 56.18200038 -23.44921875 54.57421875 C-25.61944398 53.96170486 -27.7887276 53.3458444 -29.95703125 52.7265625 C-30.99504883 52.43120605 -32.03306641 52.13584961 -33.10253906 51.83154297 C-44.24578888 48.62236348 -53.63891512 44.76338276 -60.453125 34.81640625 C-63.70302604 28.49778331 -64.00700516 21.65784213 -62.44140625 14.78125 C-60.03064978 7.6182552 -55.98988318 1.82376963 -49.3515625 -1.921875 C-34.92840123 -8.32435147 -13.40870391 -9.03977522 0 0 Z" fill="#FBFCFB" transform="translate(104.94921875,82.76797)" />
  <path d="M0 0 C5.56900635 4.91638842 9.61305685 10.74520397 12 17.765625 C12 18.755625 12 19.745625 12 20.765625 C-1.6332574 25.17336987 -1.6332574 25.17336987 -8 25.765625 C-8.45439453 24.75242187 -8.45439453 24.75242187 -8.91796875 23.71875 C-11.87571009 17.42103612 -14.18581689 13.58190267 -20.625 10.515625 C-27.78544256 8.92441554 -34.73421156 8.66371123 -41.21875 12.4375 C-48.04183464 17.52488767 -51.72431369 24.40652263 -53 32.765625 C-53.8680591 46.02921075 -53.23496924 57.13883581 -47.3125 69.203125 C-43.38585324 73.55427411 -39.11209193 76.29704298 -33.25 77.1796875 C-25.85394722 77.405678 -19.81274293 76.38213005 -14.3125 71.265625 C-11.06248929 66.91016847 -9.08406112 61.749635 -7 56.765625 C-0.45044429 58.24854327 5.72318367 60.38874235 12 62.765625 C10.45955828 73.20639663 5.33543097 81.67448477 -2.88671875 88.33203125 C-13.96916596 95.85006845 -27.0548355 95.93239973 -40 94.765625 C-51.04493187 92.10750862 -60.47152954 84.97571657 -67 75.765625 C-75.91218136 60.0908128 -77.29644659 42.37873237 -73.0390625 25.05078125 C-69.01506196 12.3282833 -62.35093608 3.0577456 -50.8671875 -3.7578125 C-35.26628838 -11.792063 -14.21262388 -10.34595415 0 0 Z" fill="#FBFCFC" transform="translate(203,85.014065)" />
</svg>
`;

// Icônes vectorielles strictes (Lucide React style)
const icons = {
  phone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  mapPin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  shieldCheck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 4.81 17 6 19 6a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  qrCode: `<svg width="120" height="120" viewBox="0 0 120 120" fill="currentColor">
    <path d="M10 10h35v35H10zM18 18v19h19V18zm57-8h35v35H75zm8 8v19h19V18zM10 75h35v35H10zm8 8v19h19V83zm60-8h10v10H78zm15 0h10v10H93zm-15 15h10v10H78zm25 0h10v10h-10zm-10 10h10v10H93zm10 10h10v10h-10zm-20-10h10v10H83zm-15-5h10v10H68zm-8-25h10v10H60zm0 15h10v10H60zm0 15h10v10H60zm-5-30h10v10H55zm0 20h10v10H55zm0 15h10v10H55zM24 24h7v7h-7zm65 0h7v7h-7zM24 89h7v7h-7z"/>
    <rect x="42" y="42" width="36" height="36" rx="8" fill="#FFFFFF"/>
    <g transform="translate(45, 45) scale(0.1171875)">
      <path d="M0 0 C1.7159774 -0.00571094 3.43195101 -0.01267798 5.1479187 -0.02079773 C9.78440331 -0.03866516 14.420698 -0.03757278 19.05720663 -0.03185534 C22.93867373 -0.02875392 26.82010485 -0.03486658 30.70156682 -0.04089409 C39.86422633 -0.0549169 49.02679256 -0.05339698 58.18945312 -0.04199219 C67.61781236 -0.03051545 77.04588698 -0.04458433 86.47420871 -0.07138866 C94.59174844 -0.09359587 102.70919916 -0.10017168 110.82676709 -0.09431225 C115.66502586 -0.0909532 120.50310229 -0.09328739 125.3413353 -0.11056328 C129.8936731 -0.12611042 134.44559166 -0.12199135 138.99791336 -0.10325813 C140.66026483 -0.09959353 142.32264791 -0.10261797 143.98497009 -0.11314392 C159.71978438 -0.20510452 173.23259887 3.06255643 185.08642578 14.02905273 C197.16983172 26.84626875 199.35371432 40.68318478 199.30297852 57.50512695 C199.30868945 59.22110435 199.3156565 60.93707796 199.32377625 62.65304565 C199.34164368 67.28953027 199.34055129 71.92582495 199.33483386 76.56233358 C199.33173243 80.44380068 199.3378451 84.32523181 199.34387261 88.20669377 C199.35789542 97.36935328 199.3563755 106.53191952 199.3449707 115.69458008 C199.33349396 125.12293931 199.34756284 134.55101393 199.37436718 143.97933567 C199.39657439 152.09687539 199.4031502 160.21432611 199.39729077 168.33189404 C199.39393171 173.17015282 199.39626591 178.00822924 199.41354179 182.84646225 C199.42908894 187.39880005 199.42496987 191.95071861 199.40623665 196.50304031 C199.40257205 198.16539178 199.40559649 199.82777486 199.41612244 201.49009705 C199.51072605 217.6771408 195.8756987 230.92781239 184.71142578 243.15405273 C172.1196704 254.89882906 158.19775869 256.8575684 141.79785156 256.80810547 C140.08187416 256.81381641 138.36590055 256.82078345 136.64993286 256.8289032 C132.01344825 256.84677063 127.37715356 256.84567825 122.74064493 256.83996081 C118.85917783 256.83685939 114.97774671 256.84297205 111.09628475 256.84899956 C101.93362523 256.86302237 92.771059 256.86150245 83.60839844 256.85009766 C74.18003921 256.83862091 64.75196458 256.85268979 55.32364285 256.87949413 C47.20610312 256.90170134 39.0886524 256.90827715 30.97108448 256.90241772 C26.1328257 256.89905867 21.29474927 256.90139286 16.45651627 256.91866875 C11.90417847 256.93421589 7.35225991 256.93009682 2.7999382 256.9113636 C1.13758673 256.907699 -0.52479635 256.91072344 -2.18711853 256.92124939 C-18.37416229 257.015853 -31.62483387 253.38082565 -43.85107422 242.21655273 C-55.59585054 229.62479735 -57.55458988 215.70288564 -57.50512695 199.30297852 C-57.51083789 197.58700111 -57.51780494 195.87102751 -57.52592468 194.15505981 C-57.54379212 189.5185752 -57.54269973 184.88228052 -57.5369823 180.24577188 C-57.53388087 176.36430479 -57.53999354 172.48287366 -57.54602104 168.6014117 C-57.56004385 159.43875219 -57.55852393 150.27618595 -57.54711914 141.11352539 C-57.5356424 131.68516616 -57.54971128 122.25709154 -57.57651561 112.8287698 C-57.59872283 104.71123007 -57.60529863 96.59377936 -57.5994392 88.47621143 C-57.59608015 83.63795265 -57.59841435 78.79987623 -57.61569023 73.96164322 C-57.63123737 69.40930542 -57.62711831 64.85738686 -57.60838509 60.30506516 C-57.60472048 58.64271368 -57.60774492 56.98033061 -57.61827087 55.31800842 C-57.71023147 39.58319413 -54.44257052 26.07037965 -43.47607422 14.21655273 C-30.65885821 2.1331468 -16.82194217 -0.05073581 0 0 Z" fill="#1B7A3E" transform="translate(57.10107421875,-0.404052734375)" />
      <path d="M0 0 C6.76365202 5.7170139 10.73854026 11.18270269 11.80078125 20.01171875 C11.89980059 21.34397901 11.98899858 22.67721318 12.05078125 24.01171875 C7.61292515 25.12337107 3.28121739 25.12699638 -1.26171875 25.07421875 C-2.00228516 25.06970703 -2.74285156 25.06519531 -3.50585938 25.06054688 C-5.32034774 25.0488405 -7.13479409 25.03090773 -8.94921875 25.01171875 C-9.22765625 23.91601562 -9.50609375 22.8203125 -9.79296875 21.69140625 C-11.10130964 17.52769976 -12.66136881 15.8063912 -15.94921875 13.01171875 C-19.17291702 11.39986962 -22.66110586 11.78550438 -26.19921875 11.76171875 C-26.95074219 11.74109375 -27.70226562 11.72046875 -28.4765625 11.69921875 C-33.3719832 11.66504478 -36.72524574 12.27253625 -40.94921875 15.01171875 C-43.11472991 18.25998549 -43.50078828 19.24266032 -42.94921875 23.01171875 C-38.08128243 30.31362323 -27.00883233 31.52187122 -19.07421875 33.38671875 C-8.32858133 35.94071694 4.06521138 39.43801152 10.48046875 49.18359375 C15.12171532 57.20744375 16.41880807 64.65954326 14.4375 73.859375 C11.8781828 81.87556235 7.61973471 88.33689726 0.26171875 92.64453125 C-8.15003463 96.61233945 -15.44156369 97.21689167 -24.63671875 97.26171875 C-25.67505859 97.28234375 -26.71339844 97.30296875 -27.78320312 97.32421875 C-38.58269047 97.37838546 -47.59991007 95.07898387 -55.94921875 88.01171875 C-62.8864151 80.82731718 -65.94921875 72.90375619 -65.94921875 63.01171875 C-59.67921875 62.35171875 -53.40921875 61.69171875 -46.94921875 61.01171875 C-46.24796875 62.88859375 -45.54671875 64.76546875 -44.82421875 66.69921875 C-42.60028081 72.05688742 -40.83844964 74.92937754 -35.94921875 78.01171875 C-29.65099205 80.11112765 -20.05915328 80.26326888 -13.76171875 77.82421875 C-10.54099717 75.74864262 -8.78886545 74.39666868 -6.94921875 71.01171875 C-6.35720399 67.88967867 -6.06516904 65.08118326 -6.94921875 62.01171875 C-11.22574129 57.15579638 -17.43731324 56.18200038 -23.44921875 54.57421875 C-25.61944398 53.96170486 -27.7887276 53.3458444 -29.95703125 52.7265625 C-30.99504883 52.43120605 -32.03306641 52.13584961 -33.10253906 51.83154297 C-44.24578888 48.62236348 -53.63891512 44.76338276 -60.453125 34.81640625 C-63.70302604 28.49778331 -64.00700516 21.65784213 -62.44140625 14.78125 C-60.03064978 7.6182552 -55.98988318 1.82376963 -49.3515625 -1.921875 C-34.92840123 -8.32435147 -13.40870391 -9.03977522 0 0 Z" fill="#FBFCFB" transform="translate(104.94921875,82.76797)" />
      <path d="M0 0 C5.56900635 4.91638842 9.61305685 10.74520397 12 17.765625 C12 18.755625 12 19.745625 12 20.765625 C-1.6332574 25.17336987 -1.6332574 25.17336987 -8 25.765625 C-8.45439453 24.75242187 -8.45439453 24.75242187 -8.91796875 23.71875 C-11.87571009 17.42103612 -14.18581689 13.58190267 -20.625 10.515625 C-27.78544256 8.92441554 -34.73421156 8.66371123 -41.21875 12.4375 C-48.04183464 17.52488767 -51.72431369 24.40652263 -53 32.765625 C-53.8680591 46.02921075 -53.23496924 57.13883581 -47.3125 69.203125 C-43.38585324 73.55427411 -39.11209193 76.29704298 -33.25 77.1796875 C-25.85394722 77.405678 -19.81274293 76.38213005 -14.3125 71.265625 C-11.06248929 66.91016847 -9.08406112 61.749635 -7 56.765625 C-0.45044429 58.24854327 5.72318367 60.38874235 12 62.765625 C10.45955828 73.20639663 5.33543097 81.67448477 -2.88671875 88.33203125 C-13.96916596 95.85006845 -27.0548355 95.93239973 -40 94.765625 C-51.04493187 92.10750862 -60.47152954 84.97571657 -67 75.765625 C-75.91218136 60.0908128 -77.29644659 42.37873237 -73.0390625 25.05078125 C-69.01506196 12.3282833 -62.35093608 3.0577456 -50.8671875 -3.7578125 C-35.26628838 -11.792063 -14.21262388 -10.34595415 0 0 Z" fill="#FBFCFC" transform="translate(203,85.014065)" />
    </g>
  </svg>`
};

// =========================================================================
// MODÈLE 1 : OBSIDIAN DEEP (Mode Sombre Prestige SaaS)
// =========================================================================
function getDarkRectoHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1020px;
      height: 660px;
      background: #0B0F17;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0),
        linear-gradient(to right, rgba(27, 122, 62, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(27, 122, 62, 0.05) 1px, transparent 1px);
      background-size: 34px 34px, 68px 68px, 68px 68px;
    }
    .halo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      height: 400px;
      background: radial-gradient(circle, rgba(27, 122, 62, 0.25) 0%, transparent 70%);
      filter: blur(50px);
    }
    .card-border {
      position: absolute;
      inset: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      pointer-events: none;
    }
    .content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo-wrap {
      margin-bottom: 24px;
      filter: drop-shadow(0 12px 28px rgba(27, 122, 62, 0.5));
    }
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 44px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    .brand-title .version {
      color: #1B7A3E;
      margin-left: 6px;
    }
    .baseline {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #94A3B8;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="halo"></div>
  <div class="card-border"></div>
  <div class="content">
    <div class="logo-wrap">${svgScLogo(100)}</div>
    <h1 class="brand-title">Sales Companion <span class="version">2.0</span></h1>
    <p class="baseline">Workspace Commercial & Prospection</p>
  </div>
</body>
</html>
`;
}

function getDarkVersoHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1020px;
      height: 660px;
      background: #0B0F17;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 56px 64px;
    }
    .card-border {
      position: absolute;
      inset: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      pointer-events: none;
    }
    .accent-bar {
      position: absolute;
      left: 24px;
      top: 50px;
      bottom: 50px;
      width: 4px;
      background: #1B7A3E;
      border-radius: 4px;
    }
    .left-col {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      max-width: 580px;
      padding-left: 20px;
    }
    .person-name {
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      font-weight: 600;
      color: #FFFFFF;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .person-title {
      font-size: 15px;
      font-weight: 500;
      color: #2F5BEA;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 28px;
    }
    .contacts-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 14.5px;
      color: #CBD5E1;
      font-weight: 500;
    }
    .contact-icon {
      color: #1B7A3E;
      display: flex;
    }
    .right-col {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      background: #121826;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
    }
    .qr-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94A3B8;
      text-align: center;
    }
    .url-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #34D399;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card-border"></div>
  <div class="accent-bar"></div>

  <div class="left-col">
    <div>
      <h2 class="person-name">Direction Commerciale</h2>
      <p class="person-title">Sales Companion 2.0 · Espace Entreprises</p>
    </div>

    <div class="contacts-list">
      <div class="contact-item">
        <span class="contact-icon">${icons.phone}</span>
        <span>+237 670 12 34 56 · +237 690 98 76 54</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.mail}</span>
        <span>contact@salescompanion2-0.com</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.globe}</span>
        <span>https://salescompanion2-0.com</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.mapPin}</span>
        <span>Douala (Bonanjo) · Yaoundé · Espace CEMAC</span>
      </div>
    </div>

    <div style="font-size: 11px; color: #64748B;">
      Identification Fiscale & RCCM vérifiés · Conforme CEMAC
    </div>
  </div>

  <div class="right-col">
    <div style="color: #FFFFFF;">${icons.qrCode}</div>
    <div class="qr-label">Scanner pour accéder au Workspace</div>
    <div class="url-tag">salescompanion2-0.com</div>
  </div>
</body>
</html>
`;
}

// =========================================================================
// MODÈLE 2 : FINTECH NETTE (Mode Clair Prestige & Rigueur)
// =========================================================================
function getLightRectoHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1020px;
      height: 660px;
      background: #FFFFFF;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #101828;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    .top-strip {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: #1B7A3E;
    }
    .card-border {
      position: absolute;
      inset: 24px;
      border: 1px solid #E6E8EC;
      border-radius: 20px;
      pointer-events: none;
    }
    .content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo-wrap {
      margin-bottom: 24px;
      filter: drop-shadow(0 10px 24px rgba(27, 122, 62, 0.25));
    }
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 44px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #101828;
      margin-bottom: 10px;
    }
    .brand-title .version {
      color: #1B7A3E;
      margin-left: 6px;
    }
    .baseline {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #64748B;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="card-border"></div>
  <div class="content">
    <div class="logo-wrap">${svgScLogo(100)}</div>
    <h1 class="brand-title">Sales Companion <span class="version">2.0</span></h1>
    <p class="baseline">Workspace Commercial & Prospection</p>
  </div>
</body>
</html>
`;
}

function getLightVersoHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1020px;
      height: 660px;
      background: #F7F8FA;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #101828;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 56px 64px;
    }
    .card-border {
      position: absolute;
      inset: 24px;
      border: 1px solid #E6E8EC;
      background: #FFFFFF;
      border-radius: 20px;
      pointer-events: none;
    }
    .accent-bar {
      position: absolute;
      left: 24px;
      top: 50px;
      bottom: 50px;
      width: 4px;
      background: #2F5BEA;
      border-radius: 4px;
    }
    .left-col {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      max-width: 580px;
      padding-left: 20px;
    }
    .person-name {
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      font-weight: 600;
      color: #101828;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .person-title {
      font-size: 15px;
      font-weight: 600;
      color: #1B7A3E;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 28px;
    }
    .contacts-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 14.5px;
      color: #334155;
      font-weight: 500;
    }
    .contact-icon {
      color: #2F5BEA;
      display: flex;
    }
    .right-col {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
    }
    .qr-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748B;
      text-align: center;
    }
    .url-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #1B7A3E;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card-border"></div>
  <div class="accent-bar"></div>

  <div class="left-col">
    <div>
      <h2 class="person-name">Direction Commerciale</h2>
      <p class="person-title">Sales Companion 2.0 · Espace Entreprises</p>
    </div>

    <div class="contacts-list">
      <div class="contact-item">
        <span class="contact-icon">${icons.phone}</span>
        <span>+237 670 12 34 56 · +237 690 98 76 54</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.mail}</span>
        <span>contact@salescompanion2-0.com</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.globe}</span>
        <span>https://salescompanion2-0.com</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.mapPin}</span>
        <span>Douala (Bonanjo) · Yaoundé · Espace CEMAC</span>
      </div>
    </div>

    <div style="font-size: 11px; color: #94A3B8;">
      Identification Fiscale & RCCM vérifiés · Conforme CEMAC
    </div>
  </div>

  <div class="right-col">
    <div style="color: #0F172A;">${icons.qrCode}</div>
    <div class="qr-label">Scanner pour accéder au Workspace</div>
    <div class="url-tag">salescompanion2-0.com</div>
  </div>
</body>
</html>
`;
}

// =========================================================================
// MODÈLE 3 : SIGNATURE VERT CAMEROUN (#1B7A3E Éxécutif)
// =========================================================================
function getExecutiveRectoHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1020px;
      height: 660px;
      background: #1B7A3E;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    .halo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 500px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
      filter: blur(40px);
    }
    .card-border {
      position: absolute;
      inset: 24px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      pointer-events: none;
    }
    .content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo-wrap {
      margin-bottom: 24px;
      filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.25));
    }
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 46px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      margin-bottom: 10px;
    }
    .brand-title .version {
      color: #BBF7D0;
      margin-left: 6px;
    }
    .baseline {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #DCFCE7;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="halo"></div>
  <div class="card-border"></div>
  <div class="content">
    <div class="logo-wrap">${svgScLogo(110, '#0F5128')}</div>
    <h1 class="brand-title">Sales Companion <span class="version">2.0</span></h1>
    <p class="baseline">Workspace Commercial & Prospection</p>
  </div>
</body>
</html>
`;
}

function getExecutiveVersoHtml() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1020px;
      height: 660px;
      background: #0B0F17;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 56px 64px;
    }
    .card-border {
      position: absolute;
      inset: 24px;
      border: 1px solid rgba(27, 122, 62, 0.4);
      border-radius: 20px;
      pointer-events: none;
    }
    .top-strip {
      position: absolute;
      top: 24px;
      left: 24px;
      right: 24px;
      height: 4px;
      background: linear-gradient(to right, #1B7A3E, #2F5BEA);
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
    }
    .left-col {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      max-width: 580px;
      padding-top: 10px;
    }
    .person-name {
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      font-weight: 600;
      color: #FFFFFF;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .person-title {
      font-size: 15px;
      font-weight: 500;
      color: #34D399;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 28px;
    }
    .contacts-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 14.5px;
      color: #CBD5E1;
      font-weight: 500;
    }
    .contact-icon {
      color: #1B7A3E;
      display: flex;
    }
    .right-col {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      background: rgba(27, 122, 62, 0.12);
      border: 1px solid rgba(27, 122, 62, 0.35);
      border-radius: 16px;
    }
    .qr-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94A3B8;
      text-align: center;
    }
    .url-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #34D399;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card-border"></div>
  <div class="top-strip"></div>

  <div class="left-col">
    <div>
      <h2 class="person-name">Direction Commerciale</h2>
      <p class="person-title">Sales Companion 2.0 · Espace Entreprises</p>
    </div>

    <div class="contacts-list">
      <div class="contact-item">
        <span class="contact-icon">${icons.phone}</span>
        <span>+237 670 12 34 56 · +237 690 98 76 54</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.mail}</span>
        <span>contact@salescompanion2-0.com</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.globe}</span>
        <span>https://salescompanion2-0.com</span>
      </div>
      <div class="contact-item">
        <span class="contact-icon">${icons.mapPin}</span>
        <span>Douala (Bonanjo) · Yaoundé · Espace CEMAC</span>
      </div>
    </div>

    <div style="font-size: 11px; color: #64748B;">
      Identification Fiscale & RCCM vérifiés · Conforme CEMAC
    </div>
  </div>

  <div class="right-col">
    <div style="color: #FFFFFF;">${icons.qrCode}</div>
    <div class="qr-label">Scanner pour accéder au Workspace</div>
    <div class="url-tag">salescompanion2-0.com</div>
  </div>
</body>
</html>
`;
}

async function run() {
  console.log('🚀 Démarrage de la génération des cartes de visite officielles Sales Companion 2.0...');

  const artifactsDir = path.resolve('C:\\Users\\MEIK20\\.gemini\\antigravity\\brain\\145914e9-53ff-4bd1-a8f6-b1dc8bca6e31');
  const publicDir = path.resolve(__dirname, '../apps/web/public/cards');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const targets = [
    { name: 'Modèle 1 Sombre (Obsidian Deep) - Recto', file: 'business-card-dark-recto.png', html: getDarkRectoHtml() },
    { name: 'Modèle 1 Sombre (Obsidian Deep) - Verso', file: 'business-card-dark-verso.png', html: getDarkVersoHtml() },
    { name: 'Modèle 2 Clair (Fintech Nette) - Recto', file: 'business-card-light-recto.png', html: getLightRectoHtml() },
    { name: 'Modèle 2 Clair (Fintech Nette) - Verso', file: 'business-card-light-verso.png', html: getLightVersoHtml() },
    { name: 'Modèle 3 Signature Vert (#1B7A3E) - Recto', file: 'business-card-executive-recto.png', html: getExecutiveRectoHtml() },
    { name: 'Modèle 3 Signature Vert (#1B7A3E) - Verso', file: 'business-card-executive-verso.png', html: getExecutiveVersoHtml() },
  ];

  const browser = await chromium.launch({ headless: true });

  for (const t of targets) {
    console.log(`📸 Génération de : ${t.name}...`);
    const page = await browser.newPage({
      viewport: { width: 1020, height: 660 },
      deviceScaleFactor: 2 // Rendu net haute définition 2x
    });

    await page.setContent(t.html, { waitUntil: 'networkidle' });
    // Attendre le chargement des fonts
    await page.evaluate(() => document.fonts.ready);

    const artifactPath = path.join(artifactsDir, t.file);
    const publicPath = path.join(publicDir, t.file);

    await page.screenshot({ path: artifactPath, type: 'png' });
    await page.screenshot({ path: publicPath, type: 'png' });

    console.log(`  ✅ Enregistré dans artifacts : ${artifactPath}`);
    console.log(`  ✅ Enregistré dans public : ${publicPath}`);

    await page.close();
  }

  await browser.close();
  console.log('\n✨ Toutes les cartes de visite ont été générées avec succès !');
}

run().catch((err) => {
  console.error('❌ Erreur lors de la génération :', err);
  process.exit(1);
});
