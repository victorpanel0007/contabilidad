import { openModal } from './Modal.js'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, fmt, ACCOUNT_TYPES } from '../../core/utils.js'

const PAYMENT_METHODS = [
  { value: 'Nequi',           icon: '💜' },
  { value: 'Daviplata',       icon: '🔴' },
  { value: 'Efectivo',        icon: '💵' },
  { value: 'Tarjeta débito',  icon: '💳' },
  { value: 'Tarjeta crédito', icon: '💴' },
  { value: 'Transferencia',   icon: '🏦' },
  { value: 'PSE',             icon: '🌐' },
  { value: 'Cheque',          icon: '📄' },
  { value: 'Otro',            icon: '📦' }
]

export class TransactionForm {
  constructor(type, store, existing, onSave) {
    this.type     = type      // 'income' | 'expense'
    this.store    = store
    this.existing = existing  // null = nueva, objeto = edición
    this.onSave   = onSave
  }

  async open() {
    const [accounts, categories] = await Promise.all([
      this.store.getAccounts(),
      this.store.getCategories(this.type)
    ])

    const allCats = categories.length > 0
      ? categories
      : (this.type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES)

    const isEdit = !!this.existing
    const tx     = this.existing || {}
    const today  = new Date().toISOString().substring(0, 10)
    const label  = this.type === 'expense' ? 'Gasto' : 'Ingreso'

    const { close } = openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} ${label}</h2>
        <button class="btn btn-icon btn-ghost" id="closeTxForm">✕</button>
      </div>

      <!-- MONTO -->
      <div class="form-group">
        <label class="form-label">Monto *</label>
        <div style="position:relative">
          <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);
            font-size:1.1rem;font-weight:700;color:var(--text-muted);pointer-events:none">$</span>
          <input type="number" class="form-input" id="txAmount"
            placeholder="0" step="100" min="0" value="${tx.amount || ''}"
            style="font-size:1.5rem;font-weight:700;text-align:right;
              padding-left:32px;padding-right:14px"/>
        </div>
        <div id="amountHint"
          style="font-size:0.75rem;color:var(--text-muted);text-align:right;margin-top:4px;min-height:16px"></div>
      </div>

      <!-- DESCRIPCIÓN -->
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input type="text" class="form-input" id="txDesc"
          placeholder="Descripción opcional" value="${tx.description || ''}"/>
      </div>

      <!-- CATEGORÍA -->
      <div class="form-group">
        <label class="form-label">Categoría</label>
        <div class="cat-grid" id="catGrid">
          ${allCats.map(c => `
            <div class="cat-chip${tx.category === c.name ? ' active' : ''}"
              data-cat="${c.name}" data-icon="${c.icon || '📦'}"
              style="--cat-color:${c.color || '#6366f1'}">
              <span class="cat-chip-icon">${c.icon || '📦'}</span>
              <span class="cat-chip-label">${c.name}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- FECHA -->
      <div class="form-group">
        <label class="form-label">Fecha *</label>
        <input type="date" class="form-input" id="txDate" value="${tx.date || today}"/>
      </div>

      <!-- CUENTA -->
      <div class="form-group">
        <label class="form-label">Cuenta</label>
        ${accounts.length === 0
          ? `<p style="font-size:0.8rem;color:var(--text-muted)">
               No tienes cuentas aún. Créalas en la sección Cuentas.
             </p>`
          : `<div class="acc-selector" id="accSelector">
              <div class="acc-chip${!tx.account_id ? ' active' : ''}"
                data-id="" data-balance="0">
                <span style="font-size:1.1rem">🚫</span>
                <span class="acc-chip-label">Sin cuenta</span>
              </div>
              ${accounts.map(a => {
                const ti = ACCOUNT_TYPES.find(t => t.value === a.type) || { icon: '💳', label: a.type || 'Cuenta' }
                return `
                  <div class="acc-chip${tx.account_id === a.id ? ' active' : ''}"
                    data-id="${a.id}" data-balance="${a.balance || 0}">
                    <span style="font-size:1.1rem">${ti.icon}</span>
                    <span class="acc-chip-label">${a.name}</span>
                    <span class="acc-chip-type">${ti.label}</span>
                  </div>`
              }).join('')}
            </div>
            <div id="accBalHint"
              style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;min-height:16px;text-align:right"></div>`
        }
      </div>

      <!-- MÉTODO DE PAGO -->
      <div class="form-group">
        <label class="form-label">Método de pago</label>
        <div class="payment-grid" id="paymentGrid">
          ${PAYMENT_METHODS.map(m => `
            <div class="payment-chip${tx.payment_method === m.value ? ' active' : ''}"
              data-method="${m.value}">
              <span>${m.icon}</span>
              <span class="payment-label">${m.value}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- NOTAS -->
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-input" id="txNotes"
          placeholder="Notas adicionales..." rows="2">${tx.notes || ''}</textarea>
      </div>

      <button class="btn btn-primary btn-full btn-lg" id="saveTxBtn">
        ${isEdit ? 'Actualizar' : 'Guardar'} ${label}
      </button>

      <style>
        /* Categorías */
        .cat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
        .cat-chip {
          display:flex; flex-direction:column; align-items:center; gap:4px;
          padding:8px 4px; border-radius:var(--radius-md);
          border:1.5px solid var(--border); cursor:pointer;
          transition:all var(--transition); background:var(--bg-tertiary);
        }
        .cat-chip.active {
          border-color:var(--cat-color, var(--accent));
          background:color-mix(in srgb, var(--cat-color, var(--accent)) 12%, transparent);
        }
        .cat-chip-icon  { font-size:1.2rem; }
        .cat-chip-label { font-size:0.65rem; font-weight:600; text-align:center;
          color:var(--text-secondary); line-height:1.2; }
        .cat-chip.active .cat-chip-label { color:var(--cat-color, var(--accent)); }

        /* Cuentas */
        .acc-selector { display:flex; flex-wrap:wrap; gap:6px; }
        .acc-chip {
          display:flex; flex-direction:column; align-items:center; gap:2px;
          padding:8px 6px; min-width:68px; max-width:88px;
          border-radius:var(--radius-md); border:1.5px solid var(--border);
          cursor:pointer; transition:all var(--transition);
          background:var(--bg-tertiary); text-align:center;
        }
        .acc-chip.active { border-color:var(--accent); background:var(--accent-light); }
        .acc-chip-label  { font-size:0.7rem; font-weight:600; color:var(--text-secondary);
          line-height:1.3; word-break:break-word; }
        .acc-chip.active .acc-chip-label { color:var(--accent); }
        .acc-chip-type   { font-size:0.6rem; color:var(--text-muted); }
        .acc-chip.active .acc-chip-type  { color:var(--accent); opacity:0.8; }

        /* Métodos de pago */
        .payment-grid { display:flex; flex-wrap:wrap; gap:6px; }
        .payment-chip {
          display:flex; align-items:center; gap:5px; padding:6px 10px;
          border-radius:var(--radius-full); border:1.5px solid var(--border);
          cursor:pointer; transition:all var(--transition);
          background:var(--bg-tertiary); font-size:0.8rem;
          font-weight:600; color:var(--text-secondary);
        }
        .payment-chip.active { border-color:var(--accent); background:var(--accent-light); color:var(--accent); }
        .payment-label { font-size:0.78rem; }
      </style>`)

    // ── Estado local del formulario ───────────────────────────────────────────
    let selectedCat    = tx.category       || ''
    let selectedIcon   = tx.icon           || ''
    let selectedAccId  = tx.account_id     || ''
    let selectedAccBal = 0
    let selectedMethod = tx.payment_method || ''

    // Inicializar balance de cuenta pre-seleccionada (edición)
    if (selectedAccId) {
      const acc = accounts.find(a => a.id === selectedAccId)
      if (acc) selectedAccBal = Number(acc.balance) || 0
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel)

    const updateBalanceHint = () => {
      const div    = $('#accBalHint')
      if (!div) return
      if (!selectedAccId) { div.innerHTML = ''; return }
      const amount = parseFloat($('#txAmount')?.value) || 0
      const newBal = this.type === 'income'
        ? selectedAccBal + amount
        : selectedAccBal - amount
      const color  = this.type === 'income' ? 'var(--success)' : 'var(--danger)'
      div.innerHTML = `Saldo: <strong>${fmt.currency(selectedAccBal)}</strong>`
        + (amount > 0
          ? ` → <strong style="color:${color}">${fmt.currency(newBal)}</strong>`
          : '')
    }

    // ── Eventos ───────────────────────────────────────────────────────────────

    // Cerrar
    $('#closeTxForm')?.addEventListener('click', close)

    // Monto → actualiza hint de saldo
    $('#txAmount')?.addEventListener('input', e => {
      const v    = parseFloat(e.target.value)
      const hint = $('#amountHint')
      if (hint) hint.textContent = v > 0 ? fmt.currency(v) : ''
      updateBalanceHint()
    })

    // Categoría
    $('#catGrid')?.addEventListener('click', e => {
      const chip = e.target.closest('.cat-chip')
      if (!chip) return
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      selectedCat  = chip.dataset.cat
      selectedIcon = chip.dataset.icon
    })

    // Cuenta
    $('#accSelector')?.addEventListener('click', e => {
      const chip = e.target.closest('.acc-chip')
      if (!chip) return
      document.querySelectorAll('.acc-chip').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      selectedAccId  = chip.dataset.id   || ''
      selectedAccBal = parseFloat(chip.dataset.balance) || 0
      updateBalanceHint()
    })

    // Método de pago (toggle)
    $('#paymentGrid')?.addEventListener('click', e => {
      const chip = e.target.closest('.payment-chip')
      if (!chip) return
      const wasActive = chip.classList.contains('active')
      document.querySelectorAll('.payment-chip').forEach(c => c.classList.remove('active'))
      if (!wasActive) {
        chip.classList.add('active')
        selectedMethod = chip.dataset.method
      } else {
        selectedMethod = ''
      }
    })

    // Inicializar hint si ya hay cuenta seleccionada
    updateBalanceHint()

    // ── Guardar ───────────────────────────────────────────────────────────────
    $('#saveTxBtn')?.addEventListener('click', async () => {
      const amount = parseFloat($('#txAmount')?.value)
      const date   = $('#txDate')?.value

      if (!amount || amount <= 0) { alert('Ingresa un monto válido'); return }
      if (!date)                  { alert('Selecciona una fecha');    return }

      const btn = $('#saveTxBtn')
      btn.innerHTML = '<span class="spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:white"></span>'
      btn.disabled  = true

      const payload = {
        ...(isEdit ? { id: this.existing.id } : {}),
        type:           this.type,
        amount,
        description:    $('#txDesc')?.value  || null,
        category:       selectedCat          || null,
        icon:           selectedIcon         || null,
        date,
        account_id:     selectedAccId        || null,
        payment_method: selectedMethod       || null,
        notes:          $('#txNotes')?.value || null
      }

      const ok = await this.onSave(payload)
      if (ok) {
        close()
      } else {
        btn.innerHTML = `${isEdit ? 'Actualizar' : 'Guardar'} ${label}`
        btn.disabled  = false
      }
    })

    // Enter en descripción → foco al botón guardar
    $('#txDesc')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#saveTxBtn')?.focus()
    })
  }
}
