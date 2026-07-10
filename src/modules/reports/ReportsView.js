import { fmt, dateRange, sumBy, groupBy } from '../../core/utils.js'
import { renderMonthlyChart } from '../dashboard/DashboardCharts.js'
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from '../shared/Toast.js'

export class ReportsView {
  constructor(container, store) {
    this.container = container
    this.store = store
    this.period = 'month'
    this.render()
    this.load()
  }

  render() {
    this.container.innerHTML = `
      <div class="page-header"><span class="page-title">Reportes</span></div>
      <div class="page-content page-enter">
        <div class="tabs">
          <div class="tab active" data-period="month">Mes</div>
          <div class="tab" data-period="week">Semana</div>
          <div class="tab" data-period="year">Año</div>
        </div>
        <div id="reportStats" style="margin-bottom:16px"></div>
        <div id="reportChart" style="margin-bottom:16px"></div>
        <div id="reportBreakdown" style="margin-bottom:16px"></div>
        <div style="display:flex;gap:10px;margin-bottom:20px">
          <button class="btn btn-secondary btn-full" id="exportPDF">📄 Exportar PDF</button>
          <button class="btn btn-secondary btn-full" id="exportExcel">📊 Exportar Excel</button>
        </div>
      </div>`

    document.querySelectorAll('.tab[data-period]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab[data-period]').forEach(t=>t.classList.remove('active'))
        tab.classList.add('active')
        this.period = tab.dataset.period
        this.load()
      })
    })
    document.querySelector('#exportPDF')?.addEventListener('click', () => this.exportPDF())
    document.querySelector('#exportExcel')?.addEventListener('click', () => this.exportExcel())
  }

  getRange() {
    if (this.period === 'week') return dateRange.thisWeek()
    if (this.period === 'year') return dateRange.thisYear()
    return dateRange.thisMonth()
  }

  async load() {
    const range = this.getRange()
    const [txs] = await Promise.all([
      this.store.getTransactions({ from: range.from, to: range.to })
    ])
    this.txs = txs
    this.range = range
    const incomes = txs.filter(t=>t.type==='income')
    const expenses = txs.filter(t=>t.type==='expense')
    const totalIncome = sumBy(incomes,'amount')
    const totalExpense = sumBy(expenses,'amount')
    this.renderStats(totalIncome, totalExpense, txs.length)
    this.renderChart(txs)
    this.renderBreakdown(expenses)
  }

  renderStats(income, expense, count) {
    const saving = income - expense
    const el = document.querySelector('#reportStats')
    if (!el) return
    el.innerHTML = `
      <div class="grid-2" style="gap:12px">
        <div class="stat-card"><div class="stat-icon" style="background:var(--success-light)">💰</div><div class="stat-info"><div class="stat-label">Ingresos</div><div class="stat-value" style="color:var(--income-color)">${fmt.currency(income)}</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--danger-light)">💸</div><div class="stat-info"><div class="stat-label">Gastos</div><div class="stat-value" style="color:var(--expense-color)">${fmt.currency(expense)}</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--accent-light)">📈</div><div class="stat-info"><div class="stat-label">Ahorro neto</div><div class="stat-value" style="color:${saving>=0?'var(--success)':'var(--danger)'}">${saving>=0?'+':''}${fmt.currency(saving)}</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--bg-tertiary)">🧾</div><div class="stat-info"><div class="stat-label">Transacciones</div><div class="stat-value">${count}</div></div></div>
      </div>`
  }

  renderChart(txs) {
    const el = document.querySelector('#reportChart')
    if (!el) return

    if (this.period === 'year') {
      const months = Array.from({length:12},(_,i)=>{
        const d = new Date(); d.setMonth(d.getMonth()-11+i)
        return format(d,'yyyy-MM')
      })
      const grouped = groupBy(txs, t=>t.date?.substring(0,7))
      const data = {
        labels: months.map(m=>format(parseISO(m+'-01'),'MMM',{locale:es})),
        incomes: months.map(m=>sumBy((grouped[m]||[]).filter(t=>t.type==='income'),'amount')),
        expenses: months.map(m=>sumBy((grouped[m]||[]).filter(t=>t.type==='expense'),'amount'))
      }
      el.innerHTML = `<div class="card"><div class="card-header"><span class="card-title">Evolución Anual</span></div><div class="chart-container" style="height:220px"><canvas id="reportChartCanvas"></canvas></div></div>`
      renderMonthlyChart(document.getElementById('reportChartCanvas'), data)
    } else {
      const grouped = groupBy(txs, t=>t.date?.substring(0,10))
      const days = Object.keys(grouped).sort()
      const data = {
        labels: days.map(d=>format(parseISO(d),'dd/MM')),
        incomes: days.map(d=>sumBy((grouped[d]||[]).filter(t=>t.type==='income'),'amount')),
        expenses: days.map(d=>sumBy((grouped[d]||[]).filter(t=>t.type==='expense'),'amount'))
      }
      el.innerHTML = `<div class="card"><div class="card-header"><span class="card-title">Flujo de efectivo</span></div><div class="chart-container" style="height:220px"><canvas id="reportChartCanvas"></canvas></div></div>`
      renderMonthlyChart(document.getElementById('reportChartCanvas'), data)
    }
  }

  renderBreakdown(expenses) {
    const el = document.querySelector('#reportBreakdown')
    if (!el || !expenses.length) { if (el) el.innerHTML=''; return }
    const total = sumBy(expenses,'amount')
    const byCat = groupBy(expenses,'category')
    const sorted = Object.entries(byCat).map(([k,v])=>({cat:k||'Otros',amount:sumBy(v,'amount')})).sort((a,b)=>b.amount-a.amount)
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6']
    el.innerHTML = `
      <div class="section-header"><span class="section-title">Gastos por Categoría</span></div>
      <div class="card">
        ${sorted.map((s,i)=>{
          const pct = total>0?Math.round(s.amount/total*100):0
          return `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:0.85rem;font-weight:600">${s.cat}</span>
                <span style="font-size:0.85rem;color:var(--text-muted)">${fmt.currency(s.amount)} <span style="font-size:0.75rem">(${pct}%)</span></span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
            </div>`}).join('')}
      </div>`
  }

  async exportPDF() {
    try {
      toast('Generando PDF...', 'info')
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text('Reporte Financiero - FinanzApp', 14, 22)
      doc.setFontSize(12)
      doc.text(`Período: ${this.range.from} al ${this.range.to}`, 14, 32)

      const income = sumBy(this.txs.filter(t=>t.type==='income'),'amount')
      const expense = sumBy(this.txs.filter(t=>t.type==='expense'),'amount')

      autoTable(doc, {
        startY: 40,
        head: [['Resumen','Monto']],
        body: [
          ['Total Ingresos', fmt.currency(income)],
          ['Total Gastos', fmt.currency(expense)],
          ['Ahorro Neto', fmt.currency(income-expense)],
          ['Transacciones', this.txs.length.toString()]
        ],
        styles: { fontSize: 11 }
      })

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Fecha','Tipo','Descripción','Categoría','Monto']],
        body: this.txs.map(t=>[
          fmt.dateShort(t.date), t.type==='income'?'Ingreso':'Gasto',
          t.description||'', t.category||'', fmt.currency(t.amount)
        ]),
        styles: { fontSize: 9 }
      })

      doc.save(`reporte-${this.range.from}.pdf`)
      toast('PDF exportado ✓')
    } catch (e) { toast('Error al exportar PDF', 'error') }
  }

  async exportExcel() {
    try {
      toast('Generando Excel...', 'info')
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      const data = this.txs.map(t=>({
        Fecha: fmt.dateShort(t.date), Tipo: t.type==='income'?'Ingreso':'Gasto',
        Descripción: t.description||'', Categoría: t.category||'',
        Cuenta: t.accounts?.name||'', Monto: t.amount
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')
      XLSX.writeFile(wb, `reporte-${this.range.from}.xlsx`)
      toast('Excel exportado ✓')
    } catch (e) { toast('Error al exportar Excel', 'error') }
  }
}
