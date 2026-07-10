// Node.js script to generate PWA icons using Canvas API
// Run with: node scripts/generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(__dirname, '../public/icons')

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const r = size * 0.22

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#6366f1')
  grad.addColorStop(1, '#8b5cf6')
  ctx.fillStyle = grad

  // Rounded rect
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Bar chart icon
  const unit = size / 8
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  // Bar 1 (short)
  ctx.fillRect(unit * 2, unit * 4, unit, unit * 2)
  // Bar 2 (medium)
  ctx.fillRect(unit * 3.5, unit * 3, unit, unit * 3)
  // Bar 3 (tall)
  ctx.fillRect(unit * 5, unit * 3.5, unit, unit * 2.5)

  return canvas.toBuffer('image/png')
}

sizes.forEach(size => {
  const buffer = drawIcon(size)
  const filePath = path.join(outputDir, `icon-${size}.png`)
  fs.writeFileSync(filePath, buffer)
  console.log(`✓ Generated ${filePath}`)
})

console.log('\n✅ All icons generated!')
