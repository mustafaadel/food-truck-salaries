import { useState, type FormEvent } from 'react'
import { Field } from '../components/fields'
import { Icon } from '../components/Icon'
import { saveSupabaseConfig, setMode } from '../data/config'

/** First launch without a built-in database: connect a Supabase project or try demo mode. */
export function SetupPage() {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedUrl = url.trim().replace(/\/+$/, '')
    if (!/^https:\/\/\S+$/.test(trimmedUrl)) return setError('The project URL starts with https://')
    if (key.trim().length < 20) return setError('Paste the whole publishable (anon) key.')
    saveSupabaseConfig({ url: trimmedUrl, key: key.trim() })
    setMode('cloud')
    location.reload()
  }

  return (
    <main className="center-screen">
      <div className="auth-card stack">
        <div className="auth-brand">
          <Icon name="truck" size={36} />
          <h1>Food Truck Salaries</h1>
        </div>
        <p>Track monthly salaries, daily pay, deductions and bonuses for your workers.</p>

        <form className="card stack" onSubmit={submit}>
          <h2>Connect your database</h2>
          <p className="muted small">
            In your Supabase project, open Project Settings → API Keys and copy the project URL and the publishable key.
          </p>
          <Field
            label="Project URL"
            type="url"
            inputMode="url"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={setUrl}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Field
            label="Publishable (anon) key"
            value={key}
            onChange={setKey}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-block">Connect</button>
        </form>

        <div className="card stack-sm">
          <h2>Just looking?</h2>
          <p className="muted small">Try the app with sample workers. Demo data stays on this device only.</p>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => {
              setMode('demo')
              location.reload()
            }}
          >
            Try with sample data
          </button>
        </div>
      </div>
    </main>
  )
}
