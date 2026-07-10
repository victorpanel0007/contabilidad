import { AuthManager } from './modules/auth/AuthManager.js'
import { Router } from './core/Router.js'
import { Store } from './core/Store.js'
import { ThemeManager } from './core/ThemeManager.js'
import { renderAuth } from './modules/auth/AuthView.js'
import { renderShell } from './modules/shell/Shell.js'
import { checkDatabase } from './core/dbInit.js'
import { supabase } from './core/supabase.js'

export class App {
  constructor(container) {
    this.container = container
    this.auth = new AuthManager()
    this.store = new Store()
    this.theme = new ThemeManager()
    this.router = new Router()
  }

  async init() {
    this.theme.init()

    // Si no hay Supabase configurado, la pantalla de error ya se muestra desde supabase.js
    if (!supabase) return

    this.showSplash()

    const [dbStatus, session] = await Promise.all([
      checkDatabase(),
      this.auth.getSession()
    ])

    setTimeout(() => {
      if (!dbStatus.ready) {
        this.showSetupRequired()
        return
      }
      if (session) {
        this.bootApp(session)
      } else {
        this.showAuth()
      }
    }, 1200)

    this.auth.onAuthChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.bootApp(session)
      } else if (event === 'SIGNED_OUT') {
        this.showAuth()
      }
    })
  }

  showSplash() {
    this.container.innerHTML = `
      <div class="splash">
        <div class="splash-content">
          <div class="splash-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#6366f1"/>
              <path d="M16 32C16 23.163 23.163 16 32 16s16 7.163 16 16-7.163 16-16 16S16 40.837 16 32z" fill="rgba(255,255,255,0.15)"/>
              <path d="M24 32h4v8h-4zm6-6h4v14h-4zm6 3h4v11h-4z" fill="white"/>
            </svg>
          </div>
          <h1 class="splash-title">FinanzApp</h1>
          <p class="splash-subtitle">Tus finanzas bajo control</p>
          <div class="splash-loader"><div class="loader-bar"></div></div>
        </div>
      </div>`
  }

  showSetupRequired() {
    this.container.innerHTML = `
      <div class="splash">
        <div class="splash-content" style="max-width:380px;text-align:left">
          <div class="splash-icon" style="margin-bottom:16px">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#6366f1"/>
              <path d="M24 32h4v8h-4zm6-6h4v14h-4zm6 3h4v11h-4z" fill="white"/>
            </svg>
          </div>
          <h2 style="color:white;font-size:1.3rem;margin-bottom:8px">Configuración inicial</h2>
          <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin-bottom:24px;line-height:1.6">
            Las tablas de la base de datos no están creadas. Sigue estos pasos:
          </p>
          <div style="background:rgba(255,255,255,0.07);border-radius:12px;padding:16px;margin-bottom:20px">
            <div style="color:white;font-size:0.85rem;line-height:2">
              <div>1️⃣ Ve a <strong style="color:#818cf8">supabase.com/dashboard</strong></div>
              <div>2️⃣ Abre tu proyecto</div>
              <div>3️⃣ Ve a <strong style="color:#818cf8">SQL Editor</strong></div>
              <div>4️⃣ Pega y ejecuta el archivo <strong style="color:#818cf8">supabase/schema.sql</strong></div>
            </div>
          </div>
          <button onclick="location.reload()" style="background:#6366f1;color:white;border:none;padding:12px 24px;border-radius:10px;font-size:0.9rem;font-weight:600;cursor:pointer;width:100%">
            ✓ Ya ejecuté el schema, continuar
          </button>
        </div>
      </div>`
  }

  showAuth() {
    this.container.innerHTML = ''
    renderAuth(this.container, this.auth, (session) => this.bootApp(session))
  }

  bootApp(session) {
    this.store.setUser(session.user)
    this.container.innerHTML = ''
    renderShell(this.container, this.router, this.store, this.auth, this.theme)
  }
}
