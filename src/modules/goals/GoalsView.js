import { fmt } from '../../core/utils.js'
import { openModal, confirmDialog } from '../shared/Modal.js'
import { toast } from '../shared/Toast.js'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const GOAL_ICONS = ['🏠','🚗','✈️','🎓','💍','📱','💻','🏖️','🏋️','🎯','💰','🌟']

export class GoalsView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header"><span class="page-title">Metas de Ahorro</span></div>
      <div class="page-content page-enter">
        <div id="goalsSummary" style="margin-bottom:20px"></div>
        <div class="section-header"><span class="section-title">Mis Metas</span></div>
        <div id="goalsList"></div>
      </div>
      <button class="btn-fab" id="addGoal">＋</button>`
    document.querySelector('#addGoal')?.addEventListener('click', () => this.openForm())
  }

  async load() {
    this.goals = await this.store.getGoals()
    this.renderSummary()
    this.renderList()
  }

  renderSummary() {
    const el = document.querySelector('#goalsSummary')
    if (!el || !this.goals.length) { if (el) el.innerHTML = ''; return }
    const totalTarget = this.goals.reduce((s,g)=>s+g.target_amount,0)
    const totalSaved = this.goals.reduce((s,g)=>s+(g.current_amount||0),0)
    const pct = totalTarget>0?Math.round(totalSaved/totalTarget*100):0
    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1));border-color:var(--accent-light)">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div><div style="font-size:0.75rem;color:var(--text-muted)">Total ahorrado</div><div style="font-size:1.3rem;font-weight:800;color:var(--accent)">${fmt.currency(totalSaved)}</div></div>
          <div style="text-align:right"><div style="font-size:0.75rem;color:var(--text-muted)">Meta total</div><div style="font-size:1rem;font-weight:700">${fmt.currency(totalTarget)}</div></div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--accent)"></div></div>
        <div style="text-align:center;font-size:0.75rem;color:var(--text-muted);margin-top:6px">${pct}% del total alcanzado · ${this.goals.length} meta${this.goals.length!==1?'s':''}</div>
      </div>`
  }

  renderList() {
    const el = document.querySelector('#goalsList')
    if (!el) return
    if (!this.goals.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-title">Sin metas</div><div class="empty-desc">Crea tu primera meta de ahorro</div></div>`
      return
    }
    el.innerHTML = this.goals.map(g => {
      const pct = g.target_amount>0?Math.min(100,Math.round((g.current_amount||0)/g.target_amount*100)):0
      const remaining = g.target_amount - (g.current_amount||0)
      const daysLeft = g.target_date ? differenceInDays(parseISO(g.target_date), new Date()) : null
      const cls = pct>=100?'success':pct>=60?'':''
      return `
        <div class="goal-card" data-id="${g.id}">
          <div class="goal-card-header">
            <div>
              <div style="font-size:1.5rem;margin-bottom:6px">${g.icon||'⭐'}</div>
              <div class="goal-name">${g.name}</div>
              <div class="goal-target">Meta: ${fmt.currency(g.target_amount)}</div>
              ${daysLeft!==null?`<div style="font-size:0.75rem;color:${daysLeft<0?'var(--danger)':'var(--text-muted)'}">📅 ${daysLeft<0?'Venció hace '+Math.abs(daysLeft)+' días':daysLeft===0?'Hoy':'En '+daysLeft+' días'}</div>`:''}
            </div>
            <div class="goal-percent" style="color:${pct>=100?'var(--success)':'var(--accent)'}">${pct}%</div>
          </div>
          <div class="progress-bar" style="margin-bottom:8px">
            <div class="progress-fill ${cls}" style="width:${pct}%;background:${pct>=100?'var(--success)':'var(--accent)'}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem">
            <span style="color:var(--text-muted)">Ahorrado: <strong style="color:var(--accent)">${fmt.currency(g.current_amount||0)}</strong></span>
            <span style="color:var(--text-muted)">${pct<100?`Faltan: ${fmt.currency(remaining)}`:'¡Meta alcanzada! 🎉'}</span>
          </div>
        </div>`
    }).join('')

    el.querySelectorAll('.goal-card').forEach(card => {
      card.addEventListener('click', () => {
        const goal = this.goals.find(g => g.id === card.dataset.id)
        if (goal) this.openDetail(goal)
      })
    })
  }

  openForm(goal = null) {
    const isEdit = !!goal
    const today = new Date().toISOString().substring(0,10)
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${isEdit?'Editar':'Nueva'} Meta</h2>
        <button class="btn btn-icon btn-ghost" id="closeGoalForm">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Ícono</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px">
          ${GOAL_ICONS.map(i=>`<button class="icon-btn${(goal?.icon||GOAL_ICONS[0])===i?' active':''}" data-icon="${i}" style="width:40px;height:40px;border-radius:var(--radius-md);border:1.5px solid var(--border);font-size:1.25rem;background:var(--bg-tertiary);cursor:pointer;transition:all var(--transition)">${i}</button>`).join('')}
        </div>
      </div>
      <div class="form-group"><label class="form-label">Nombre de la meta *</label><input type="text" class="form-input" id="goalName" placeholder="Ej: Casa propia" value="${goal?.name||''}"/></div>
      <div class="form-group"><label class="form-label">Monto objetivo *</label><input type="number" class="form-input" id="goalTarget" placeholder="0.00" value="${goal?.target_amount||''}"/></div>
      <div class="form-group"><label class="form-label">Monto actual ahorrado</label><input type="number" class="form-input" id="goalCurrent" placeholder="0.00" value="${goal?.current_amount||'0'}"/></div>
      <div class="form-group"><label class="form-label">Fecha objetivo</label><input type="date" class="form-input" id="goalDate" value="${goal?.target_date||''}"/></div>
      <div class="form-group"><label class="form-label">Descripción</label><textarea class="form-input" id="goalDesc" placeholder="Describe tu meta...">${goal?.description||''}</textarea></div>
      <button class="btn btn-primary btn-full btn-lg" id="saveGoal">${isEdit?'Actualizar':'Crear'} Meta</button>`)

    let selectedIcon = goal?.icon || GOAL_ICONS[0]
    document.querySelector('#closeGoalForm')?.addEventListener('click', close)
    document.querySelectorAll('.icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.icon-btn').forEach(b => { b.classList.remove('active'); b.style.borderColor='var(--border)'; b.style.background='var(--bg-tertiary)' })
        btn.classList.add('active'); btn.style.borderColor='var(--accent)'; btn.style.background='var(--accent-light)'
        selectedIcon = btn.dataset.icon
      })
    })

    document.querySelector('#saveGoal')?.addEventListener('click', async () => {
      const name = document.querySelector('#goalName')?.value?.trim()
      const target = parseFloat(document.querySelector('#goalTarget')?.value)
      if (!name || !target) { alert('Completa nombre y monto objetivo'); return }
      const { error } = await this.store.saveGoal({
        ...(isEdit?{id:goal.id}:{}),
        name, target_amount: target, icon: selectedIcon,
        current_amount: parseFloat(document.querySelector('#goalCurrent')?.value)||0,
        target_date: document.querySelector('#goalDate')?.value||null,
        description: document.querySelector('#goalDesc')?.value||null
      })
      if (error) { toast(error.message,'error'); return }
      toast(isEdit?'Meta actualizada':'Meta creada')
      close(); this.load()
    })
  }

  openDetail(goal) {
    const pct = goal.target_amount>0?Math.min(100,Math.round((goal.current_amount||0)/goal.target_amount*100)):0
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${goal.icon||'⭐'} ${goal.name}</h2>
        <button class="btn btn-icon btn-ghost" id="closeGoalDetail">✕</button>
      </div>
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:2.5rem;font-weight:900;color:var(--accent)">${pct}%</div>
        <div style="color:var(--text-secondary);margin-top:4px">${fmt.currency(goal.current_amount||0)} de ${fmt.currency(goal.target_amount)}</div>
      </div>
      <div class="progress-bar" style="height:12px;margin-bottom:16px"><div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--success)':'var(--accent)'}"></div></div>
      <div class="form-group">
        <label class="form-label">Agregar ahorro</label>
        <div style="display:flex;gap:8px">
          <input type="number" class="form-input" id="addAmount" placeholder="0.00" style="flex:1"/>
          <button class="btn btn-primary" id="addSaving">Agregar</button>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn btn-secondary btn-full" id="editGoal">✏️ Editar</button>
        <button class="btn btn-danger btn-full" id="deleteGoal">🗑️ Eliminar</button>
      </div>`)

    document.querySelector('#closeGoalDetail')?.addEventListener('click', close)
    document.querySelector('#addSaving')?.addEventListener('click', async () => {
      const add = parseFloat(document.querySelector('#addAmount')?.value)
      if (!add || add<=0) { alert('Ingresa un monto válido'); return }
      const { error } = await this.store.saveGoal({ ...goal, current_amount: (goal.current_amount||0)+add })
      if (error) { toast(error.message,'error'); return }
      toast('Ahorro agregado 🎉')
      close(); this.load()
    })
    document.querySelector('#editGoal')?.addEventListener('click', () => { close(); this.openForm(goal) })
    document.querySelector('#deleteGoal')?.addEventListener('click', () => {
      close()
      confirmDialog('¿Eliminar esta meta?', async () => {
        await this.store.deleteGoal(goal.id)
        toast('Meta eliminada')
        this.load()
      })
    })
  }
}
