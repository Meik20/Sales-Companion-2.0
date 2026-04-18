#!/usr/bin/env node
/**
 * Génère un fichier .icns pour macOS à partir du SVG
 * Alternativement, utiliser iconutil (macOS seulement) ou ImageMagick
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const svgFile = path.join(rootDir, 'client', 'assets', 'icon.svg');
const clientAssetsDir = path.join(rootDir, 'client', 'assets');
const icnsPath = path.join(clientAssetsDir, 'icon.icns');

async function generateMacIcon() {
  try {
    console.log('🍎 Tentative de génération de l\'icône macOS (.icns)...');
    console.log('Note: Cette étape nécessite imagemagick ou ImageMagick');
    console.log('Alternativement, vous pouvez créer icon.icns via:');
    console.log('  1. Utiliser un service en ligne: https://cloudconvert.com/svg-to-icns');
    console.log('  2. Utiliser "iconutil" sur macOS: iconutil -c icns icon.iconset');
    console.log('  3. Installer ImageMagick et utiliser convert');
    console.log('');
    console.log('Pour Windows/Linux, créer une version PNG 256x256 comme fallback');
    
    // Vérifier si convert (ImageMagick) est disponible
    const { execSync } = require('child_process');
    try {
      execSync('convert --version', { stdio: 'ignore' });
      console.log('✅ ImageMagick détecté, génération en cours...');
      
      // Générer avec ImageMagick
      execSync(`convert "${svgFile}" -define icon:auto-resize=256,128,96,64,48,32,16 "${icnsPath}"`, {
        stdio: 'inherit'
      });
      console.log(`✅ icon.icns généré avec succès!`);
    } catch (e) {
      console.log('⚠️ ImageMagick non trouvé. Fichier .icns non créé.');
      console.log('Pour créer l\'icône macOS, voir instructions ci-dessus.');
      console.log('');
      console.log('Pour l\'instant, macOS utilisera le PNG comme fallback.');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

generateMacIcon();
