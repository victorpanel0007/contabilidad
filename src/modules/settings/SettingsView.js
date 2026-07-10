import { toast } from '../shared/Toast.js'
import { supabase } from '../../core/supabase.js'

const CURRENCIES = [
  { code:'USD', symbol:'$', name:'Dólar (USD)' },
  { code:'EUR', symbol:'€', name:'Euro (EUR)' },
  { code:'MXN', symbol:'$', name:'Peso Mexicano (MXN)' },
  { code:'COP', symbol:'$', name:'Peso Colombiano (COP)' },
  { code:'ARS', symbol:'$', name:'Peso Argentino (ARS)' },
  { code:'PEN', symbol:'S/', name:'Sol Peruano (PEN)' },
  { code:'CLP', symbol:'$', name:'Peso Chileno (CLP)' },
  { code:'BRL', symbol:'R$', name:'Real Brasileño (BRL)' },
  { code:'VES', symbol:'Bs.', name:'Bolívar (VES)' },
  { code:'GTQ', symbol:'Q', name:'Quetzal (GTQ)' }
]

export class SettingsView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header"><span class="page-title">Configuración</span></div>
      <div class="page-content page-enter" id="settingsContent">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`
  }

  async load() {
    const profile = await this.store.getProfile() || {}
    const user = this.store.user
    const initial = (profile.full_name || user?.email || 'U')[0].toUpperCase()
    const theme = document.documentElement.getAttribute('data-theme') || 'light'

    document.querySelector('#settingsContent').innerHTML = `
      <!-- Profile -->
      <div class="section-header"><span class="section-title">Perfil</span></div>
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-size:1.5rem;font-weight:800">${initial}</div>
          <div>
            <div style="font-size:1rem;font-weight:700">${profile.full_name||user?.email||'Usuario'}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${user?.email||''}</div>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Nombre completo</label><input type="text" class="form-input" id="settName" value="${profile.full_name||''}"/></div>
        <div class="form-group"><label class="form-label">Moneda</label>
          <select class="form-input" id="settCurrency">
            ${CURRENCIES.map(c=>`<option value="${c.code}"${(profile.currency||'COP')===c.code?' selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-full" id="saveProfile">Guardar cambios</button>
      </div>

      <!-- Appearance -->
      <div class="section-header"><span class="section-title">Apariencia</span></div>
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;margin-bottom:2px">Modo oscuro</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Actualmente: ${theme==='dark'?'Oscuro':'Claro'}</div>
          </div>
          <div class="toggle-switch ${theme==='dark'?'on':''}" id="themeToggle">
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="section-header"><span class="section-title">Seguridad</span></div>
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary btn-full" id="changePassword">🔑 Cambiar contraseña</button>
        </div>
      </div>

      <!-- Backup -->
      <div class="section-header"><span class="section-title">Datos</span></div>
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary btn-full" id="exportData">📦 Exportar mis datos</button>
          <button class="btn btn-danger btn-full" id="deleteAccount">⚠️ Eliminar mi cuenta</button>
        </div>
      </div>

      <!-- App info -->
      <div class="card" style="margin-bottom:20px;text-align:center">
        <div style="font-size:2rem;margin-bottom:8px">
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" style="display:inline-block"><rect width="64" height="64" rx="14" fill="#6366f1"/><path d="M24 32h4v8h-4zm6-6h4v14h-4zm6 3h4v11h-4z" fill="white"/></svg>
        </div>
        <div style="font-weight:700;margin-bottom:4px">FinanzApp</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">Versión 1.0.0</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Gestiona tus finanzas personales</div>
      </div>

      <!-- Sign out -->
      <button class="btn btn-danger btn-full" id="signOutBtn2" style="margin-bottom:32px">🚪 Cerrar sesión</button>

      <style>
        .toggle-switch{width:52px;height:30px;border-radius:15px;background:var(--bg-tertiary);border:2px solid var(--border);position:relative;cursor:pointer;transition:all var(--transition);}
        .toggle-switch.on{background:var(--accent);border-color:var(--accent);}
        .toggle-thumb{width:22px;height:22px;border-radius:50%;background:white;position:absolute;top:2px;left:2px;transition:transform var(--transition);box-shadow:var(--shadow-sm);}
        .toggle-switch.on .toggle-thumb{transform:translateX(22px);}
      </style>`

    this.bindEvents(profile)
  }

  bindEvents(profile) {
    document.querySelector('#saveProfile')?.addEventListener('click', async () => {
      const name = document.querySelector('#settName')?.value?.trim()
      const currency = document.querySelector('#settCurrency')?.value
      const btn = document.querySelector('#saveProfile')
      btn.innerHTML = '<span class="spinner" style="border-color:white;border-top-color:transparent"></span>'
      btn.disabled = true
      const { error } = await this.store.saveProfile({ full_name: name, currency })
      if (!error) {
        localStorage.setItem('finanzapp-profile', JSON.stringify({ currency }))
        toast('Perfil actualizado ✓')
      } else { toast(error.message,'error') }
      btn.innerHTML = 'Guardar cambios'; btn.disabled = false
    })

    document.querySelector('#themeToggle')?.addEventListener('click', () => {
      const toggle = document.querySelector('#themeToggle')
      const isDark = toggle.classList.contains('on')
      toggle.classList.toggle('on', !isDark)
      const next = isDark ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('finanzapp-theme', next)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next==='dark'?'#0f0f1a':'#6366f1')
    })

    document.querySelector('#changePassword')?.addEventListener('click', async () => {
      const email = this.store.user?.email
      if (!email) return
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (!error) toast('Enlace enviado a tu correo ✓')
      else toast(error.message,'error')
    })

    document.querySelector('#exportData')?.addEventListener('click', async () => {
      toast('Exportando datos...','info')
      try {
        const [txs, accounts, budgets, goals, debts] = await Promise.all([
          this.store.getTransactions({}),
          this.store.getAccounts(),
          this.store.getBudgets(''),
          this.store.getGoals(),
          this.store.getDebts()
        ])
        const data = JSON.stringify({ transactions: txs, accounts, budgets, goals, debts }, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `finanzapp-backup-${new Date().toISOString().substring(0,10)}.json`
        a.click(); URL.revokeObjectURL(url)
        toast('Datos exportados ✓')
      } catch { toast('Error al exportar','error') }
    })

    document.querySelector('#deleteAccount')?.addEventListener('click', () => {
      const confirmed = confirm('⚠️ Esta acción es irreversible. ¿Deseas eliminar tu cuenta y todos tus datos?')
      if (!confirmed) return
      const confirmed2 = confirm('¿Estás completamente seguro? Se eliminarán todos tus datos permanentemente.')
      if (!confirmed2) return
      toast('Funcionalidad disponible próximamente','info')
    })

    document.querySelector('#signOutBtn2')?.addEventListener('click', async () => {
      await supabase.auth.signOut()
    })
  }
}
