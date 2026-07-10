export function openModal(content, onClose) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal animate-up">
      <div class="modal-handle"></div>
      ${content}
    </div>`

  const close = () => {
    overlay.style.animation = 'fadeIn 0.2s ease reverse'
    overlay.querySelector('.modal').style.animation = 'slideUp 0.2s ease reverse'
    setTimeout(() => { overlay.remove(); onClose?.() }, 180)
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close() })
  document.body.appendChild(overlay)
  return { close, overlay }
}

export function confirmDialog(message, onConfirm) {
  const { close } = openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Confirmar acción</h2>
      <button class="btn btn-icon btn-ghost" id="closeConfirm">✕</button>
    </div>
    <p style="color:var(--text-secondary);margin-bottom:24px;">${message}</p>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-secondary btn-full" id="cancelConfirm">Cancelar</button>
      <button class="btn btn-danger btn-full" id="okConfirm">Confirmar</button>
    </div>`)

  document.querySelector('#closeConfirm')?.addEventListener('click', close)
  document.querySelector('#cancelConfirm')?.addEventListener('click', close)
  document.querySelector('#okConfirm')?.addEventListener('click', () => { close(); onConfirm() })
}
