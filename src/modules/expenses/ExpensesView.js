import { fmt, dateRange, sumBy, ACCOUNT_TYPES } from '../../core/utils.js'
import { openModal, confirmDialog } from '../shared/Modal.js'
import { toast } from '../shared/Toast.js'
import { TransactionForm } from '../shared/TransactionForm.js'

function txMeta(tx) {
  const parts = []
  if (tx.category)            parts.push(tx.category)
  if (tx.accounts?.name)      parts.push(tx.accounts.name)
  else if (tx.payment_method) parts.push(tx.payment_method)
  return parts.join(' · ') || 'Sin categoría'
}

function txIcon(tx) {
  if (tx.icon) return tx.icon
  if (tx.accounts?.type) {
    const t = ACCOUNT_TYPES.find(a => a.value === tx.accounts.type)
    if (t) return t.icon
  }
  return '💸'
}

export class ExpensesView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.filters = { ...dateRange.thisMonth(), category: '' }
    this.all = []
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <span class="page-title">Gastos</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-icon btn-ghost" id="filterBtn">🔍</button>
        </div>
      </div>
      <div class="page-content page-enter">
        <div id="expStats" style="margin-bottom:16px"></div>
        <div id="expFilters" class="filter-row"></div>
        <div id="expList"></div>
      </div>
      <button class="btn-fab" id="addExpense">＋</button>`

    document.querySelector('#addExpense')?.addEventListener('click', () => this.openForm())
    document.querySelector('#filterBtn')?.addEventListener('click', () => this.openFilters())
  }

  async load() {
    document.querySelector('#expList').innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`
    this.all = await this.store.getTransactions({ type: 'expense', ...this.filters })
    this.renderStats()
    this.renderFilters()
    this.renderList()
  }

  renderStats() {
    const total = sumBy(this.all, 'amount')
    const el = document.querySelector('#expStats')
    if (!el) return
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--danger-light)">💸</div>
        <div class="stat-info">
          <div class="stat-label">Total Gastos</div>
          <div class="stat-value" style="color:var(--expense-color)">${fmt.currency(total)}</div>
          <div class="stat-change">${this.all.length} transacciones</div>
        </div>
      </div>`
  }

  renderFilters() {
    const categories = [...new Set(this.all.map(t=>t.category).filter(Boolean))]
    const el = document.querySelector('#expFilters')
    if (!el) return
    el.innerHTML = `
      <div class="filter-chip active" data-cat="">Todos</div>
      ${categories.map(c => `<div class="filter-chip" data-cat="${c}">${c}</div>`).join('')}`
    el.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        el.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
        chip.classList.add('active')
        this.filters.category = chip.dataset.cat
        this.renderList()
      })
    })
  }

  renderList() {
    const filtered = this.filters.category
      ? this.all.filter(t => t.category === this.filters.category)
      : this.all
    const el = document.querySelector('#expList')
    if (!el) return

    if (filtered.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-title">Sin gastos</div><div class="empty-desc">Toca el botón + para registrar un gasto</div></div>`
      return
    }

    // Group by date
    const groups = {}
    filtered.forEach(tx => {
      const d = tx.date?.substring(0,10) || 'Sin fecha'
      if (!groups[d]) groups[d] = []
      groups[d].push(tx)
    })

    el.innerHTML = Object.entries(groups).sort(([a],[b])=>b.localeCompare(a)).map(([date, txs]) => `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px">
          <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted)">${fmt.date(date)}</span>
          <span style="font-size:0.8rem;font-weight:700;color:var(--expense-color)">-${fmt.currency(sumBy(txs,'amount'))}</span>
        </div>
        <div class="card" style="padding:8px 12px">
          ${txs.map(tx => this.txHTML(tx)).join('')}
        </div>
      </div>`).join('')

    el.querySelectorAll('.tx-row').forEach(row => {
      row.addEventListener('click', () => {
        const tx = filtered.find(t => t.id === row.dataset.id)
        if (tx) this.openDetail(tx)
      })
    })
  }

  txHTML(tx) {
    return `
      <div class="transaction-item tx-row" data-id="${tx.id}">
        <div class="tx-icon" style="background:var(--danger-light)">${txIcon(tx)}</div>
        <div class="tx-info">
          <div class="tx-name">${tx.description || tx.category || 'Sin descripción'}</div>
          <div class="tx-meta">${txMeta(tx)}</div>
        </div>
        <div class="tx-amount expense">-${fmt.currency(tx.amount)}</div>
      </div>`
  }

  openForm(tx = null) {
    const form = new TransactionForm('expense', this.store, tx, async (data) => {
      const { error } = await this.store.saveTransaction({ ...data, type: 'expense' })
      if (error) { toast(error.message, 'error'); return false }
      toast(tx ? 'Gasto actualizado' : 'Gasto registrado')
      this.load()
      return true
    })
    form.open()
  }

  openDetail(tx) {
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Detalle del Gasto</h2>
        <button class="btn btn-icon btn-ghost" id="closeDetail">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="text-align:center;padding:16px 0">
          <div style="font-size:2.5rem;margin-bottom:8px">${tx.icon||'💸'}</div>
          <div style="font-size:1.75rem;font-weight:800;color:var(--expense-color)">-${fmt.currency(tx.amount)}</div>
          <div style="color:var(--text-secondary);margin-top:4px">${tx.description||tx.category||'Sin descripción'}</div>
        </div>
        <div class="card">
          ${detailRow('Categoría', tx.category||'—')}
          ${detailRow('Cuenta', tx.accounts?.name||'—')}
          ${detailRow('Fecha', fmt.date(tx.date))}
          ${detailRow('Método de pago', tx.payment_method||'—')}
          ${tx.notes ? detailRow('Notas', tx.notes) : ''}
        </div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-secondary btn-full" id="editTx">✏️ Editar</button>
          <button class="btn btn-danger btn-full" id="deleteTx">🗑️ Eliminar</button>
        </div>
      </div>`)

    document.querySelector('#closeDetail')?.addEventListener('click', close)
    document.querySelector('#editTx')?.addEventListener('click', () => { close(); this.openForm(tx) })
    document.querySelector('#deleteTx')?.addEventListener('click', () => {
      close()
      confirmDialog('¿Eliminar este gasto?', async () => {
        await this.store.deleteTransaction(tx.id)
        toast('Gasto eliminado')
        this.load()
      })
    })
  }

  openFilters() {
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Filtros</h2>
        <button class="btn btn-icon btn-ghost" id="closeFilters">✕</button>
      </div>
      <div class="form-group"><label class="form-label">Desde</label><input type="date" class="form-input" id="filterFrom" value="${this.filters.from}"/></div>
      <div class="form-group"><label class="form-label">Hasta</label><input type="date" class="form-input" id="filterTo" value="${this.filters.to}"/></div>
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        ${[['thisMonth','Este mes'],['lastMonth','Mes pasado'],['thisYear','Este año']].map(([k,l])=>`<button class="btn btn-secondary btn-sm" data-range="${k}">${l}</button>`).join('')}
      </div>
      <button class="btn btn-primary btn-full" id="applyFilters">Aplicar filtros</button>`)

    document.querySelector('#closeFilters')?.addEventListener('click', close)
    document.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.range
        if (r === 'thisMonth') { const {from,to}=dateRange.thisMonth(); document.querySelector('#filterFrom').value=from; document.querySelector('#filterTo').value=to }
        else if (r === 'lastMonth') {
          const now = new Date(); now.setMonth(now.getMonth()-1)
          const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0,10)
          const to = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().substring(0,10)
          document.querySelector('#filterFrom').value=from; document.querySelector('#filterTo').value=to
        } else if (r === 'thisYear') { const {from,to}=dateRange.thisYear(); document.querySelector('#filterFrom').value=from; document.querySelector('#filterTo').value=to }
      })
    })
    document.querySelector('#applyFilters')?.addEventListener('click', () => {
      this.filters.from = document.querySelector('#filterFrom').value
      this.filters.to = document.querySelector('#filterTo').value
      close(); this.load()
    })
  }
}

function detailRow(label, value) {
  return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light)">
    <span style="font-size:0.85rem;color:var(--text-muted)">${label}</span>
    <span style="font-size:0.85rem;font-weight:600">${value}</span>
  </div>`
}
