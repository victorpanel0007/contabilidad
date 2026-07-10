import { supabase } from '../../core/supabase.js'

export class AuthManager {
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  onAuthChange(cb) {
    supabase.auth.onAuthStateChange(cb)
  }

  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email, full_name: name, currency: 'COP'
      })
    }
    return { data, error }
  }

  async signOut() {
    return await supabase.auth.signOut()
  }

  async resetPassword(email) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#reset-password'
    })
  }
}
