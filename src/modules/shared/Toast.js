export function showToast(container, message, type = 'success') {
  if (!container) container = document.getElementById('toastContainer')
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `<span>${icons[type] || '✓'}</span><span>${message}</span>`
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

export function toast(message, type = 'success') {
  if (window.__toast) window.__toast(message, type)
}
