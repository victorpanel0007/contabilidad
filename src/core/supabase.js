import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL     || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Si faltan las variables, mostrar instrucciones claras en vez de romper
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
          background:#0f0f1a;padding:24px;font-family:system-ui,sans-serif">
          <div style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:16px;
            padding:32px;max-width:420px;width:100%;text-align:center">
            <div style="font-size:3rem;margin-bottom:16px">⚙️</div>
            <h2 style="color:white;margin-bottom:12px;font-size:1.3rem">Configuración requerida</h2>
            <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;line-height:1.6;margin-bottom:20px">
              Faltan las variables de entorno de Supabase.
            </p>
            <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:16px;
              text-align:left;font-size:0.8rem;color:rgba(255,255,255,0.7);line-height:2">
              <div>1. Ve a tu proyecto en <strong style="color:#818cf8">vercel.com</strong></div>
              <div>2. Settings → Environment Variables</div>
              <div>3. Agrega <code style="color:#818cf8">VITE_SUPABASE_URL</code></div>
              <div>4. Agrega <code style="color:#818cf8">VITE_SUPABASE_ANON_KEY</code></div>
              <div>5. Redeploy</div>
            </div>
          </div>
        </div>`
    }
  })
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'finanzapp-auth'
      }
    })
  : null
