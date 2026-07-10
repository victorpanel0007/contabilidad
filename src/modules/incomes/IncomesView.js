import { fmt, dateRange, sumBy, ACCOUNT_TYPES } from '../../core/utils.js'
import { openModal, confirmDialog } from '../shared/Modal.js'
import { toast } from '../shared/Toast.js'
import { TransactionForm } from '../shared/TransactionForm.js'

// Genera el texto secundario de una transacción
function txMeta(tx) {
  const parts = []
  if (tx.category)         parts.push(tx.category)
  if (tx.accounts?.name)   parts.push(tx.accounts.name)
  else if (tx.payment_method) parts.push(tx.payment_method)
  return parts.join(' · ') || 'Sin categoría'
}

// Ícono según tipo de cuenta o categoría
function txIcon(tx) {
  if (tx.icon) return tx.icon
  if (tx.accounts?.type) {
    const t = ACCOUNT_TYPES.find(a => a.value === tx.accounts.type)
    if (t) return t.icon
  }
  return '💰'
}

export class IncomesView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.filters = { ...dateRange.thisMonth() }
    this.all = []
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <span class="page-title">Ingresos</span>
        <button class="btn btn-icon btn-ghost" id="filterBtn">🔍</button>
      </div>
      <div class="page-content page-enter">
        <div id="incStats" style="margin-bottom:16px"></div>
        <div id="incFilters" class="filter-row"></div>
        <div id="incList"></div>
      </div>
      <button class="btn-fab" id="addIncome">＋</button>`

    document.querySelector('#addIncome')?.addEventListener('click', () => this.openForm())
    document.querySelector('#filterBtn')?.addEventListener('click', () => this.openFilters())
  }

  async load() {
    document.querySelector('#incList').innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`
    this.all = await this.store.getTransactions({ type: 'income', ...this.filters })
    this.renderStats()
    this.renderFilters()
    this.renderList()
  }

  renderStats() {
    const total = sumBy(this.all, 'amount')
    const el = document.querySelector('#incStats')
    if (!el) return
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--success-light)">💰</div>
        <div class="stat-info">
          <div class="stat-label">Total Ingresos</div>
          <div class="stat-value" style="color:var(--income-color)">${fmt.currency(total)}</div>
          <div class="stat-change">${this.all.length} transacciones</div>
        </div>
      </div>`
  }

  renderFilters() {
    const categories = [...new Set(this.all.map(t => t.category).filter(Boolean))]
    const el = document.querySelector('#incFilters')
    if (!el) return
    el.innerHTML = `
      <div class="filter-chip active" data-cat="">Todos</div>
      ${categories.map(c => `<div class="filter-chip" data-cat="${c}">${c}</div>`).join('')}`
    el.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        el.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
        chip.classList.add('active')
        this.activeCategory = chip.dataset.cat
        this.renderList()
      })
    })
  }

  renderList() {
    const filtered = this.activeCategory
      ? this.all.filter(t => t.category === this.activeCategory)
      : this.all
    const el = document.querySelector('#incList')
    if (!el) return

    if (filtered.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">Sin ingresos</div><div class="empty-desc">Toca el botón + para registrar un ingreso</div></div>`
      return
    }

    const groups = {}
    filtered.forEach(tx => {
      const d = tx.date?.substring(0, 10) || 'Sin fecha'
      if (!groups[d]) groups[d] = []
      groups[d].push(tx)
    })

    el.innerHTML = Object.entries(groups).sort(([a],[b])=>b.localeCompare(a)).map(([date, txs]) => `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px">
          <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted)">${fmt.date(date)}</span>
          <span style="font-size:0.8rem;font-weight:700;color:var(--income-color)">+${fmt.currency(sumBy(txs,'amount'))}</span>
        </div>
        <div class="card" style="padding:8px 12px">
          ${txs.map(tx => `
            <div class="transaction-item tx-row" data-id="${tx.id}" style="cursor:pointer">
              <div class="tx-icon" style="background:var(--success-light)">${txIcon(tx)}</div>
              <div class="tx-info">
                <div class="tx-name">${tx.description || tx.category || 'Sin descripción'}</div>
                <div class="tx-meta">${txMeta(tx)}</div>
              </div>
              <div class="tx-amount income">+${fmt.currency(tx.amount)}</div>
            </div>`).join('')}
        </div>
      </div>`).join('')

    el.querySelectorAll('.tx-row').forEach(row => {
      row.addEventListener('click', () => {
        const tx = filtered.find(t => t.id === row.dataset.id)
        if (tx) this.openDetail(tx)
      })
    })
  }

  openForm(tx = null) {
    const form = new TransactionForm('income', this.store, tx, async (data) => {
      const { error } = await this.store.saveTransaction({ ...data, type: 'income' })
      if (error) { toast(error.message, 'error'); return false }
      toast(tx ? 'Ingreso actualizado' : 'Ingreso registrado')
      this.load()
      return true
    })
    form.open()
  }

  openDetail(tx) {
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Detalle del Ingreso</h2>
        <button class="btn btn-icon btn-ghost" id="closeDetail">✕</button>
      </div>
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:2.5rem;margin-bottom:8px">${tx.icon||'💰'}</div>
        <div style="font-size:1.75rem;font-weight:800;color:var(--income-color)">+${fmt.currency(tx.amount)}</div>
        <div style="color:var(--text-secondary);margin-top:4px">${tx.description||tx.category||'Sin descripción'}</div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light)"><span style="color:var(--text-muted);font-size:0.85rem">Categoría</span><span style="font-weight:600;font-size:0.85rem">${tx.category||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light)"><span style="color:var(--text-muted);font-size:0.85rem">Cuenta</span><span style="font-weight:600;font-size:0.85rem">${tx.accounts?.name||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0"><span style="color:var(--text-muted);font-size:0.85rem">Fecha</span><span style="font-weight:600;font-size:0.85rem">${fmt.date(tx.date)}</span></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary btn-full" id="editTx">✏️ Editar</button>
        <button class="btn btn-danger btn-full" id="deleteTx">🗑️ Eliminar</button>
      </div>`)

    document.querySelector('#closeDetail')?.addEventListener('click', close)
    document.querySelector('#editTx')?.addEventListener('click', () => { close(); this.openForm(tx) })
    document.querySelector('#deleteTx')?.addEventListener('click', () => {
      close()
      confirmDialog('¿Eliminar este ingreso?', async () => {
        await this.store.deleteTransaction(tx.id)
        toast('Ingreso eliminado')
        this.load()
      })
    })
  }

  openFilters() {
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Filtrar por fecha</h2>
        <button class="btn btn-icon btn-ghost" id="closeFilters">✕</button>
      </div>
      <div class="form-group"><label class="form-label">Desde</label><input type="date" class="form-input" id="filterFrom" value="${this.filters.from}"/></div>
      <div class="form-group"><label class="form-label">Hasta</label><input type="date" class="form-input" id="filterTo" value="${this.filters.to}"/></div>
      <button class="btn btn-primary btn-full" id="applyFilters">Aplicar</button>`)

    document.querySelector('#closeFilters')?.addEventListener('click', close)
    document.querySelector('#applyFilters')?.addEventListener('click', () => {
      this.filters.from = document.querySelector('#filterFrom').value
      this.filters.to = document.querySelector('#filterTo').value
      close(); this.load()
    })
  }
}
