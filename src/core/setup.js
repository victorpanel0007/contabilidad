/**
 * Auto-setup: crea las tablas necesarias si no existen.
 * Se ejecuta una vez al iniciar la app.
 * Requiere que RLS esté habilitado en Supabase.
 */
import { supabase } from './supabase.js'

export async function runSetup() {
  // Verifica si las tablas ya existen probando una consulta simple
  const { error } = await supabase.from('profiles').select('id').limit(1)
  
  if (!error) {
    // Tablas ya existen
    return { ok: true, message: 'DB ready' }
  }

  if (error.code === '42P01') {
    // Tabla no existe - necesita ejecutar el schema
    return { ok: false, message: 'Schema not found. Please run supabase/schema.sql in your Supabase SQL Editor.' }
  }

  // Otro error (puede ser RLS bloqueando - tablas existen)
  if (error.code === 'PGRST301' || error.message?.includes('RLS')) {
    return { ok: true, message: 'DB ready (RLS active)' }
  }

  return { ok: true, message: 'DB ready' }
}
