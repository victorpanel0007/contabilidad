/**
 * Ejecuta el schema SQL en Supabase usando la Management API.
 * Requiere un Personal Access Token (PAT) de Supabase.
 * Uso: PAT=tu_token node scripts/exec-schema.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') })

const PROJECT_URL = process.env.VITE_SUPABASE_URL || ''
const PROJECT_REF = PROJECT_URL.replace('https://', '').split('.')[0]
const PAT         = process.env.PAT

if (!PAT) {
  console.log('❌ Necesitas un Personal Access Token (PAT) de Supabase.')
  console.log('   1. Ve a https://supabase.com/dashboard/account/tokens')
  console.log('   2. Crea un token')
  console.log('   3. Ejecuta: PAT=tu_token node scripts/exec-schema.mjs')
  process.exit(1)
}

const schemaSQL = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../supabase/schema.sql'), 'utf8'
)

async function main() {
  console.log(`🚀 Ejecutando schema en proyecto: ${PROJECT_REF}\n`)
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: schemaSQL })
  })
  if (res.ok) {
    console.log('✅ Schema ejecutado correctamente!')
  } else {
    const err = await res.text()
    console.log(`❌ Error: ${err}`)
  }
}

main().catch(console.error)
