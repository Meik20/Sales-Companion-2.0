#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyse la taille du bundle Next.js
 * 
 * Usage: node scripts/analyze-bundle.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DIST_DIR = path.join(__dirname, '../.next')

console.log('📊 Bundle Analysis for Sales Companion\n')

// Build si nécessaire
if (!fs.existsSync(DIST_DIR)) {
  console.log('🔨 Building project...')
  execSync('npm run build:web', { stdio: 'inherit' })
}

// Analyser les fichiers
const staticDir = path.join(DIST_DIR, 'static')
const serverDir = path.join(DIST_DIR, 'server')

function getSize(filePath) {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch (error) {
    return 0
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function analyzeDirectory(dir, label) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  ${label} not found: ${dir}`)
    return
  }

  console.log(`\n📁 ${label}`)
  console.log('=' .repeat(50))

  const files = []
  let totalSize = 0

  function walk(currentPath, relativePath = '') {
    const items = fs.readdirSync(currentPath)

    items.forEach((item) => {
      const fullPath = path.join(currentPath, item)
      const stat = fs.statSync(fullPath)
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item

      if (stat.isDirectory()) {
        walk(fullPath, itemRelativePath)
      } else if (item.endsWith('.js') || item.endsWith('.css')) {
        const size = stat.size
        files.push({
          name: itemRelativePath,
          size: size,
        })
        totalSize += size
      }
    })
  }

  walk(dir)

  // Sort by size descending
  files.sort((a, b) => b.size - a.size)

  // Display top 10 largest
  console.log('\nTop 10 largest files:')
  files.slice(0, 10).forEach((file, index) => {
    const percentage = ((file.size / totalSize) * 100).toFixed(1)
    console.log(
      `  ${(index + 1).toString().padEnd(2)} ${formatBytes(file.size).padEnd(10)} (${percentage}%) ${file.name}`
    )
  })

  console.log(`\nTotal size: ${formatBytes(totalSize)}`)
  console.log(`Files count: ${files.length}`)

  return { totalSize, files }
}

// Analyse JS chunks
const chunksAnalysis = analyzeDirectory(path.join(staticDir, 'chunks'), 'JS Chunks')

// Analyse CSS
const cssAnalysis = analyzeDirectory(
  path.join(DIST_DIR, '_next/static/css'),
  'CSS Chunks'
)

// Afficher recommendations
console.log('\n\n💡 Recommendations:')
console.log('=' .repeat(50))

if (chunksAnalysis && chunksAnalysis.totalSize > 500 * 1024) {
  console.log('⚠️  JS bundle is large (> 500KB). Consider:')
  console.log('   - Split code into more chunks')
  console.log('   - Lazy load heavy components')
  console.log('   - Review dependencies for duplication')
}

console.log('\n✅ Analysis complete!')
console.log('\nNext steps:')
console.log('  - Check .next/analyze/ for detailed breakdown')
console.log('  - Use webpack-bundle-analyzer for visualization')
console.log('  - Review imports and unused dependencies')
