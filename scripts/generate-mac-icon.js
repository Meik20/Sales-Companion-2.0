#!/usr/bin/env node
/**
 * Génère un fichier .icns pour macOS à partir de SVG, PNG ou ICO
 * Alternativement, utiliser iconutil (macOS seulement) ou ImageMagick
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const clientAssetsDir = path.join(rootDir, 'client', 'assets');
const svgFile = path.join(clientAssetsDir, 'icon.svg');
const icoFile = path.join(clientAssetsDir, 'icon.ico');
const pngFile = path.join(clientAssetsDir, 'icon.png');
const icnsPath = path.join(clientAssetsDir, 'icon.icns');

const sourceFile = fs.existsSync(svgFile)
  ? svgFile
  : fs.existsSync(pngFile)
  ? pngFile
  : fs.existsSync(icoFile)
  ? icoFile
  : null;

if (!sourceFile) {
  console.error('❌ Aucune source d\'icône trouvée. Placez icon.svg, icon.png ou icon.ico dans client/assets.');
  process.exit(1);
}

async function generateMacIcon() {
  try {
    console.log(`🍎 Génération du fichier .icns à partir de ${path.basename(sourceFile)}...`);
    console.log('Note: Pour un .icns fiable, utiliser ImageMagick ou iconutil si disponible.');
    console.log('');

    const { execSync } = require('child_process');
    try {
      execSync('convert --version', { stdio: 'ignore' });
      console.log('✅ ImageMagick détecté, génération en cours...');
      execSync(`convert "${sourceFile}" -define icon:auto-resize=256,128,96,64,48,32,16 "${icnsPath}"`, {
        stdio: 'inherit'
      });
      console.log(`✅ icon.icns généré avec succès!`);
    } catch (e) {
      console.log('⚠️ ImageMagick non trouvé. Fichier .icns non créé.');
      console.log('Pour créer l\'icône macOS, voir les instructions du README ou utilisez iconutil sur macOS.');
      console.log('');
      console.log('Pour l\'instant, macOS utilisera icon.png comme fallback si disponible.');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

generateMacIcon();
