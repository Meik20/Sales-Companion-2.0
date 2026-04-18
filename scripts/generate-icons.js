#!/usr/bin/env node
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const svgFile = path.join(rootDir, 'client', 'assets', 'icon.svg');
const clientAssetsDir = path.join(rootDir, 'client', 'assets');
const mobileIconsDir = path.join(rootDir, 'mobile', 'icons');

// Créer les dossiers
[clientAssetsDir, mobileIconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Définir les tailles à générer
const sizes = [
  { size: 72, dir: mobileIconsDir, name: 'icon-72.png' },
  { size: 96, dir: mobileIconsDir, name: 'icon-96.png' },
  { size: 128, dir: mobileIconsDir, name: 'icon-128.png' },
  { size: 144, dir: mobileIconsDir, name: 'icon-144.png' },
  { size: 152, dir: mobileIconsDir, name: 'icon-152.png' },
  { size: 192, dir: mobileIconsDir, name: 'icon-192.png' },
  { size: 256, dir: clientAssetsDir, name: 'icon-256.png' },
  { size: 384, dir: mobileIconsDir, name: 'icon-384.png' },
  { size: 512, dir: mobileIconsDir, name: 'icon-512.png' },
];

async function generateIcons() {
  try {
    console.log('🎨 Génération des icônes "SC" à partir du SVG...');
    
    if (!fs.existsSync(svgFile)) {
      console.error(`❌ SVG source non trouvé: ${svgFile}`);
      process.exit(1);
    }

    let count = 0;
    for (const { size, dir, name } of sizes) {
      const outputPath = path.join(dir, name);
      await sharp(svgFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${name} (${size}x${size})`);
      count++;
    }

    // Générer le fichier ICO Windows (256x256 -> 32x32, 64x64, 128x128, 256x256)
    const icoSizes = [32, 64, 128, 256];
    const icoBuffers = [];
    
    for (const size of icoSizes) {
      const buffer = await sharp(svgFile)
        .resize(size, size, { fit: 'contain', background: { r: 27, g: 122, b: 62, alpha: 255 } })
        .png()
        .toBuffer();
      icoBuffers.push(buffer);
    }

    // Pour Windows .ico, on peut utiliser le format PNG pour simplifier
    // Ou créer manuellement un fichier ICO basique
    const icoPath = path.join(clientAssetsDir, 'icon.ico');
    const pngPath = path.join(clientAssetsDir, 'icon.png');
    
    // Copier le PNG 256x256 comme fallback pour ICO
    await sharp(svgFile)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 27, g: 122, b: 62, alpha: 255 }
      })
      .png()
      .toFile(pngPath);
    
    console.log(`✅ icon.png (256x256)`);

    // Créer un fichier ICO basique (en BMP format simplifié)
    // Pour un vrai .ico, il faudrait une libraire, donc on crée juste une référence PNG
    fs.copyFileSync(pngPath, icoPath);
    console.log(`✅ icon.ico (généré à partir du PNG 256x256)`);

    console.log(`\n✨ ${count} icônes générées avec succès!`);
    console.log(`📁 Client Assets: ${clientAssetsDir}`);
    console.log(`📁 Mobile Icons: ${mobileIconsDir}`);

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error.message);
    process.exit(1);
  }
}

generateIcons();
