const fs = require('fs');
const path = require('path');

// Créer les dossiers s'ils n'existent pas
const clientAssetsDir = path.join(__dirname, 'client', 'assets');
const mobileIconsDir = path.join(__dirname, 'mobile', 'icons');

if (!fs.existsSync(clientAssetsDir)) {
  fs.mkdirSync(clientAssetsDir, { recursive: true });
}
if (!fs.existsSync(mobileIconsDir)) {
  fs.mkdirSync(mobileIconsDir, { recursive: true });
}

// Fonction pour créer des PNG avec Canvas
function createIconPNG(width, height, filename) {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fond vert
  ctx.fillStyle = '#1B7A3E';
  ctx.fillRect(0, 0, width, height);

  // Arrondir les coins (facultatif pour les carrés)
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#1B7A3E';
  ctx.beginPath();
  const radius = width * 0.15;
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Texte "SC" blanc
  ctx.font = `bold ${Math.floor(width * 0.6)}px Arial, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SC', width / 2, height / 2);

  // Sauvegarder le PNG
  const buffer = canvas.toBuffer('image/png');
  return buffer;
}

// Tailles requises
const sizes = [
  { size: 72, dir: mobileIconsDir },
  { size: 96, dir: mobileIconsDir },
  { size: 128, dir: mobileIconsDir },
  { size: 144, dir: mobileIconsDir },
  { size: 152, dir: mobileIconsDir },
  { size: 192, dir: mobileIconsDir },
  { size: 256, dir: clientAssetsDir },
  { size: 384, dir: mobileIconsDir },
  { size: 512, dir: mobileIconsDir },
];

console.log('Tentative de génération des icônes PNG...');
console.log('Note: Cela nécessite le module "canvas" installé via npm');
