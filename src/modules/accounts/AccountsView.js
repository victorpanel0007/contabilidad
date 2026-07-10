import { fmt, ACCOUNT_TYPES, ACCOUNT_COLORS } from '../../core/utils.js'
import { openModal, confirmDialog } from '../shared/Modal.js'
import { toast } from '../shared/Toast.js'

export class AccountsView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header">
        <span class="page-title">Cuentas</span>
      </div>
      <div class="page-content page-enter">
        <div id="accTotal" style="margin-bottom:20px"></div>
        <div id="accList"></div>
        <div id="accRecentSection" style="margin-top:20px"></div>
      </div>
      <button class="btn-fab" id="addAccount">＋</button>`

    this.container.querySelector('#addAccount')?.addEventListener('click', () => this.openForm())
  }

  async load() {
    const [accounts, txs] = await Promise.all([
      this.store.getAccounts(),
      this.store.getTransactions({ limit: 10 })
    ])
    this.accounts = accounts
    this.renderTotal(accounts)
    this.renderList(accounts)
    this.renderTransactions(txs)
  }

  getTypeInfo(typeValue) {
    return ACCOUNT_TYPES.find(t => t.value === typeValue) || { label: typeValue || 'Cuenta', icon: '💳' }
  }

  renderTotal(accounts) {
    const total = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
    const el = this.container.querySelector('#accTotal')
    if (!el) return
    el.innerHTML = `
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:var(--radius-xl);padding:24px 20px;color:white;box-shadow:0 8px 32px rgba(99,102,241,0.3);position:relative;overflow:hidden">
        <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.08);pointer-events:none"></div>
        <div style="font-size:0.8rem;opacity:0.8;margin-bottom:8px;font-weight:500">Patrimonio Total</div>
        <div style="font-size:2.2rem;font-weight:900;letter-spacing:-0.02em">${fmt.currency(total)}</div>
        <div style="font-size:0.8rem;opacity:0.7;margin-top:6px">${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''}</div>
      </div>`
  }

  renderList(accounts) {
    const el = this.container.querySelector('#accList')
    if (!el) return

    if (accounts.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏦</div>
          <div class="empty-title">Sin cuentas</div>
          <div class="empty-desc">Toca + para agregar tu primera cuenta</div>
        </div>`
      return
    }

    // Agrupar por tipo
    const groups = {}
    accounts.forEach(a => {
      const key = a.type || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(a)
    })

    el.innerHTML = Object.entries(groups).map(([type, accs]) => {
      const typeInfo = this.getTypeInfo(type)
      return `
        <div style="margin-bottom:20px">
          <div class="section-header">
            <span class="section-title">${typeInfo.icon} ${typeInfo.label}</span>
          </div>
          <div class="grid-2">
            ${accs.map(a => `
              <div class="account-card" data-id="${a.id}">
                <div class="account-card-header">
                  <div class="account-card-icon" style="background:${(a.color || '#6366f1')}22;color:${a.color || '#6366f1'}">
                    ${typeInfo.icon}
                  </div>
                  <button class="btn btn-icon btn-ghost acc-menu-btn" data-id="${a.id}">⋯</button>
                </div>
                <div class="account-card-name">${a.name}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:6px">${typeInfo.label}</div>
                <div class="account-card-balance" style="color:${a.color || 'var(--accent)'}">
                  ${fmt.currency(a.balance || 0)}
                </div>
              </div>`).join('')}
          </div>
        </div>`
    }).join('')

    // Eventos de menú
    el.querySelectorAll('.acc-menu-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const acc = accounts.find(a => a.id === btn.dataset.id)
        if (acc) this.openAccountMenu(acc)
      })
    })
  }

  renderTransactions(txs) {
    const el = this.container.querySelector('#accRecentSection')
    if (!el) return
    if (!txs || txs.length === 0) { el.innerHTML = ''; return }

    el.innerHTML = `
      <div class="section-header">
        <span class="section-title">Movimientos Recientes</span>
      </div>
      <div class="card" style="padding:4px 12px">
        ${txs.map(tx => {
          const isIncome = tx.type === 'income'
          const icon = tx.icon || (isIncome ? '💰' : '💸')
          const accName = tx.accounts?.name || ''
          return `
            <div class="transaction-item">
              <div class="tx-icon" style="background:${isIncome ? 'var(--success-light)' : 'var(--danger-light)'}">
                ${icon}
              </div>
              <div class="tx-info">
                <div class="tx-name">${tx.description || tx.category || 'Sin descripción'}</div>
                <div class="tx-meta">${accName}${accName && tx.date ? ' · ' : ''}${fmt.dateShort(tx.date)}</div>
              </div>
              <div class="tx-amount ${tx.type}">
                ${isIncome ? '+' : '-'}${fmt.currency(tx.amount)}
              </div>
            </div>`
        }).join('')}
      </div>`
  }

  openAccountMenu(acc) {
    const typeInfo = this.getTypeInfo(acc.type)
    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${typeInfo.icon} ${acc.name}</h2>
        <button class="btn btn-icon btn-ghost" id="closeMenu">✕</button>
      </div>

      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px">${typeInfo.label}</div>
        <div style="font-size:2rem;font-weight:900;color:${acc.color || 'var(--accent)'}">
          ${fmt.currency(acc.balance || 0)}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-secondary btn-full" id="editAcc">✏️ Editar cuenta</button>
        <button class="btn btn-secondary btn-full" id="transferBtn">↔️ Transferir a otra cuenta</button>
        <button class="btn btn-secondary btn-full" id="recalcBtn">🔄 Recalcular saldo</button>
        <button class="btn btn-danger btn-full" id="deleteAcc">🗑️ Eliminar cuenta</button>
      </div>
      <div id="recalcMsg" style="margin-top:12px;font-size:0.85rem;text-align:center"></div>`)

    document.querySelector('#closeMenu')?.addEventListener('click', close)
    document.querySelector('#editAcc')?.addEventListener('click', () => { close(); this.openForm(acc) })
    document.querySelector('#transferBtn')?.addEventListener('click', () => { close(); this.openTransfer(acc) })

    document.querySelector('#deleteAcc')?.addEventListener('click', () => {
      close()
      confirmDialog(`¿Eliminar la cuenta "${acc.name}"?`, async () => {
        await this.store.deleteAccount(acc.id)
        toast('Cuenta eliminada')
        this.load()
      })
    })

    document.querySelector('#recalcBtn')?.addEventListener('click', async () => {
      const btn = document.querySelector('#recalcBtn')
      const msg = document.querySelector('#recalcMsg')
      btn.innerHTML = '<span class="spinner"></span> Calculando...'
      btn.disabled = true
      const { balance, error } = await this.store.recalcAccountBalance(acc.id)
      if (error) {
        msg.style.color = 'var(--danger)'
        msg.textContent = '❌ Error al recalcular'
        btn.disabled = false
      } else {
        msg.style.color = 'var(--success)'
        msg.textContent = `✅ Saldo corregido: ${fmt.currency(balance)}`
        setTimeout(() => { close(); this.load() }, 1500)
      }
    })
  }

  openForm(acc = null) {
    const isEdit = !!acc
    // Determinar tipo seleccionado por defecto
    const defaultType = acc?.type || 'cash'

    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? 'Editar' : 'Nueva'} Cuenta</h2>
        <button class="btn btn-icon btn-ghost" id="closeAccForm">✕</button>
      </div>

      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input type="text" class="form-input" id="accName"
          placeholder="Ej: Nequi, Efectivo casa, Bancolombia..."
          value="${acc?.name || ''}"/>
      </div>

      <div class="form-group">
        <label class="form-label">Tipo de cuenta *</label>
        <div id="typeGrid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${ACCOUNT_TYPES.map(t => `
            <div class="acc-type-btn${(acc?.type || defaultType) === t.value ? ' acc-type-active' : ''}"
              data-type="${t.value}"
              style="padding:12px 8px;border-radius:var(--radius-md);
                border:1.5px solid ${(acc?.type || defaultType) === t.value ? 'var(--accent)' : 'var(--border)'};
                background:${(acc?.type || defaultType) === t.value ? 'var(--accent-light)' : 'var(--bg-tertiary)'};
                color:${(acc?.type || defaultType) === t.value ? 'var(--accent)' : 'var(--text-secondary)'};
                text-align:center;cursor:pointer;transition:all var(--transition);font-size:0.82rem;font-weight:600">
              <div style="font-size:1.4rem;margin-bottom:4px">${t.icon}</div>
              ${t.label}
            </div>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Saldo ${isEdit ? 'actual' : 'inicial'}</label>
        <input type="number" class="form-input" id="accBalance"
          placeholder="0" step="1000" min="0"
          value="${acc?.balance || '0'}"/>
      </div>

      <div class="form-group">
        <label class="form-label">Color</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${ACCOUNT_COLORS.map(c => `
            <div class="color-dot" data-color="${c}"
              style="width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;
                border:2px solid ${(acc?.color || ACCOUNT_COLORS[0]) === c ? 'white' : 'transparent'};
                box-shadow:${(acc?.color || ACCOUNT_COLORS[0]) === c ? '0 0 0 2px ' + c : 'none'};
                transition:all 0.15s">
            </div>`).join('')}
        </div>
      </div>

      <button class="btn btn-primary btn-full btn-lg" id="saveAcc">
        ${isEdit ? 'Actualizar' : 'Crear'} Cuenta
      </button>`)

    let selectedType  = acc?.type  || defaultType
    let selectedColor = acc?.color || ACCOUNT_COLORS[0]

    document.querySelector('#closeAccForm')?.addEventListener('click', close)

    // Selección de tipo
    document.querySelector('#typeGrid')?.addEventListener('click', e => {
      const btn = e.target.closest('.acc-type-btn')
      if (!btn) return
      document.querySelectorAll('.acc-type-btn').forEach(b => {
        b.classList.remove('acc-type-active')
        b.style.borderColor = 'var(--border)'
        b.style.background  = 'var(--bg-tertiary)'
        b.style.color       = 'var(--text-secondary)'
      })
      btn.classList.add('acc-type-active')
      btn.style.borderColor = 'var(--accent)'
      btn.style.background  = 'var(--accent-light)'
      btn.style.color       = 'var(--accent)'
      selectedType = btn.dataset.type
    })

    // Selección de color
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => {
          d.style.border     = '2px solid transparent'
          d.style.boxShadow  = 'none'
        })
        dot.style.border    = '2px solid white'
        dot.style.boxShadow = `0 0 0 2px ${dot.dataset.color}`
        selectedColor = dot.dataset.color
      })
    })

    // Guardar
    document.querySelector('#saveAcc')?.addEventListener('click', async () => {
      const name = document.querySelector('#accName')?.value?.trim()
      if (!name) { alert('Ingresa un nombre para la cuenta'); return }

      const btn = document.querySelector('#saveAcc')
      btn.innerHTML = '<span class="spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:white"></span>'
      btn.disabled  = true

      const balanceVal = parseFloat(document.querySelector('#accBalance')?.value) || 0
      const payload = {
        ...(isEdit ? { id: acc.id } : {}),
        name,
        type:          selectedType,
        color:         selectedColor,
        balance:       balanceVal,
        initial_balance: isEdit ? (acc.initial_balance || 0) : balanceVal
      }

      const { error } = await this.store.saveAccount(payload)

      if (error) {
        toast(error.message, 'error')
        btn.innerHTML = isEdit ? 'Actualizar Cuenta' : 'Crear Cuenta'
        btn.disabled  = false
        return
      }

      toast(isEdit ? 'Cuenta actualizada ✓' : 'Cuenta creada ✓')
      close()
      this.load()
    })
  }

  openTransfer(fromAcc) {
    const others = this.accounts.filter(a => a.id !== fromAcc.id)
    if (others.length === 0) {
      toast('Necesitas al menos 2 cuentas para transferir', 'error')
      return
    }

    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">↔️ Transferir</h2>
        <button class="btn btn-icon btn-ghost" id="closeTransfer">✕</button>
      </div>

      <div class="form-group">
        <label class="form-label">Desde</label>
        <div style="padding:10px 14px;background:var(--bg-tertiary);border-radius:var(--radius-md);font-weight:600">
          ${this.getTypeInfo(fromAcc.type).icon} ${fromAcc.name}
          <span style="color:var(--text-muted);font-weight:400;font-size:0.85rem"> · ${fmt.currency(fromAcc.balance || 0)}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Hacia *</label>
        <select class="form-input" id="toAccount">
          <option value="">Selecciona cuenta destino</option>
          ${others.map(a => `
            <option value="${a.id}">
              ${this.getTypeInfo(a.type).icon} ${a.name} · ${fmt.currency(a.balance || 0)}
            </option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Monto *</label>
        <input type="number" class="form-input" id="transferAmount"
          placeholder="0" step="1000" min="0"/>
      </div>

      <div class="form-group">
        <label class="form-label">Fecha</label>
        <input type="date" class="form-input" id="transferDate"
          value="${new Date().toISOString().substring(0, 10)}"/>
      </div>

      <button class="btn btn-primary btn-full btn-lg" id="doTransfer">Transferir</button>`)

    document.querySelector('#closeTransfer')?.addEventListener('click', close)

    document.querySelector('#doTransfer')?.addEventListener('click', async () => {
      const toId   = document.querySelector('#toAccount')?.value
      const amount = parseFloat(document.querySelector('#transferAmount')?.value)
      const date   = document.querySelector('#transferDate')?.value

      if (!toId)             { alert('Selecciona una cuenta destino'); return }
      if (!amount || amount <= 0) { alert('Ingresa un monto válido'); return }

      const btn   = document.querySelector('#doTransfer')
      btn.innerHTML = '<span class="spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:white"></span>'
      btn.disabled  = true

      const toAcc = this.accounts.find(a => a.id === toId)

      // Dos transacciones que actualizan saldos automáticamente
      await Promise.all([
        this.store.saveTransaction({
          type: 'expense', amount,
          description: `Transferencia a ${toAcc?.name}`,
          category: 'Transferencia', icon: '↔️',
          date, account_id: fromAcc.id
        }),
        this.store.saveTransaction({
          type: 'income', amount,
          description: `Transferencia desde ${fromAcc.name}`,
          category: 'Transferencia', icon: '↔️',
          date, account_id: toId
        })
      ])

      toast(`Transferencia de ${fmt.currency(amount)} realizada ✓`)
      close()
      this.load()
    })
  }
}
