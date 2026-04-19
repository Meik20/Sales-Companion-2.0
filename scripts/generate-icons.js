#!/usr/bin/env node
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const icojs = require('icojs');

const rootDir = path.resolve(__dirname, '..');
const clientAssetsDir = path.join(rootDir, 'client', 'assets');
const mobileIconsDir = path.join(rootDir, 'mobile', 'icons');
const icoSource = path.join(clientAssetsDir, 'icon.ico');
const svgSource = path.join(clientAssetsDir, 'icon.svg');
const pngSource = path.join(clientAssetsDir, 'icon.png');

const sourceFile = fs.existsSync(icoSource)
  ? icoSource
  : fs.existsSync(svgSource)
  ? svgSource
  : fs.existsSync(pngSource)
  ? pngSource
  : null;

if (!sourceFile) {
  console.error('❌ Aucune source d\'icône trouvée. Placez icon.ico, icon.svg ou icon.png dans client/assets.');
  process.exit(1);
}

const sourceType = path.extname(sourceFile).toLowerCase();
const iconSourceLabel = sourceType === '.ico' ? 'ICO' : sourceType === '.svg' ? 'SVG' : 'PNG';

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

function ensureDirectories() {
  [clientAssetsDir, mobileIconsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

async function loadIcoAsBuffer(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const images = await icojs.decodeIco(fileBuffer, 'image/png');
  if (!images.length) {
    throw new Error('Aucune image trouvée dans le fichier ICO.');
  }
  return images.reduce((best, image) => {
    return image.width > best.width ? image : best;
  }, images[0]).buffer;
}

async function getSharpInput() {
  if (sourceType === '.ico') {
    return await loadIcoAsBuffer(sourceFile);
  }
  return sourceFile;
}

async function generateIcons() {
  try {
    ensureDirectories();
    const sharpInput = await getSharpInput();
    console.log(`🎨 Génération des icônes à partir de ${iconSourceLabel}: ${sourceFile}`);

    let count = 0;
    for (const { size, dir, name } of sizes) {
      const outputPath = path.join(dir, name);
      await sharp(sharpInput)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ ${name} (${size}x${size})`);
      count++;
    }

    const iconPngPath = path.join(clientAssetsDir, 'icon.png');
    await sharp(sharpInput)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(iconPngPath);
    console.log('✅ icon.png (256x256)');

    const icoPath = path.join(clientAssetsDir, 'icon.ico');
    if (sourceType === '.ico') {
      if (path.resolve(sourceFile) !== path.resolve(icoPath)) {
        fs.copyFileSync(sourceFile, icoPath);
        console.log('✅ icon.ico copié depuis la source ICO');
      } else {
        console.log('✅ icon.ico source déjà présent');
      }
    } else {
      const tempPng = path.join(clientAssetsDir, 'icon-temp.png');
      await sharp(sharpInput)
        .resize(256, 256, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(tempPng);
      fs.copyFileSync(tempPng, icoPath);
      fs.unlinkSync(tempPng);
      console.log('✅ icon.ico généré en tant que fallback depuis PNG');
    }

    console.log(`\n✨ ${count + 1} icônes générées avec succès !`);
    console.log(`📁 Client Assets: ${clientAssetsDir}`);
    console.log(`📁 Mobile Icons: ${mobileIconsDir}`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes :', error.message);
    process.exit(1);
  }
}

generateIcons();
