/**
 * Verifica que las tablas de Supabase existen.
 * Uso: node scripts/init-db.mjs
 * Configura las variables en .env antes de ejecutar.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') })

const PROJECT_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY    = process.env.VITE_SUPABASE_ANON_KEY

if (!PROJECT_URL || !ANON_KEY) {
  console.error('❌ Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

async function checkTableExists(tableName) {
  const res = await fetch(`${PROJECT_URL}/rest/v1/${tableName}?select=count&limit=0`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  })
  return res.status !== 404 && res.status !== 400
}

async function main() {
  console.log('🔍 Verificando tablas en Supabase...\n')
  const tables = ['profiles', 'accounts', 'transactions', 'categories', 'budgets', 'goals', 'debts']
  const missing = []

  for (const t of tables) {
    const exists = await checkTableExists(t)
    console.log(`  ${exists ? '✅' : '❌'} ${t}`)
    if (!exists) missing.push(t)
  }

  if (missing.length === 0) {
    console.log('\n✅ Todas las tablas existen. Base de datos lista.\n')
  } else {
    console.log(`\n⚠️  Faltan tablas: ${missing.join(', ')}`)
    console.log('\n📋 Ejecuta el schema en:')
    console.log(`   ${PROJECT_URL.replace('https://', 'https://supabase.com/dashboard/project/').split('.')[0]}/sql/new`)
    console.log('   Archivo: supabase/schema.sql\n')
  }
}

main().catch(console.error)
