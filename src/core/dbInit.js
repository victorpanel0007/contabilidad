import { supabase } from './supabase.js'

/**
 * Verifica que las tablas existen.
 * Si no existen, muestra instrucciones para ejecutar el schema.
 */
export async function checkDatabase() {
  try {
    // Intenta leer de 'profiles' - si falla con 42P01 las tablas no existen
    const { error } = await supabase.from('profiles').select('id').limit(1)
    
    if (!error) return { ready: true }
    
    // 42P01 = tabla no existe
    if (error.code === '42P01') return { ready: false, reason: 'missing_tables' }
    
    // PGRST116 / RLS = tabla existe pero bloqueada por RLS (normal para anon)
    if (['PGRST116','PGRST301','42501'].includes(error.code)) return { ready: true }

    // Cualquier otro error asumimos que está ok (puede ser RLS en acción)
    return { ready: true }
  } catch {
    return { ready: true }
  }
}
