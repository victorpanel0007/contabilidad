import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const fmt = {
  currency(amount) {
    // Siempre leer fresco del localStorage, default COP
    let cur = 'COP'
    try {
      const profile = JSON.parse(localStorage.getItem('finanzapp-profile') || '{}')
      cur = profile.currency || 'COP'
    } catch {}
    const decimals = ['COP', 'CLP', 'PYG'].includes(cur) ? 0 : 2
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount || 0)
  },
  date(dateStr) {
    if (!dateStr) return ''
    return format(parseISO(dateStr), "d 'de' MMM yyyy", { locale: es })
  },
  dateShort(dateStr) {
    if (!dateStr) return ''
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  },
  month(dateStr) {
    if (!dateStr) return ''
    return format(parseISO(dateStr), 'MMMM yyyy', { locale: es })
  }
}

export const dateRange = {
  thisMonth() {
    const now = new Date()
    return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
  },
  thisWeek() {
    const now = new Date()
    return { from: format(startOfWeek(now, { locale: es }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { locale: es }), 'yyyy-MM-dd') }
  },
  thisYear() {
    const now = new Date()
    return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') }
  },
  today() {
    const d = format(new Date(), 'yyyy-MM-dd')
    return { from: d, to: d }
  },
  currentMonth() { return format(new Date(), 'yyyy-MM') }
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function sumBy(arr, key) {
  return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}

export function debounce(fn, ms = 300) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }
}

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v
    else if (k === 'html') el.innerHTML = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v)
    else el.setAttribute(k, v)
  })
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child))
    else if (child) el.appendChild(child)
  })
  return el
}

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Banco', icon: '🏦' },
  { value: 'nequi', label: 'Nequi', icon: '💜' },
  { value: 'daviplata', label: 'Daviplata', icon: '🔴' },
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'digital', label: 'Billetera Digital', icon: '📱' },
  { value: 'credit', label: 'Tarjeta de Crédito', icon: '💳' },
  { value: 'investment', label: 'Inversión', icon: '📈' }
]

export const ACCOUNT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#10b981','#14b8a6','#06b6d4','#3b82f6','#64748b']

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentación', icon: '🍔', color: '#f97316' },
  { name: 'Transporte', icon: '🚗', color: '#3b82f6' },
  { name: 'Vivienda', icon: '🏠', color: '#8b5cf6' },
  { name: 'Salud', icon: '🏥', color: '#f43f5e' },
  { name: 'Entretenimiento', icon: '🎮', color: '#ec4899' },
  { name: 'Educación', icon: '📚', color: '#14b8a6' },
  { name: 'Ropa', icon: '👕', color: '#eab308' },
  { name: 'Servicios', icon: '⚡', color: '#06b6d4' },
  { name: 'Tecnología', icon: '💻', color: '#6366f1' },
  { name: 'Otros', icon: '📦', color: '#64748b' }
]

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salario', icon: '💼', color: '#22c55e' },
  { name: 'Freelance', icon: '💻', color: '#10b981' },
  { name: 'Inversiones', icon: '📈', color: '#6366f1' },
  { name: 'Negocios', icon: '🏪', color: '#f97316' },
  { name: 'Regalos', icon: '🎁', color: '#ec4899' },
  { name: 'Otros', icon: '💰', color: '#64748b' }
]
