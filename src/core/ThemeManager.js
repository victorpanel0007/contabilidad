export class ThemeManager {
  constructor() {
    this.key = 'finanzapp-theme'
    this.current = localStorage.getItem(this.key) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }

  init() {
    this.apply(this.current)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(this.key)) this.apply(e.matches ? 'dark' : 'light')
    })
  }

  apply(theme) {
    this.current = theme
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
      theme === 'dark' ? '#0f0f1a' : '#6366f1')
  }

  toggle() {
    const next = this.current === 'dark' ? 'light' : 'dark'
    localStorage.setItem(this.key, next)
    this.apply(next)
    return next
  }

  get isDark() { return this.current === 'dark' }
}
