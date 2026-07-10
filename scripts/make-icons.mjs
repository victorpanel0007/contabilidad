/**
 * Genera los íconos PNG para la PWA usando sharp (si está disponible)
 * o convirtiendo el SVG maestro.
 * Uso: node scripts/make-icons.mjs
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Genera SVG a cada tamaño
function makeSVG(size) {
  const r = Math.round(size * 0.22)
  const u = size / 8
  const br = Math.max(2, u * 0.2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <circle cx="${size*0.75}" cy="${size*0.25}" r="${size*0.35}" fill="rgba(255,255,255,0.08)"/>
  <rect x="${u*2}" y="${u*3.5}" width="${u}" height="${u*2.5}" rx="${br}" fill="rgba(255,255,255,0.95)"/>
  <rect x="${u*3.5}" y="${u*2.5}" width="${u}" height="${u*3.5}" rx="${br}" fill="rgba(255,255,255,0.95)"/>
  <rect x="${u*5}" y="${u*3}" width="${u}" height="${u*3}" rx="${br}" fill="rgba(255,255,255,0.95)"/>
</svg>`
}

// Guarda SVGs (siempre funciona)
sizes.forEach(size => {
  const svgPath = join(outDir, `icon-${size}.svg`)
  writeFileSync(svgPath, makeSVG(size))
  console.log(`✓ icon-${size}.svg`)
})

// Guarda el SVG maestro
writeFileSync(join(outDir, 'icon.svg'), makeSVG(512))

// Intenta convertir a PNG con sharp
try {
  const sharp = await import('sharp')
  console.log('\n🎨 Convirtiendo a PNG con sharp...')
  for (const size of sizes) {
    const svgBuf = Buffer.from(makeSVG(size))
    const pngPath = join(outDir, `icon-${size}.png`)
    await sharp.default(svgBuf).png().toFile(pngPath)
    console.log(`✓ icon-${size}.png`)
  }
  console.log('\n✅ Íconos PNG generados correctamente!')
} catch {
  // sharp no está instalado — usar SVGs como fallback
  console.log('\n⚠️  sharp no está instalado. Usando SVGs como íconos.')
  console.log('   Para generar PNGs: npm install sharp --save-dev')
  console.log('   Los SVGs funcionan en la mayoría de navegadores modernos.\n')
  
  // Actualiza el manifest para usar SVGs en lugar de PNGs
  console.log('   Los íconos SVG están listos en public/icons/')
}
