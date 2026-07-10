import { supabase } from './supabase.js'

export class Store {
  constructor() {
    this.user = null
    this.cache = new Map()
    this.listeners = new Map()
  }

  setUser(user) {
    this.user = user
    // Limpiar caché viejo que pueda tener USD
    const cached = JSON.parse(localStorage.getItem('finanzapp-profile') || '{}')
    if (!cached.currency || cached.currency === 'USD') {
      localStorage.setItem('finanzapp-profile', JSON.stringify({ ...cached, currency: 'COP' }))
    }
    this.loadProfileCache()
  }

  async loadProfileCache() {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', this.user.id).single()
      if (data) {
        // Si el perfil en Supabase tiene USD (o vacío), actualizar a COP
        if (!data.currency || data.currency === 'USD') {
          data.currency = 'COP'
          await supabase.from('profiles').update({ currency: 'COP' }).eq('id', this.user.id)
        }
        localStorage.setItem('finanzapp-profile', JSON.stringify(data))
      }
    } catch {}
  }

  emit(event, data) {
    const fns = this.listeners.get(event) || []
    fns.forEach(fn => fn(data))
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(fn)
  }

  // ── Accounts ──────────────────────────────────────────────────────────────
  async getAccounts() {
    const { data } = await supabase.from('accounts').select('*').eq('user_id', this.user.id).order('name')
    return data || []
  }

  async saveAccount(account) {
    const payload = { ...account, user_id: this.user.id }
    const { data, error } = account.id
      ? await supabase.from('accounts').update(payload).eq('id', account.id).select().single()
      : await supabase.from('accounts').insert(payload).select().single()
    if (!error) this.emit('accounts:changed', data)
    return { data, error }
  }

  async deleteAccount(id) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (!error) this.emit('accounts:changed', null)
    return { error }
  }

  /**
   * Recalcula el saldo de una cuenta sumando todas sus transacciones.
   * Útil para corregir saldos desincronizados.
   */
  async recalcAccountBalance(accountId) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('account_id', accountId)
      .eq('user_id', this.user.id)

    if (!txs) return { error: 'No se pudo obtener transacciones' }

    // Obtener el saldo inicial de la cuenta (lo que el usuario puso al crearla)
    const { data: acc } = await supabase
      .from('accounts').select('initial_balance, balance').eq('id', accountId).single()

    const initialBalance = Number(acc?.initial_balance ?? 0)
    const calculatedBalance = txs.reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount))
    }, initialBalance)

    const { error } = await supabase
      .from('accounts').update({ balance: calculatedBalance }).eq('id', accountId)

    if (!error) this.emit('accounts:changed', null)
    return { balance: calculatedBalance, error }
  }

  // ── Transactions (con actualización automática de saldo) ──────────────────
  async getTransactions(filters = {}) {
    let q = supabase.from('transactions').select('*, accounts(name, type, color)').eq('user_id', this.user.id)
    if (filters.type) q = q.eq('type', filters.type)
    if (filters.account_id) q = q.eq('account_id', filters.account_id)
    if (filters.from) q = q.gte('date', filters.from)
    if (filters.to) q = q.lte('date', filters.to)
    if (filters.category) q = q.eq('category', filters.category)
    const { data } = await q.order('date', { ascending: false }).limit(filters.limit || 500)
    return data || []
  }

  /**
   * Calcula el efecto de una transacción sobre el balance:
   *   ingreso  → +amount
   *   gasto    → -amount
   */
  _txEffect(type, amount) {
    return type === 'income' ? Number(amount) : -Number(amount)
  }

  /**
   * Ajusta el balance de una cuenta sumando `delta`.
   * Trae el balance actual de Supabase para evitar usar valores en caché.
   */
  async _adjustBalance(accountId, delta) {
    if (!accountId || delta === 0) return
    const { data: acc } = await supabase
      .from('accounts').select('balance').eq('id', accountId).single()
    if (!acc) return
    const newBalance = Number(acc.balance) + delta
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId)
    this.emit('accounts:changed', null)
  }

  async saveTransaction(tx) {
    const isEdit = !!tx.id
    const payload = { ...tx, user_id: this.user.id }
    delete payload.accounts

    if (isEdit) {
      // 1. Obtener la transacción ANTES de editarla
      const { data: oldTx } = await supabase
        .from('transactions')
        .select('amount, type, account_id')
        .eq('id', tx.id)
        .single()

      if (oldTx) {
        // 2. Revertir el efecto de la transacción vieja en su cuenta vieja
        if (oldTx.account_id) {
          await this._adjustBalance(oldTx.account_id, -this._txEffect(oldTx.type, oldTx.amount))
        }
      }

      // 3. Actualizar la transacción en BD
      const { data, error } = await supabase
        .from('transactions').update(payload).eq('id', tx.id).select().single()
      if (error) return { data, error }

      // 4. Aplicar el efecto de la transacción nueva en su cuenta nueva
      if (payload.account_id) {
        await this._adjustBalance(payload.account_id, this._txEffect(payload.type, payload.amount))
      }

      this.emit('transactions:changed', data)
      return { data, error: null }

    } else {
      // Inserción nueva
      const { data, error } = await supabase
        .from('transactions').insert(payload).select().single()
      if (error) return { data, error }

      // Aplicar efecto en la cuenta seleccionada
      if (payload.account_id) {
        await this._adjustBalance(payload.account_id, this._txEffect(payload.type, payload.amount))
      }

      this.emit('transactions:changed', data)
      return { data, error: null }
    }
  }

  async deleteTransaction(id) {
    // 1. Obtener la transacción antes de borrar para revertir el saldo
    const { data: tx } = await supabase
      .from('transactions')
      .select('amount, type, account_id')
      .eq('id', id)
      .single()

    // 2. Borrar
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) return { error }

    // 3. Revertir el efecto en el balance
    if (tx?.account_id) {
      await this._adjustBalance(tx.account_id, -this._txEffect(tx.type, tx.amount))
    }

    this.emit('transactions:changed', null)
    return { error: null }
  }

  // ── Categories ────────────────────────────────────────────────────────────
  async getCategories(type) {
    const { data } = await supabase.from('categories').select('*')
      .or(`user_id.eq.${this.user.id},user_id.is.null`)
      .eq('type', type).order('name')
    return data || []
  }

  async saveCategory(cat) {
    const payload = { ...cat, user_id: this.user.id }
    const { data, error } = cat.id
      ? await supabase.from('categories').update(payload).eq('id', cat.id).select().single()
      : await supabase.from('categories').insert(payload).select().single()
    return { data, error }
  }

  // ── Budgets ───────────────────────────────────────────────────────────────
  async getBudgets(month) {
    const { data } = await supabase.from('budgets').select('*').eq('user_id', this.user.id).eq('month', month)
    return data || []
  }

  async saveBudget(budget) {
    const payload = { ...budget, user_id: this.user.id }
    const { data, error } = budget.id
      ? await supabase.from('budgets').update(payload).eq('id', budget.id).select().single()
      : await supabase.from('budgets').insert(payload).select().single()
    if (!error) this.emit('budgets:changed', data)
    return { data, error }
  }

  async deleteBudget(id) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    return { error }
  }

  // ── Goals ─────────────────────────────────────────────────────────────────
  async getGoals() {
    const { data } = await supabase.from('goals').select('*').eq('user_id', this.user.id).order('created_at')
    return data || []
  }

  async saveGoal(goal) {
    const payload = { ...goal, user_id: this.user.id }
    const { data, error } = goal.id
      ? await supabase.from('goals').update(payload).eq('id', goal.id).select().single()
      : await supabase.from('goals').insert(payload).select().single()
    if (!error) this.emit('goals:changed', data)
    return { data, error }
  }

  async deleteGoal(id) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    return { error }
  }

  // ── Debts ─────────────────────────────────────────────────────────────────
  async getDebts() {
    const { data } = await supabase.from('debts').select('*').eq('user_id', this.user.id).order('due_date')
    return data || []
  }

  async saveDebt(debt) {
    const payload = { ...debt, user_id: this.user.id }
    const { data, error } = debt.id
      ? await supabase.from('debts').update(payload).eq('id', debt.id).select().single()
      : await supabase.from('debts').insert(payload).select().single()
    if (!error) this.emit('debts:changed', data)
    return { data, error }
  }

  async deleteDebt(id) {
    const { error } = await supabase.from('debts').delete().eq('id', id)
    return { error }
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  async getProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', this.user.id).single()
    return data
  }

  async saveProfile(profile) {
    const { data, error } = await supabase.from('profiles').upsert({ ...profile, id: this.user.id }).select().single()
    if (!error && data) {
      // Actualizar caché local inmediatamente
      localStorage.setItem('finanzapp-profile', JSON.stringify(data))
    }
    return { data, error }
  }
}
