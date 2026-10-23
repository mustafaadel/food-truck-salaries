import { useEffect, useState, type FormEvent } from 'react'
import { useFeedback } from '../app/feedback'
import { useSession } from '../app/session'
import { addAdmin, changePassword, listAdmins, removeAdmin } from '../data/admins'
import { Field } from './fields'
import { Icon } from './Icon'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Everyone on this list signs in to the same records. */
export function AdminsCard() {
  const session = useSession()
  const { run } = useFeedback()
  const [admins, setAdmins] = useState<string[] | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listAdmins().then(setAdmins, () => setAdmins([]))
  }, [])

  const me = session?.email?.toLowerCase()

  const add = async (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL.test(value)) return setError('Enter a full email address.')
    setError(null)
    setBusy(true)
    const added = await run(async () => {
      await addAdmin(value)
      setAdmins(await listAdmins())
    }, `${value} is now an admin`)
    setBusy(false)
    if (added) setEmail('')
  }

  const remove = async (admin: string) => {
    if (!confirm(`Remove ${admin}? They won't be able to see or change any records.`)) return
    setBusy(true)
    await run(async () => {
      await removeAdmin(admin)
      setAdmins(await listAdmins())
    }, `${admin} removed`)
    setBusy(false)
  }

  return (
    <section className="card stack-sm">
      <h2 className="card-title">Admins</h2>
      <p className="muted small">Admins see and change all workers and payments.</p>
      {admins === null ? (
        <div className="spinner spinner-sm" aria-label="Loading" />
      ) : (
        <ul className="admin-list">
          {admins.map((admin) => (
            <li key={admin}>
              <span className="admin-email">{admin}</span>
              {admin === me ? (
                <span className="badge">You</span>
              ) : (
                <button
                  className="icon-btn icon-btn-danger"
                  aria-label={`Remove ${admin}`}
                  disabled={busy}
                  onClick={() => void remove(admin)}
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="stack-sm" onSubmit={add} noValidate>
        <Field
          label="Add an admin"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="name@example.com"
          value={email}
          onChange={setEmail}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-secondary" disabled={busy}>
          <Icon name="plus" size={18} /> Add admin
        </button>
      </form>
      <p className="muted small">
        They also need a login: in Supabase, open Authentication → Users → Add user → Create new user, use the same
        email, set a password and tick Auto Confirm User. Then send them the app link and their password. They can
        change it here after signing in.
      </p>
    </section>
  )
}

export function PasswordCard() {
  const { run } = useFeedback()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== repeat) return setError("The two passwords don't match.")
    setError(null)
    setBusy(true)
    const changed = await run(() => changePassword(password), 'Password changed')
    setBusy(false)
    if (changed) {
      setPassword('')
      setRepeat('')
    }
  }

  return (
    <section className="card">
      <form className="stack-sm" onSubmit={submit} noValidate>
        <h2 className="card-title">Change password</h2>
        <div className="field-row">
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />
          <Field
            label="Type it again"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={setRepeat}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-secondary" disabled={busy || !password}>
          Change password
        </button>
      </form>
    </section>
  )
}
