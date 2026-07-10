import { Chart, registerables } from 'chart.js'
import { groupBy, sumBy } from '../../core/utils.js'
import { format, parseISO } from 'date-fns'

Chart.register(...registerables)

const CHART_DEFAULTS = {
  font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', size: 11 },
  color: 'rgba(148, 163, 184, 0.8)'
}

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  return {
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    text: isDark ? 'rgba(148,163,184,0.8)' : 'rgba(71,85,105,0.8)',
    bg: isDark ? '#1e1e32' : '#ffffff'
  }
}

export function renderChart(type, canvas, data) {
  if (!canvas) return
  const existing = Chart.getChart(canvas)
  if (existing) existing.destroy()

  const colors = getThemeColors()
  Chart.defaults.color = colors.text
  Chart.defaults.font = CHART_DEFAULTS.font

  if (type === 'cashflow') renderCashflowChart(canvas, data, colors)
  else if (type === 'category') renderCategoryChart(canvas, data, colors)
  else if (type === 'monthly') renderMonthlyChart(canvas, data, colors)
}

function renderCashflowChart(canvas, txs, colors) {
  const byDay = groupBy(txs, t => t.date?.substring(0, 10))
  const labels = Object.keys(byDay).sort().slice(-14)
  const incomes = labels.map(d => sumBy(byDay[d]?.filter(t=>t.type==='income')||[], 'amount'))
  const expenses = labels.map(d => sumBy(byDay[d]?.filter(t=>t.type==='expense')||[], 'amount'))
  const shortLabels = labels.map(d => { try { return format(parseISO(d), 'dd/MM') } catch { return d } })

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: shortLabels,
      datasets: [
        { label: 'Ingresos', data: incomes, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4, borderSkipped: false },
        { label: 'Gastos', data: expenses, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, color: colors.text } } },
      scales: {
        x: { grid: { color: colors.grid }, ticks: { color: colors.text, maxTicksLimit: 7 } },
        y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => '$'+v } }
      }
    }
  })
}

function renderCategoryChart(canvas, txs, colors) {
  const expenses = txs.filter(t => t.type === 'expense')
  if (expenses.length === 0) { canvas.parentElement.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Sin datos</div></div>'; return }

  const byCat = groupBy(expenses, 'category')
  const sorted = Object.entries(byCat).map(([k,v]) => ({ label: k||'Otros', value: sumBy(v,'amount') })).sort((a,b)=>b.value-a.value).slice(0,8)
  const palette = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6']

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s.label),
      datasets: [{ data: sorted.map(s => s.value), backgroundColor: palette, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, color: colors.text, font: { size: 11 } } } }
    }
  })
}

export function renderMonthlyChart(canvas, data, colors) {
  if (!colors) colors = getThemeColors()
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Ingresos', data: data.incomes, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'Gastos', data: data.expenses, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, color: colors.text } } },
      scales: {
        x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
        y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => '$'+v } }
      }
    }
  })
}
