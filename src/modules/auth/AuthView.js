export function renderAuth(container, auth, onSuccess) {
  let mode = 'login' // login | signup | forgot

  function render() {
    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-bg"></div>
        <div class="auth-content">
          <div class="auth-header">
            <div class="auth-logo">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="16" fill="#6366f1"/>
                <path d="M24 32h4v8h-4zm6-6h4v14h-4zm6 3h4v11h-4z" fill="white"/>
              </svg>
            </div>
            <h1 class="auth-title">FinanzApp</h1>
            <p class="auth-subtitle">${mode === 'login' ? 'Bienvenido de vuelta' : mode === 'signup' ? 'Crea tu cuenta' : 'Recuperar contraseña'}</p>
          </div>

          <div class="auth-card animate-scale">
            ${mode === 'login' ? loginForm() : mode === 'signup' ? signupForm() : forgotForm()}
          </div>

          <div class="auth-switch">
            ${mode === 'login'
              ? `¿No tienes cuenta? <button class="auth-link" id="switchMode" data-mode="signup">Regístrate gratis</button>`
              : mode === 'signup'
              ? `¿Ya tienes cuenta? <button class="auth-link" id="switchMode" data-mode="login">Inicia sesión</button>`
              : `<button class="auth-link" id="switchMode" data-mode="login">← Volver al inicio de sesión</button>`}
          </div>
        </div>
      </div>

      <style>
        .auth-screen { min-height: 100dvh; display: flex; align-items: center; justify-content: center; position: relative; padding: 20px; }
        .auth-bg { position: fixed; inset: 0; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%); z-index: 0; }
        .auth-bg::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(139,92,246,0.1) 0%, transparent 60%); }
        .auth-content { position: relative; z-index: 1; width: 100%; max-width: 400px; }
        .auth-header { text-align: center; margin-bottom: 28px; }
        .auth-logo { margin: 0 auto 16px; width: fit-content; filter: drop-shadow(0 8px 24px rgba(99,102,241,0.4)); }
        .auth-title { font-size: 1.75rem; font-weight: 800; color: white; margin-bottom: 6px; }
        .auth-subtitle { color: rgba(255,255,255,0.5); font-size: 0.9rem; }
        .auth-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-xl); padding: 28px 24px; }
        .auth-card .form-label { color: rgba(255,255,255,0.7); }
        .auth-card .form-input { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.1); color: white; }
        .auth-card .form-input:focus { border-color: #6366f1; background: rgba(255,255,255,0.1); }
        .auth-card .form-input::placeholder { color: rgba(255,255,255,0.3); }
        .auth-switch { text-align: center; margin-top: 20px; color: rgba(255,255,255,0.5); font-size: 0.875rem; }
        .auth-link { color: #818cf8; font-weight: 600; background: none; border: none; cursor: pointer; font-size: inherit; }
        .auth-forgot { display: block; text-align: right; font-size: 0.8rem; color: #818cf8; margin-top: -8px; margin-bottom: 16px; cursor: pointer; background: none; border: none; }
        .auth-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0; }
        .auth-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-md); padding: 10px 14px; font-size: 0.85rem; color: #f87171; margin-bottom: 16px; display: none; }
      </style>`

    bindEvents()
  }

  function loginForm() {
    return `
      <div id="authError" class="auth-error"></div>
      <div class="form-group"><label class="form-label">Correo electrónico</label><input type="email" class="form-input" id="email" placeholder="tu@correo.com" autocomplete="email" /></div>
      <div class="form-group"><label class="form-label">Contraseña</label><input type="password" class="form-input" id="password" placeholder="••••••••" autocomplete="current-password" /></div>
      <button class="auth-forgot" id="forgotBtn">¿Olvidaste tu contraseña?</button>
      <button class="btn btn-primary btn-full btn-lg" id="submitBtn">Iniciar sesión</button>`
  }

  function signupForm() {
    return `
      <div id="authError" class="auth-error"></div>
      <div class="form-group"><label class="form-label">Nombre completo</label><input type="text" class="form-input" id="name" placeholder="Juan Pérez" autocomplete="name" /></div>
      <div class="form-group"><label class="form-label">Correo electrónico</label><input type="email" class="form-input" id="email" placeholder="tu@correo.com" autocomplete="email" /></div>
      <div class="form-group"><label class="form-label">Contraseña</label><input type="password" class="form-input" id="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" /></div>
      <button class="btn btn-primary btn-full btn-lg" id="submitBtn">Crear cuenta</button>`
  }

  function forgotForm() {
    return `
      <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin-bottom:20px;">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
      <div id="authError" class="auth-error"></div>
      <div class="form-group"><label class="form-label">Correo electrónico</label><input type="email" class="form-input" id="email" placeholder="tu@correo.com" /></div>
      <button class="btn btn-primary btn-full btn-lg" id="submitBtn">Enviar enlace</button>`
  }

  function bindEvents() {
    container.querySelector('#switchMode')?.addEventListener('click', e => {
      mode = e.target.dataset.mode
      render()
    })

    container.querySelector('#forgotBtn')?.addEventListener('click', () => {
      mode = 'forgot'; render()
    })

    container.querySelector('#submitBtn')?.addEventListener('click', async () => {
      const btn = container.querySelector('#submitBtn')
      const errEl = container.querySelector('#authError')
      const email = container.querySelector('#email')?.value?.trim()
      const password = container.querySelector('#password')?.value
      const name = container.querySelector('#name')?.value?.trim()

      btn.innerHTML = '<span class="spinner"></span>'
      btn.disabled = true
      errEl.style.display = 'none'

      try {
        if (mode === 'login') {
          const { data, error } = await auth.signIn(email, password)
          if (error) throw error
          onSuccess(data.session)
        } else if (mode === 'signup') {
          if (!name) throw new Error('Ingresa tu nombre')
          const { error } = await auth.signUp(email, password, name)
          if (error) throw error
          errEl.textContent = '✓ Revisa tu correo para confirmar tu cuenta'
          errEl.style.color = '#4ade80'
          errEl.style.display = 'block'
        } else {
          const { error } = await auth.resetPassword(email)
          if (error) throw error
          errEl.textContent = '✓ Enlace enviado. Revisa tu correo.'
          errEl.style.color = '#4ade80'
          errEl.style.display = 'block'
        }
      } catch (err) {
        errEl.textContent = err.message || 'Error al procesar la solicitud'
        errEl.style.display = 'block'
      }

      btn.innerHTML = mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'
      btn.disabled = false
    })

    container.querySelector('#email')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') container.querySelector('#password')?.focus()
    })
    container.querySelector('#password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') container.querySelector('#submitBtn')?.click()
    })
  }

  render()
}
