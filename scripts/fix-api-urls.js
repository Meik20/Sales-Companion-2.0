const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

// 1. Fix client hooks to use relative path ''
const hooksDir = path.join(__dirname, '../apps/web/src/features');
walkDir(hooksDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Match: const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    // Replace with: const backendUrl = '' // relative to hit Next.js API
    if (content.includes("const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'")) {
      content = content.replace(/const backendUrl = process\.env\.NEXT_PUBLIC_BACKEND_URL \|\| 'http:\/\/localhost:8000'/g, "const backendUrl = ''");
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed hook:', filePath);
    }
  }
});

// 2. Fix Next.js API routes to use process.env.BACKEND_URL or process.env.API_URL
const apiDir = path.join(__dirname, '../apps/web/src/app/api');
walkDir(apiDir, (filePath) => {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (content.includes("const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'")) {
      content = content.replace(/const backendUrl = process\.env\.NEXT_PUBLIC_BACKEND_URL \|\| 'http:\/\/localhost:8000'/g, "const backendUrl = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'");
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed API route:', filePath);
    }
  }
});
