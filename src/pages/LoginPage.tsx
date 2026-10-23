import type { SupabaseClient } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { Field } from '../components/fields'
import { Icon } from '../components/Icon'
import { isConfigBuiltIn, saveSupabaseConfig, setMode } from '../data/config'

export function LoginPage({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setError(
        /invalid login/i.test(error.message)
          ? 'Wrong email or password.'
          : /fetch|network/i.test(error.message)
            ? "Couldn't reach the server. Check your internet and try again."
            : error.message,
      )
    }
  }

  return (
    <main className="center-screen">
      <form className="card auth-card stack" onSubmit={submit}>
        <div className="auth-brand">
          <Icon name="truck" size={36} />
          <h1>Food Truck Salaries</h1>
        </div>
        <Field label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} required />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted small">
          The login is created in your Supabase project under Authentication → Users. You can reset the password there
          too.
        </p>
        <div className="auth-links">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode('demo')
              location.reload()
            }}
          >
            Try with sample data
          </button>
          {!isConfigBuiltIn() && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                saveSupabaseConfig(null)
                location.reload()
              }}
            >
              Use a different database
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
