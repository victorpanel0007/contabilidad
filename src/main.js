import './styles/reset.css'
import './styles/variables.css'
import './styles/global.css'
import './styles/components.css'
import './styles/animations.css'
import { App } from './app.js'
import { registerSW } from 'virtual:pwa-register'

// ── Limpiar caché de moneda si está en USD (migración a COP) ──────────────
;(function fixCurrencyCache() {
  try {
    const raw = localStorage.getItem('finanzapp-profile')
    if (raw) {
      const profile = JSON.parse(raw)
      if (!profile.currency || profile.currency === 'USD') {
        profile.currency = 'COP'
        localStorage.setItem('finanzapp-profile', JSON.stringify(profile))
      }
    } else {
      // No hay perfil guardado — poner COP de entrada
      localStorage.setItem('finanzapp-profile', JSON.stringify({ currency: 'COP' }))
    }
  } catch {}
})()

// Register Service Worker
registerSW({ onNeedRefresh() {}, onOfflineReady() {} })

// Boot app
const app = new App(document.getElementById('app'))
app.init()
