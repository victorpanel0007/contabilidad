// Simple script to create placeholder PNG icons
// This uses pure Node.js to write minimal valid PNGs
// Run: node scripts/create-placeholder-icons.js

const fs = require('fs')
const path = require('path')

const outputDir = path.join(__dirname, '../public/icons')
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

// Copy SVG to different sizes as placeholder
// The actual PNG generation should use: node scripts/generate-icons.js
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgContent = fs.readFileSync(path.join(outputDir, 'icon.svg'), 'utf8')

sizes.forEach(size => {
  const svg = svgContent.replace('width="512" height="512"', `width="${size}" height="${size}"`)
  fs.writeFileSync(path.join(outputDir, `icon-${size}.svg`), svg)
  console.log(`✓ icon-${size}.svg`)
})

console.log('\nNote: For production PNG icons, run: node scripts/generate-icons.js (requires canvas package)')
