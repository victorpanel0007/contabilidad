import { fmt, dateRange, sumBy, groupBy } from '../../core/utils.js'
import { renderChart } from './DashboardCharts.js'

export class DashboardView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard</div>
          <div id="dashGreeting" style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;"></div>
        </div>
        <button class="btn btn-icon btn-ghost" id="dashRefresh" title="Actualizar">🔄</button>
      </div>
      <div class="page-content page-enter">
        <div id="dashStats" class="dash-stats"></div>
        <div id="dashCharts"></div>
        <div id="dashRecent"></div>
        <div id="dashBudgets"></div>
      </div>
      <style>
        .dash-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
        .dash-balance{grid-column:1/-1;}
        .balance-card{background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:var(--radius-xl);padding:24px 20px;color:white;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(99,102,241,0.3);}
        .balance-card::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.08);}
        .balance-card::after{content:'';position:absolute;bottom:-60px;left:-30px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);}
        .balance-label{font-size:0.8rem;opacity:0.8;margin-bottom:8px;font-weight:500;position:relative;z-index:1;}
        .balance-amount{font-size:2.2rem;font-weight:900;letter-spacing:-0.02em;position:relative;z-index:1;}
        .balance-sub{font-size:0.8rem;opacity:0.7;margin-top:6px;position:relative;z-index:1;}
        @media(min-width:768px){.dash-stats{grid-template-columns:repeat(4,1fr);}.dash-balance{grid-column:1/-1;}}
      </style>`

    document.querySelector('#dashRefresh')?.addEventListener('click', () => this.load())
    this.setGreeting()
  }

  setGreeting() {
    const h = new Date().getHours()
    const greet = h < 12 ? '☀️ Buenos días' : h < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches'
    const name = this.store.user?.user_metadata?.full_name?.split(' ')[0] || 'usuario'
    const el = document.querySelector('#dashGreeting')
    if (el) el.textContent = `${greet}, ${name}`
  }

  async load() {
    const { from, to } = dateRange.thisMonth()
    const [txs, accounts, budgets] = await Promise.all([
      this.store.getTransactions({ from, to }),
      this.store.getAccounts(),
      this.store.getBudgets(dateRange.currentMonth())
    ])

    const incomes = txs.filter(t => t.type === 'income')
    const expenses = txs.filter(t => t.type === 'expense')
    const totalIncome = sumBy(incomes, 'amount')
    const totalExpense = sumBy(expenses, 'amount')
    const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
    const saving = totalIncome - totalExpense

    this.renderStats(totalBalance, totalIncome, totalExpense, saving)
    this.renderCharts(txs, accounts)
    this.renderRecent(txs.slice(0, 5))
    this.renderBudgets(budgets, expenses)
  }

  renderStats(balance, income, expense, saving) {
    const el = document.querySelector('#dashStats')
    if (!el) return
    el.innerHTML = `
      <div class="dash-balance">
        <div class="balance-card">
          <div class="balance-label">Saldo Total</div>
          <div class="balance-amount">${fmt.currency(balance)}</div>
          <div class="balance-sub">Flujo del mes: ${saving >= 0 ? '+' : ''}${fmt.currency(saving)}</div>
        </div>
      </div>
      <div class="stat-card" style="--stat-color:var(--income-color)">
        <div class="stat-icon" style="background:var(--success-light)">💰</div>
        <div class="stat-info">
          <div class="stat-label">Ingresos</div>
          <div class="stat-value" style="color:var(--income-color)">${fmt.currency(income)}</div>
          <div class="stat-change">Este mes</div>
        </div>
      </div>
      <div class="stat-card" style="--stat-color:var(--expense-color)">
        <div class="stat-icon" style="background:var(--danger-light)">💸</div>
        <div class="stat-info">
          <div class="stat-label">Gastos</div>
          <div class="stat-value" style="color:var(--expense-color)">${fmt.currency(expense)}</div>
          <div class="stat-change">Este mes</div>
        </div>
      </div>`
  }

  renderCharts(txs, accounts) {
    const el = document.querySelector('#dashCharts')
    if (!el) return
    el.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">Flujo de Efectivo</span></div>
        <div class="chart-container" style="height:200px"><canvas id="cashflowChart"></canvas></div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">Gastos por Categoría</span></div>
        <div class="chart-container" style="height:200px"><canvas id="categoryChart"></canvas></div>
      </div>`
    renderChart('cashflow', document.getElementById('cashflowChart'), txs)
    renderChart('category', document.getElementById('categoryChart'), txs)
  }

  renderRecent(txs) {
    const el = document.querySelector('#dashRecent')
    if (!el) return
    el.innerHTML = `
      <div class="section-header">
        <span class="section-title">Transacciones Recientes</span>
        <span class="section-link" id="viewAllTx" style="cursor:pointer">Ver todas →</span>
      </div>
      <div class="card">
        ${txs.length === 0
          ? `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Sin transacciones</div><div class="empty-desc">Registra tu primer ingreso o gasto</div></div>`
          : txs.map(tx => {
              const isIncome = tx.type === 'income'
              const parts = []
              if (tx.accounts?.name) parts.push(tx.accounts.name)
              else if (tx.category)  parts.push(tx.category)
              if (tx.payment_method) parts.push(tx.payment_method)
              const meta = parts.join(' · ') || (isIncome ? 'Ingreso' : 'Gasto')
              return `
                <div class="transaction-item">
                  <div class="tx-icon" style="background:${isIncome ? 'var(--success-light)' : 'var(--danger-light)'}">
                    ${tx.icon || (isIncome ? '💰' : '💸')}
                  </div>
                  <div class="tx-info">
                    <div class="tx-name">${tx.description || tx.category || 'Sin descripción'}</div>
                    <div class="tx-meta">${meta}</div>
                  </div>
                  <div class="tx-amount ${tx.type}">${isIncome ? '+' : '-'}${fmt.currency(tx.amount)}</div>
                </div>`
            }).join('')}
      </div>`
    document.querySelector('#viewAllTx')?.addEventListener('click', () => { location.hash = 'expenses' })
  }

  renderBudgets(budgets, expenses) {
    const el = document.querySelector('#dashBudgets')
    if (!el || budgets.length === 0) { if (el) el.innerHTML = ''; return }
    const grouped = groupBy(expenses, 'category')
    el.innerHTML = `
      <div class="section-header" style="margin-top:20px">
        <span class="section-title">Presupuestos del Mes</span>
        <span class="section-link" id="viewBudgets" style="cursor:pointer">Ver todos →</span>
      </div>
      <div class="card">
        ${budgets.slice(0,4).map(b => {
          const spent = sumBy(grouped[b.category] || [], 'amount')
          const pct = Math.min(100, b.amount > 0 ? Math.round(spent / b.amount * 100) : 0)
          const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success'
          return `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-size:0.85rem;font-weight:600">${b.icon||'🏷️'} ${b.category}</span>
                <span style="font-size:0.75rem;color:var(--text-muted)">${fmt.currency(spent)} / ${fmt.currency(b.amount)}</span>
              </div>
              <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
            </div>`}).join('')}
      </div>`
    document.querySelector('#viewBudgets')?.addEventListener('click', () => { location.hash = 'budgets' })
  }
}
