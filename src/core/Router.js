import { DashboardView } from '../modules/dashboard/DashboardView.js'
import { IncomesView } from '../modules/incomes/IncomesView.js'
import { ExpensesView } from '../modules/expenses/ExpensesView.js'
import { AccountsView } from '../modules/accounts/AccountsView.js'
import { BudgetsView } from '../modules/budgets/BudgetsView.js'
import { GoalsView } from '../modules/goals/GoalsView.js'
import { DebtsView } from '../modules/debts/DebtsView.js'
import { ReportsView } from '../modules/reports/ReportsView.js'
import { SettingsView } from '../modules/settings/SettingsView.js'

export class Router {
  constructor() {
    this.routes = {
      dashboard: DashboardView,
      incomes: IncomesView,
      expenses: ExpensesView,
      accounts: AccountsView,
      budgets: BudgetsView,
      goals: GoalsView,
      debts: DebtsView,
      reports: ReportsView,
      settings: SettingsView
    }
    this.current = 'dashboard'
    this.container = null
    this.store = null
    this.listeners = []
  }

  init(container, store) {
    this.container = container
    this.store = store
    const hash = location.hash.replace('#', '') || 'dashboard'
    this.navigate(hash, false)
    window.addEventListener('hashchange', () => {
      const route = location.hash.replace('#', '') || 'dashboard'
      this.navigate(route, false)
    })
  }

  navigate(route, updateHash = true) {
    if (!this.routes[route]) route = 'dashboard'
    this.current = route
    if (updateHash) location.hash = route
    if (this.container && this.store) {
      this.container.innerHTML = ''
      const ViewClass = this.routes[route]
      new ViewClass(this.container, this.store)
    }
    this.listeners.forEach(fn => fn(route))
  }

  onChange(fn) { this.listeners.push(fn) }
}
