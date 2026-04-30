const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../apps/web/public/favicon.svg');
const publicDir = path.join(__dirname, '../apps/web/public');

async function generateIcons() {
  try {
    console.log('📦 Generating PWA icons from favicon.svg...');
    
    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate 192x192
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ Created icon-192.png');
    
    // Generate 512x512
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ Created icon-512.png');
    
    // Generate apple-touch-icon (180x180)
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ Created apple-touch-icon.png');
    
    console.log('🎉 All PWA icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
