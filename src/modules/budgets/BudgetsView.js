import { fmt, dateRange, sumBy, DEFAULT_EXPENSE_CATEGORIES } from '../../core/utils.js'
import { openModal, confirmDialog } from '../shared/Modal.js'
import { toast } from '../shared/Toast.js'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export class BudgetsView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.currentMonth = dateRange.currentMonth()
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <span class="page-title">Presupuestos</span>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-icon btn-ghost" id="prevMonth">‹</button>
          <span id="monthLabel" style="font-size:0.85rem;font-weight:600;min-width:100px;text-align:center"></span>
          <button class="btn btn-icon btn-ghost" id="nextMonth">›</button>
        </div>
      </div>
      <div class="page-content page-enter">
        <div id="budgSummary" style="margin-bottom:20px"></div>
        <div class="section-header"><span class="section-title">Categorías</span></div>
        <div id="budgList"></div>
      </div>
      <button class="btn-fab" id="addBudget">＋</button>`

    document.querySelector('#addBudget')?.addEventListener('click', () => this.openForm())
    document.querySelector('#prevMonth')?.addEventListener('click', () => {
      this.currentMonth = format(subMonths(parseISO(this.currentMonth+'-01'), 1), 'yyyy-MM')
      this.updateMonthLabel(); this.load()
    })
    document.querySelector('#nextMonth')?.addEventListener('click', () => {
      this.currentMonth = format(addMonths(parseISO(this.currentMonth+'-01'), 1), 'yyyy-MM')
      this.updateMonthLabel(); this.load()
    })
    this.updateMonthLabel()
  }

  updateMonthLabel() {
    const el = document.querySelector('#monthLabel')
    if (el) el.textContent = format(parseISO(this.currentMonth+'-01'), 'MMM yyyy', { locale: es })
  }

  async load() {
    const [budgets, txs] = await Promise.all([
      this.store.getBudgets(this.currentMonth),
      this.store.getTransactions({
        type: 'expense',
        from: this.currentMonth+'-01',
        to: format(new Date(parseISO(this.currentMonth+'-01').getFullYear(), parseISO(this.currentMonth+'-01').getMonth()+1, 0), 'yyyy-MM-dd')
      })
    ])
    this.budgets = budgets
    this.expenses = txs
    this.renderSummary(budgets, txs)
    this.renderList(budgets, txs)
  }

  renderSummary(budgets, txs) {
    const totalBudget = sumBy(budgets, 'amount')
    const totalSpent = sumBy(txs, 'amount')
    const pct = totalBudget > 0 ? Math.min(100, Math.round(totalSpent/totalBudget*100)) : 0
    const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success'
    const el = document.querySelector('#budgSummary')
    if (!el) return
    el.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px">
          <div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">Gastado del presupuesto</div>
            <div style="font-size:1.5rem;font-weight:800">${fmt.currency(totalSpent)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">Presupuesto total</div>
            <div style="font-size:1rem;font-weight:700;color:var(--text-secondary)">${fmt.currency(totalBudget)}</div>
          </div>
        </div>
        <div class="progress-bar" style="height:12px;margin-bottom:8px"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:0.75rem;color:var(--text-muted)">Disponible: <strong style="color:var(--text-primary)">${fmt.currency(Math.max(0,totalBudget-totalSpent))}</strong></span>
          <span class="badge badge-${cls}">${pct}% usado</span>
        </div>
      </div>`
  }

  renderList(budgets, txs) {
    const el = document.querySelector('#budgList')
    if (!el) return
    if (budgets.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">Sin presupuestos</div><div class="empty-desc">Crea presupuestos para controlar tus gastos</div></div>`
      return
    }

    const grouped = {}
    txs.forEach(t => { if (!grouped[t.category]) grouped[t.category]=[]; grouped[t.category].push(t) })

    el.innerHTML = budgets.map(b => {
      const spent = sumBy(grouped[b.category]||[], 'amount')
      const pct = b.amount > 0 ? Math.min(100, Math.round(spent/b.amount*100)) : 0
      const cls = pct >= 100 ? 'danger' : pct >= (b.alert_percent||80) ? 'warning' : 'success'
      const remaining = b.amount - spent
      return `
        <div class="budget-item" data-id="${b.id}">
          <div class="budget-item-header">
            <div class="budget-item-info">
              <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:${b.color||'var(--accent-light)'};display:flex;align-items:center;justify-content:center;font-size:1.1rem">${b.icon||'🏷️'}</div>
              <div>
                <div class="budget-category">${b.category}</div>
                <div class="budget-amounts">${fmt.currency(spent)} de <strong>${fmt.currency(b.amount)}</strong></div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="badge badge-${cls}" style="margin-bottom:4px">${pct}%</div>
              <div style="font-size:0.75rem;color:${remaining>=0?'var(--success)':'var(--danger)'}">
                ${remaining>=0?'Disponible':'Excedido'}: ${fmt.currency(Math.abs(remaining))}
              </div>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
          ${pct >= (b.alert_percent||80) && pct < 100 ? `<div style="margin-top:8px;font-size:0.75rem;color:var(--warning);display:flex;align-items:center;gap:4px">⚠️ Cerca del límite (${b.alert_percent||80}%)</div>` : ''}
          ${pct >= 100 ? `<div style="margin-top:8px;font-size:0.75rem;color:var(--danger);display:flex;align-items:center;gap:4px">🚨 Presupuesto excedido</div>` : ''}
        </div>`
    }).join('')

    el.querySelectorAll('.budget-item').forEach(item => {
      item.addEventListener('click', () => {
        const b = budgets.find(b => b.id === item.dataset.id)
        if (b) this.openDetail(b, grouped[b.category]||[])
      })
    })
  }

  openForm(budget = null) {
    const isEdit = !!budget
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${isEdit?'Editar':'Nuevo'} Presupuesto</h2>
        <button class="btn btn-icon btn-ghost" id="closeBudgForm">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Categoría *</label>
        <select class="form-input" id="budgCat">
          <option value="">Seleccionar</option>
          ${DEFAULT_EXPENSE_CATEGORIES.map(c=>`<option value="${c.name}" data-icon="${c.icon}" ${budget?.category===c.name?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Presupuesto mensual *</label><input type="number" class="form-input" id="budgAmount" placeholder="0.00" value="${budget?.amount||''}"/></div>
      <div class="form-group">
        <label class="form-label">Alerta al alcanzar (%)</label>
        <input type="range" id="alertSlider" min="10" max="100" step="5" value="${budget?.alert_percent||80}" style="width:100%;margin-bottom:4px"/>
        <div style="text-align:center;font-size:0.875rem;color:var(--accent);font-weight:700" id="alertVal">${budget?.alert_percent||80}%</div>
      </div>
      <button class="btn btn-primary btn-full btn-lg" id="saveBudg">${isEdit?'Actualizar':'Crear'} Presupuesto</button>`)

    document.querySelector('#closeBudgForm')?.addEventListener('click', close)
    document.querySelector('#alertSlider')?.addEventListener('input', e => {
      document.querySelector('#alertVal').textContent = e.target.value + '%'
    })
    document.querySelector('#saveBudg')?.addEventListener('click', async () => {
      const catEl = document.querySelector('#budgCat')
      const category = catEl?.value
      const amount = parseFloat(document.querySelector('#budgAmount')?.value)
      if (!category || !amount) { alert('Completa los campos requeridos'); return }
      const selectedOption = catEl.options[catEl.selectedIndex]
      const { error } = await this.store.saveBudget({
        ...(isEdit?{id:budget.id}:{}),
        category, amount,
        icon: selectedOption?.dataset.icon || '🏷️',
        month: this.currentMonth,
        alert_percent: parseInt(document.querySelector('#alertSlider')?.value)||80
      })
      if (error) { toast(error.message,'error'); return }
      toast(isEdit?'Presupuesto actualizado':'Presupuesto creado')
      close(); this.load()
    })
  }

  openDetail(budget, txs) {
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${budget.icon||'🏷️'} ${budget.category}</h2>
        <button class="btn btn-icon btn-ghost" id="closeBudgDetail">✕</button>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:1.5rem;font-weight:800;margin-bottom:4px">${fmt.currency(sumBy(txs,'amount'))} <span style="font-size:0.9rem;font-weight:400;color:var(--text-muted)">de ${fmt.currency(budget.amount)}</span></div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <button class="btn btn-secondary btn-full" id="editBudg">✏️ Editar</button>
        <button class="btn btn-danger btn-full" id="deleteBudg">🗑️ Eliminar</button>
      </div>
      <div class="section-title" style="margin-bottom:10px">Gastos en esta categoría</div>
      <div class="card" style="padding:8px 12px">
        ${txs.length===0?'<div class="empty-state" style="padding:24px"><div class="empty-icon">📭</div><div class="empty-title">Sin gastos</div></div>':
          txs.map(tx=>`<div class="transaction-item"><div class="tx-icon" style="background:var(--danger-light)">💸</div><div class="tx-info"><div class="tx-name">${tx.description||tx.category}</div><div class="tx-meta">${fmt.dateShort(tx.date)}</div></div><div class="tx-amount expense">-${fmt.currency(tx.amount)}</div></div>`).join('')}
      </div>`)

    document.querySelector('#closeBudgDetail')?.addEventListener('click', close)
    document.querySelector('#editBudg')?.addEventListener('click', () => { close(); this.openForm(budget) })
    document.querySelector('#deleteBudg')?.addEventListener('click', () => {
      close()
      confirmDialog('¿Eliminar este presupuesto?', async () => {
        await this.store.deleteBudget(budget.id)
        toast('Presupuesto eliminado')
        this.load()
      })
    })
  }
}
