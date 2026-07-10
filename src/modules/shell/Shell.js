import { showToast } from '../shared/Toast.js'

const NAV_ITEMS = [
  { route: 'dashboard', icon: '🏠', label: 'Inicio' },
  { route: 'expenses', icon: '💸', label: 'Gastos' },
  { route: 'incomes', icon: '💰', label: 'Ingresos' },
  { route: 'accounts', icon: '🏦', label: 'Cuentas' },
  { route: 'more', icon: '⋯', label: 'Más' }
]

const ALL_NAV = [
  { route: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { route: 'incomes', icon: '💰', label: 'Ingresos' },
  { route: 'expenses', icon: '💸', label: 'Gastos' },
  { route: 'accounts', icon: '🏦', label: 'Cuentas' },
  { route: 'budgets', icon: '🎯', label: 'Presupuestos' },
  { route: 'goals', icon: '⭐', label: 'Metas' },
  { route: 'debts', icon: '📋', label: 'Deudas' },
  { route: 'reports', icon: '📊', label: 'Reportes' },
  { route: 'settings', icon: '⚙️', label: 'Configuración' }
]

export function renderShell(container, router, store, auth, theme) {
  container.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(store, auth, theme)}
      <div class="main-content">
        <div id="pageView" class="page-view"></div>
      </div>
      ${renderBottomNav()}
    </div>
    <div id="toastContainer" class="toast-container"></div>
    <div id="moreMenu" class="more-menu" style="display:none"></div>`

  const pageView = container.querySelector('#pageView')
  router.init(pageView, store)

  // Bottom nav click
  container.querySelectorAll('.nav-item[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.dataset.route
      if (route === 'more') { toggleMoreMenu(container, router) }
      else { router.navigate(route); hideMoreMenu(container) }
    })
  })

  // Sidebar nav click
  container.querySelectorAll('.sidebar-item[data-route]').forEach(el => {
    el.addEventListener('click', () => router.navigate(el.dataset.route))
  })

  // Theme toggle
  container.querySelector('#themeToggle')?.addEventListener('click', () => {
    const t = theme.toggle()
    container.querySelector('#themeToggle').textContent = t === 'dark' ? '☀️' : '🌙'
  })

  // Sign out
  container.querySelector('#signOutBtn')?.addEventListener('click', async () => {
    await auth.signOut()
  })

  // Sync active nav on route change
  router.onChange(route => {
    container.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route)
    })
    container.querySelectorAll('.sidebar-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route)
    })
  })

  // Make toast available globally
  window.__toast = (msg, type) => showToast(container.querySelector('#toastContainer'), msg, type)
}

function renderSidebar(store, auth, theme) {
  const user = store.user
  const initial = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()
  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><path d="M24 32h4v8h-4zm6-6h4v14h-4zm6 3h4v11h-4z" fill="white"/></svg>
        </div>
        <span class="sidebar-logo-text">FinanzApp</span>
        <button id="themeToggle" class="btn btn-icon btn-ghost" style="margin-left:auto">${theme.isDark ? '☀️' : '🌙'}</button>
      </div>
      <nav class="sidebar-nav">
        ${ALL_NAV.map(item => `
          <div class="sidebar-item${item.route === 'dashboard' ? ' active' : ''}" data-route="${item.route}">
            <span class="sidebar-item-icon">${item.icon}</span>
            <span>${item.label}</span>
          </div>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user-avatar">${initial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user?.user_metadata?.full_name || 'Usuario'}</div>
          <div class="sidebar-user-email">${user?.email || ''}</div>
        </div>
        <button id="signOutBtn" class="btn btn-icon btn-ghost" title="Cerrar sesión">🚪</button>
      </div>
    </aside>`
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav">
      ${NAV_ITEMS.map((item, i) => `
        <div class="nav-item${i === 0 ? ' active' : ''}" data-route="${item.route}">
          <div class="nav-icon">${item.icon}</div>
          <span class="nav-label">${item.label}</span>
        </div>`).join('')}
    </nav>`
}

function toggleMoreMenu(container, router) {
  const menu = container.querySelector('#moreMenu')
  if (menu.style.display === 'none') {
    const moreRoutes = ALL_NAV.filter(r => !NAV_ITEMS.slice(0,4).map(n=>n.route).includes(r.route))
    menu.innerHTML = `
      <div class="more-overlay" id="moreOverlay"></div>
      <div class="more-sheet animate-up">
        <div class="more-handle"></div>
        <h3 class="more-title">Más opciones</h3>
        <div class="more-grid">
          ${moreRoutes.map(r => `
            <div class="more-item" data-route="${r.route}">
              <div class="more-icon">${r.icon}</div>
              <span>${r.label}</span>
            </div>`).join('')}
        </div>
      </div>
      <style>
        .more-overlay{position:fixed;inset:0;background:var(--bg-overlay);z-index:60;}
        .more-sheet{position:fixed;bottom:0;left:0;right:0;background:var(--bg-secondary);border-radius:var(--radius-xl) var(--radius-xl) 0 0;padding:0 16px calc(var(--nav-height) + 16px);z-index:61;}
        .more-handle{width:40px;height:4px;background:var(--border);border-radius:2px;margin:12px auto 16px;}
        .more-title{font-size:1rem;font-weight:700;margin-bottom:16px;}
        .more-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .more-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:var(--radius-lg);cursor:pointer;transition:background var(--transition);font-size:0.75rem;font-weight:600;color:var(--text-secondary);}
        .more-item:hover{background:var(--bg-tertiary);color:var(--text-primary);}
        .more-icon{font-size:1.5rem;}
        @media(min-width:768px){.more-sheet{max-width:400px;left:50%;transform:translateX(-50%);}}
      </style>`
    menu.style.display = 'block'
    menu.querySelector('#moreOverlay').addEventListener('click', () => hideMoreMenu(container))
    menu.querySelectorAll('.more-item').forEach(el => {
      el.addEventListener('click', () => { router.navigate(el.dataset.route); hideMoreMenu(container) })
    })
  } else {
    hideMoreMenu(container)
  }
}

function hideMoreMenu(container) {
  const menu = container.querySelector('#moreMenu')
  if (menu) menu.style.display = 'none'
}
