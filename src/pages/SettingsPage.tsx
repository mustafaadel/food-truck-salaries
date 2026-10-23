import { useSession } from '../app/session'
import { useSettings } from '../app/settings'
import { Field } from '../components/fields'
import { isConfigBuiltIn, saveSupabaseConfig, setMode } from '../data/config'
import { useData } from '../data/DataContext'
import { resetDemoData } from '../data/localStore'
import { todayISO } from '../lib/months'
import { entryKindLabel } from '../lib/types'

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function SettingsPage() {
  const { data, mode } = useData()
  const session = useSession()
  const { currency, setCurrency } = useSettings()

  const exportCsv = () => {
    const names = new Map(data.workers.map((w) => [w.id, w.name]))
    const rows = [...data.entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [e.date, names.get(e.workerId) ?? '', entryKindLabel(e.kind), e.amount, e.note].map(csvCell).join(','))
    // The byte order mark makes Excel read Arabic and other non-English names correctly.
    download(`salaries-${todayISO()}.csv`, '﻿' + ['Date,Worker,Type,Amount,Note', ...rows].join('\r\n'), 'text/csv')
  }

  const exportJson = () =>
    download(`salaries-backup-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json')

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="card stack-sm">
        <h2 className="card-title">Currency</h2>
        <Field
          label="Shown after every amount"
          value={currency}
          onChange={setCurrency}
          placeholder="e.g. EGP"
          maxLength={8}
          hint="Leave empty to show plain numbers."
        />
      </section>

      <section className="card stack-sm">
        <h2 className="card-title">Download your records</h2>
        <p className="muted small">A spreadsheet of every payment, or a full backup of all your data.</p>
        <div className="button-row">
          <button className="btn btn-secondary" onClick={exportCsv}>
            Spreadsheet (CSV)
          </button>
          <button className="btn btn-secondary" onClick={exportJson}>
            Full backup (JSON)
          </button>
        </div>
      </section>

      {mode === 'demo' ? (
        <section className="card stack-sm">
          <h2 className="card-title">Demo mode</h2>
          <p className="muted small">
            You're trying the app with sample data that stays on this device. Connect your database to keep real
            records safe and use them from any phone.
          </p>
          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                setMode('cloud')
                location.reload()
              }}
            >
              Use my database
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => {
                if (!confirm('Start the demo over with fresh sample data?')) return
                resetDemoData()
                location.reload()
              }}
            >
              Reset demo data
            </button>
          </div>
        </section>
      ) : (
        <section className="card stack-sm">
          <h2 className="card-title">Account</h2>
          {session?.email && <p className="muted small">Signed in as {session.email}</p>}
          <div className="button-row">
            <button className="btn btn-secondary" onClick={() => void session?.signOut()}>
              Sign out
            </button>
            {!isConfigBuiltIn() && (
              <button
                className="btn btn-quiet"
                onClick={() => {
                  if (!confirm('Disconnect this phone from the database? Your records stay safe in Supabase.')) return
                  void session?.signOut().finally(() => {
                    saveSupabaseConfig(null)
                    location.reload()
                  })
                }}
              >
                Disconnect database
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
