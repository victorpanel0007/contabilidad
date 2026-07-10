import { fmt, sumBy } from '../../core/utils.js'
import { openModal, confirmDialog } from '../shared/Modal.js'
import { toast } from '../shared/Toast.js'
import { differenceInDays, parseISO, isPast } from 'date-fns'

export class DebtsView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.activeTab = 'owe' // owe | collect
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header"><span class="page-title">Deudas</span></div>
      <div class="page-content page-enter">
        <div class="tabs" style="margin-bottom:16px">
          <div class="tab active" data-tab="owe">Por Pagar</div>
          <div class="tab" data-tab="collect">Por Cobrar</div>
        </div>
        <div id="debtStats" style="margin-bottom:16px"></div>
        <div id="debtList"></div>
      </div>
      <button class="btn-fab" id="addDebt">＋</button>`

    document.querySelector('#addDebt')?.addEventListener('click', () => this.openForm())
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        this.activeTab = tab.dataset.tab
        this.renderStats()
        this.renderList()
      })
    })
  }

  async load() {
    this.debts = await this.store.getDebts()
    this.renderStats()
    this.renderList()
  }

  renderStats() {
    const filtered = this.debts.filter(d => d.type === this.activeTab)
    const total = sumBy(filtered, 'amount')
    const overdue = filtered.filter(d => d.due_date && isPast(parseISO(d.due_date)) && !d.paid)
    const el = document.querySelector('#debtStats')
    if (!el) return
    el.innerHTML = `
      <div class="grid-2">
        <div class="stat-card">
          <div class="stat-icon" style="background:${this.activeTab==='owe'?'var(--danger-light)':'var(--success-light)'}">${this.activeTab==='owe'?'💸':'💰'}</div>
          <div class="stat-info">
            <div class="stat-label">${this.activeTab==='owe'?'Total a pagar':'Total a cobrar'}</div>
            <div class="stat-value" style="color:${this.activeTab==='owe'?'var(--expense-color)':'var(--income-color)'}">${fmt.currency(total)}</div>
          </div>
        </div>
        <div class="stat-card" style="--stat-color:var(--warning)">
          <div class="stat-icon" style="background:var(--warning-light)">⚠️</div>
          <div class="stat-info">
            <div class="stat-label">Vencidas</div>
            <div class="stat-value" style="color:var(--warning)">${overdue.length}</div>
          </div>
        </div>
      </div>`
  }

  renderList() {
    const filtered = this.debts.filter(d => d.type === this.activeTab)
    const el = document.querySelector('#debtList')
    if (!el) return
    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">${this.activeTab==='owe'?'💸':'💰'}</div><div class="empty-title">Sin deudas</div><div class="empty-desc">${this.activeTab==='owe'?'No tienes deudas pendientes':'No tienes cobros pendientes'}</div></div>`
      return
    }
    const sorted = [...filtered].sort((a,b) => {
      if (a.paid && !b.paid) return 1
      if (!a.paid && b.paid) return -1
      return (a.due_date||'').localeCompare(b.due_date||'')
    })
    el.innerHTML = sorted.map(d => {
      const isOverdue = d.due_date && isPast(parseISO(d.due_date)) && !d.paid
      const daysLeft = d.due_date ? differenceInDays(parseISO(d.due_date), new Date()) : null
      return `
        <div class="debt-card${d.paid?' paid':''}${isOverdue?' overdue':''}" data-id="${d.id}" style="${d.paid?'opacity:0.5':''}">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:${isOverdue?'var(--danger-light)':d.paid?'var(--success-light)':this.activeTab==='owe'?'var(--danger-light)':'var(--success-light)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
            ${d.paid?'✅':isOverdue?'🚨':this.activeTab==='owe'?'💸':'💰'}
          </div>
          <div class="debt-card-info">
            <div class="debt-name">${d.person_name||'Sin nombre'}</div>
            <div class="debt-due" style="color:${isOverdue?'var(--danger)':'var(--text-muted)'}">
              ${d.description?d.description+' • ':''}
              ${daysLeft===null?'Sin fecha':daysLeft<0?`Venció hace ${Math.abs(daysLeft)} días`:daysLeft===0?'Vence hoy':`Vence en ${daysLeft} días`}
            </div>
          </div>
          <div class="debt-amount" style="color:${this.activeTab==='owe'?'var(--expense-color)':'var(--income-color)'}">${fmt.currency(d.amount)}</div>
        </div>`
    }).join('')

    el.querySelectorAll('.debt-card').forEach(card => {
      card.addEventListener('click', () => {
        const d = filtered.find(d => d.id === card.dataset.id)
        if (d) this.openDetail(d)
      })
    })
  }

  openForm(debt = null) {
    const isEdit = !!debt
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${isEdit?'Editar':'Nueva'} Deuda</h2>
        <button class="btn btn-icon btn-ghost" id="closeDebtForm">✕</button>
      </div>
      <div class="tabs" style="margin-bottom:16px">
        <div class="tab${(!debt||debt.type==='owe')?' active':''}" data-type="owe">Por Pagar</div>
        <div class="tab${(debt?.type==='collect')?' active':''}" data-type="collect">Por Cobrar</div>
      </div>
      <div class="form-group"><label class="form-label">Nombre de la persona *</label><input type="text" class="form-input" id="debtPerson" placeholder="Ej: Juan Pérez" value="${debt?.person_name||''}"/></div>
      <div class="form-group"><label class="form-label">Monto *</label><input type="number" class="form-input" id="debtAmount" placeholder="0.00" value="${debt?.amount||''}"/></div>
      <div class="form-group"><label class="form-label">Fecha de vencimiento</label><input type="date" class="form-input" id="debtDue" value="${debt?.due_date||''}"/></div>
      <div class="form-group"><label class="form-label">Descripción</label><input type="text" class="form-input" id="debtDesc" placeholder="Motivo o descripción" value="${debt?.description||''}"/></div>
      <button class="btn btn-primary btn-full btn-lg" id="saveDebt">${isEdit?'Actualizar':'Registrar'}</button>`)

    let selectedType = debt?.type || 'owe'
    document.querySelector('#closeDebtForm')?.addEventListener('click', close)
    document.querySelectorAll('[data-type]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-type]').forEach(t=>t.classList.remove('active'))
        tab.classList.add('active')
        selectedType = tab.dataset.type
      })
    })
    document.querySelector('#saveDebt')?.addEventListener('click', async () => {
      const person_name = document.querySelector('#debtPerson')?.value?.trim()
      const amount = parseFloat(document.querySelector('#debtAmount')?.value)
      if (!person_name || !amount) { alert('Completa los campos requeridos'); return }
      const { error } = await this.store.saveDebt({
        ...(isEdit?{id:debt.id}:{}),
        person_name, amount, type: selectedType,
        due_date: document.querySelector('#debtDue')?.value||null,
        description: document.querySelector('#debtDesc')?.value||null,
        paid: debt?.paid||false
      })
      if (error) { toast(error.message,'error'); return }
      toast(isEdit?'Deuda actualizada':'Deuda registrada')
      close(); this.load()
    })
  }

  openDetail(debt) {
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${debt.type==='owe'?'Deuda por pagar':'Por cobrar'}</h2>
        <button class="btn btn-icon btn-ghost" id="closeDebtDetail">✕</button>
      </div>
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:2rem;font-weight:900;color:${debt.type==='owe'?'var(--expense-color)':'var(--income-color)'}">${fmt.currency(debt.amount)}</div>
        <div style="color:var(--text-secondary);margin-top:4px">${debt.person_name}</div>
        ${debt.paid?'<div class="badge badge-success" style="margin:8px auto">✅ Pagado</div>':''}
      </div>
      <div class="card" style="margin-bottom:16px">
        ${debt.description?`<div style="padding:10px 0;border-bottom:1px solid var(--border-light)"><span style="color:var(--text-muted);font-size:0.85rem">Descripción: </span><span style="font-size:0.85rem;font-weight:600">${debt.description}</span></div>`:''}
        ${debt.due_date?`<div style="padding:10px 0"><span style="color:var(--text-muted);font-size:0.85rem">Vencimiento: </span><span style="font-size:0.85rem;font-weight:600">${fmt.date(debt.due_date)}</span></div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${!debt.paid?`<button class="btn btn-primary btn-full" id="markPaid">✅ Marcar como pagado</button>`:''}
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-full" id="editDebt">✏️ Editar</button>
          <button class="btn btn-danger btn-full" id="deleteDebt">🗑️ Eliminar</button>
        </div>
      </div>`)

    document.querySelector('#closeDebtDetail')?.addEventListener('click', close)
    document.querySelector('#markPaid')?.addEventListener('click', async () => {
      await this.store.saveDebt({ ...debt, paid: true })
      toast('Marcado como pagado ✅')
      close(); this.load()
    })
    document.querySelector('#editDebt')?.addEventListener('click', () => { close(); this.openForm(debt) })
    document.querySelector('#deleteDebt')?.addEventListener('click', () => {
      close()
      confirmDialog('¿Eliminar esta deuda?', async () => {
        await this.store.deleteDebt(debt.id)
        toast('Deuda eliminada')
        this.load()
      })
    })
  }
}
