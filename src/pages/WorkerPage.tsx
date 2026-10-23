import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useFeedback } from '../app/feedback'
import { useSettings } from '../app/settings'
import { EntryForm } from '../components/EntryForm'
import { AmountField, MonthField } from '../components/fields'
import { Icon } from '../components/Icon'
import { MonthNav } from '../components/PeriodNav'
import { Sheet } from '../components/Sheet'
import { SummaryRows } from '../components/SummaryRows'
import { WorkerForm } from '../components/WorkerForm'
import { useData } from '../data/DataContext'
import { parseAmount } from '../lib/money'
import { defaultDateIn, formatDate, formatMonth, isValidMonth, monthOf, type Month } from '../lib/months'
import { rateFor, summarizeMonth } from '../lib/payroll'
import { entryKindLabel, type Worker } from '../lib/types'
import { useMonthParam } from '../lib/useMonthParam'

export function WorkerPage() {
  const { id } = useParams()
  const { data } = useData()
  const worker = data.workers.find((w) => w.id === id)
  if (!worker) {
    return (
      <div className="page">
        <div className="card empty">
          <p>This worker doesn't exist anymore.</p>
          <Link className="btn btn-secondary" to="/workers">
            Back to workers
          </Link>
        </div>
      </div>
    )
  }
  return <WorkerDetails worker={worker} />
}

function WorkerDetails({ worker }: { worker: Worker }) {
  const { data, addEntries, deleteEntry, updateWorker, deleteWorker, deleteSalary } = useData()
  const { money } = useSettings()
  const { run } = useFeedback()
  const navigate = useNavigate()
  const [month, setMonth] = useMonthParam()
  const [sheet, setSheet] = useState<'entry' | 'edit' | 'salary' | null>(null)
  const [busy, setBusy] = useState(false)

  const summary = summarizeMonth(worker, data.rates, data.entries, month)
  const entries = data.entries
    .filter((e) => e.workerId === worker.id && monthOf(e.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date))
  const hasAnyEntries = data.entries.some((e) => e.workerId === worker.id)
  const rates = data.rates
    .filter((r) => r.workerId === worker.id)
    .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))
  const rate = rateFor(worker, data.rates, month)

  const guarded = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return
    setBusy(true)
    await run(action, success)
    setBusy(false)
  }

  const payRest = () => {
    if (!confirm(`Record a payout of ${money(summary.remaining)} to ${worker.name} for ${formatMonth(month)}?`)) return
    void guarded(
      () =>
        addEntries([
          {
            workerId: worker.id,
            date: defaultDateIn(month),
            kind: 'payment',
            amount: summary.remaining,
            note: `Salary for ${formatMonth(month)}`,
          },
        ]),
      'Payout saved',
    )
  }

  const status =
    worker.startMonth > month
      ? `Starts in ${formatMonth(worker.startMonth)}`
      : worker.endMonth === null
        ? `Working since ${formatMonth(worker.startMonth)}`
        : worker.endMonth < month
          ? `Left after ${formatMonth(worker.endMonth)}`
          : `Last month: ${formatMonth(worker.endMonth)}`

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/workers" className="back-link no-print">
            <Icon name="left" size={16} /> Workers
          </Link>
          <h1>{worker.name}</h1>
          <div className="muted small">
            {status}
            {worker.phone && (
              <>
                {' · '}
                <a href={`tel:${worker.phone}`} className="no-print">
                  {worker.phone}
                </a>
              </>
            )}
          </div>
        </div>
        <button className="btn btn-secondary no-print" onClick={() => setSheet('edit')}>
          <Icon name="edit" size={16} /> Edit
        </button>
      </div>

      <div className="no-print">
        <MonthNav month={month} onChange={setMonth} />
      </div>
      <h2 className="print-only">Salary statement: {formatMonth(month)}</h2>

      <div className="worker-layout">
        <section className="card stack-sm">
          <SummaryRows summary={summary} />
          <div className="button-row no-print">
            <button className="btn btn-primary" onClick={() => setSheet('entry')}>
              <Icon name="plus" size={18} /> Add
            </button>
            {summary.remaining > 0 && (
              <button className="btn btn-secondary" disabled={busy} onClick={payRest}>
                Pay the rest
              </button>
            )}
            <button className="btn btn-quiet" onClick={() => window.print()}>
              <Icon name="printer" size={18} /> Print
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Records for {formatMonth(month)}</h2>
          {entries.length === 0 ? (
            <p className="muted">Nothing recorded this month.</p>
          ) : (
            <ul className="entry-list">
              {entries.map((entry) => (
                <li key={entry.id} className="entry">
                  <div className="entry-main">
                    <span className="entry-date">{formatDate(entry.date)}</span>
                    <span className={`badge badge-${entry.kind}`}>{entryKindLabel(entry.kind)}</span>
                    {entry.note && <span className="entry-note">{entry.note}</span>}
                  </div>
                  <span className={`entry-amount amount-${entry.kind}`}>
                    {entry.kind === 'bonus' ? '+' : '−'} {money(entry.amount)}
                  </span>
                  <button
                    className="icon-btn icon-btn-danger no-print"
                    aria-label={`Delete ${entryKindLabel(entry.kind).toLowerCase()} of ${money(entry.amount)} on ${formatDate(entry.date)}`}
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete this ${entryKindLabel(entry.kind).toLowerCase()} of ${money(entry.amount)}?`))
                        void guarded(() => deleteEntry(entry.id), 'Deleted')
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card stack-sm no-print">
          <div className="card-head">
            <h2 className="card-title">Salary</h2>
            <button className="btn btn-quiet" onClick={() => setSheet('salary')}>
              Change
            </button>
          </div>
          <div className="big-amount">
            {rate ? money(rate.monthlyAmount) : '—'}
            <span className="muted small"> a month</span>
          </div>
          <div className="muted small">
            {worker.dailyAmount ? `Usually takes ${money(worker.dailyAmount)} a day` : 'No daily pay set'}
          </div>
          {rates.length > 1 && (
            <ul className="rate-list">
              {rates.map((r) => (
                <li key={r.id}>
                  <span>From {formatMonth(r.effectiveMonth)}</span>
                  <strong>{money(r.monthlyAmount)}</strong>
                  <button
                    className="icon-btn icon-btn-danger"
                    aria-label={`Delete the salary from ${formatMonth(r.effectiveMonth)}`}
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete the salary change from ${formatMonth(r.effectiveMonth)}?`))
                        void guarded(() => deleteSalary(r.id), 'Salary change deleted')
                    }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card stack-sm no-print">
          <h2 className="card-title">Employment</h2>
          {worker.endMonth === null ? (
            <button
              className="btn btn-secondary"
              disabled={busy || month < worker.startMonth}
              onClick={() => {
                if (confirm(`${worker.name} stops earning a salary after ${formatMonth(month)}. Continue?`))
                  void guarded(() => updateWorker(worker.id, { endMonth: month }), `${worker.name} marked as left`)
              }}
            >
              Mark as left after {formatMonth(month)}
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void guarded(() => updateWorker(worker.id, { endMonth: null }), `${worker.name} is working again`)}
            >
              Mark as working again
            </button>
          )}
          {hasAnyEntries ? (
            <p className="muted small">
              Workers with records can't be deleted, so their history stays correct. Mark them as left instead.
            </p>
          ) : (
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Delete ${worker.name}? This can't be undone.`)) return
                void guarded(async () => {
                  await deleteWorker(worker.id)
                  navigate('/workers', { replace: true })
                }, `${worker.name} deleted`)
              }}
            >
              <Icon name="trash" size={16} /> Delete worker
            </button>
          )}
        </section>
      </div>

      {sheet === 'entry' && (
        <EntryForm workerId={worker.id} date={defaultDateIn(month)} onClose={() => setSheet(null)} />
      )}
      {sheet === 'edit' && <WorkerForm worker={worker} onClose={() => setSheet(null)} />}
      {sheet === 'salary' && (
        <SalaryForm worker={worker} month={month} current={rate?.monthlyAmount} onClose={() => setSheet(null)} />
      )}
    </div>
  )
}

function SalaryForm({ worker, month, current, onClose }: { worker: Worker; month: Month; current?: number; onClose(): void }) {
  const { setSalary } = useData()
  const { run } = useFeedback()
  const [amount, setAmount] = useState(current === undefined ? '' : String(current))
  const [from, setFrom] = useState(month)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = parseAmount(amount)
    if (value === null) return setError('Enter the new monthly salary.')
    if (!isValidMonth(from)) return setError('Pick the month it starts from, like 2026-10.')
    setError(null)
    setSaving(true)
    const saved = await run(() => setSalary(worker.id, from, value), 'Salary updated')
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet title={`Change ${worker.name}'s salary`} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <AmountField label="New monthly salary" value={amount} onChange={setAmount} required />
        <MonthField
          label="Starting from"
          value={from}
          onChange={setFrom}
          hint="Earlier months keep the old salary."
          required
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Saving…' : 'Save salary'}
        </button>
      </form>
    </Sheet>
  )
}
