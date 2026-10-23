import { useState } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../app/feedback'
import { useSettings } from '../app/settings'
import { EntryForm } from '../components/EntryForm'
import { Icon } from '../components/Icon'
import { DateNav } from '../components/PeriodNav'
import { useData } from '../data/DataContext'
import { sumAmounts } from '../lib/money'
import { isEmployedIn, summarizeMonth } from '../lib/payroll'
import { formatMonth, monthOf, todayISO } from '../lib/months'
import { entryKindLabel, type Worker } from '../lib/types'
import { byName } from '../lib/workers'

/** The everyday screen: tap once per worker to record that they took their daily pay. */
export function TodayPage() {
  const { data, addEntries, deleteEntry } = useData()
  const { money } = useSettings()
  const { run } = useFeedback()
  const [date, setDate] = useState(todayISO)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const month = monthOf(date)
  const workers = data.workers.filter((w) => isEmployedIn(w, month)).sort(byName)
  const entriesOn = (workerId: string) => data.entries.filter((e) => e.workerId === workerId && e.date === date)
  const unpaid = workers.filter((w) => w.dailyAmount > 0 && !entriesOn(w.id).some((e) => e.kind === 'daily'))
  const paidOnDate = sumAmounts(
    data.entries.filter((e) => e.date === date && (e.kind === 'daily' || e.kind === 'payment')).map((e) => e.amount),
  )

  // `busy` blocks double taps so one tap can never record the same pay twice.
  const guarded = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return
    setBusy(true)
    await run(action, success)
    setBusy(false)
  }

  const payDaily = (list: Worker[]) =>
    guarded(
      () => addEntries(list.map((w) => ({ workerId: w.id, date, kind: 'daily' as const, amount: w.dailyAmount, note: null }))),
      list.length === 1 ? `${list[0].name}: daily pay saved` : `Daily pay saved for ${list.length} workers`,
    )

  return (
    <div className="page">
      <DateNav date={date} onChange={setDate} />

      {workers.length === 0 ? (
        <div className="card empty">
          <Icon name="users" size={32} />
          <p>No workers yet for {formatMonth(month)}.</p>
          <Link className="btn btn-primary" to="/workers?new=1">
            Add your first worker
          </Link>
        </div>
      ) : (
        <>
          <div className="day-bar">
            <div>
              <div className="muted small">Paid out on this day</div>
              <div className="day-total">{money(paidOnDate)}</div>
            </div>
            {unpaid.length > 1 && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => void payDaily(unpaid)}>
                Pay all {unpaid.length}
              </button>
            )}
          </div>

          <ul className="card-list">
            {workers.map((worker) => {
              const entries = entriesOn(worker.id)
              const dailies = entries.filter((e) => e.kind === 'daily')
              const others = entries.filter((e) => e.kind !== 'daily')
              const dailyTotal = sumAmounts(dailies.map((e) => e.amount))
              const summary = summarizeMonth(worker, data.rates, data.entries, month)
              return (
                <li key={worker.id} className="card worker-day">
                  <div className="worker-day-top">
                    <div className="worker-day-info">
                      <Link to={`/workers/${worker.id}?m=${month}`} className="worker-name">
                        {worker.name}
                      </Link>
                      <div className="muted small">
                        {summary.remaining >= 0 ? 'Left to pay' : 'Overpaid'} this month:{' '}
                        <strong className={summary.remaining < 0 ? 'text-bad' : undefined}>{money(Math.abs(summary.remaining))}</strong>
                      </div>
                    </div>
                    {dailies.length > 0 ? (
                      <div className="paid-chip">
                        <Icon name="check" size={18} />
                        {money(dailyTotal)}
                      </div>
                    ) : worker.dailyAmount > 0 ? (
                      <button className="btn btn-primary btn-pay" disabled={busy} onClick={() => void payDaily([worker])}>
                        Pay {money(worker.dailyAmount)}
                      </button>
                    ) : null}
                  </div>

                  {others.length > 0 && (
                    <ul className="mini-entries">
                      {others.map((e) => (
                        <li key={e.id}>
                          <span className={`badge badge-${e.kind}`}>{entryKindLabel(e.kind)}</span>
                          <span className="mini-note">{e.note}</span>
                          <span className="mini-amount">{money(e.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="worker-day-actions">
                    {dailies.length > 0 && (
                      <button
                        className="btn btn-quiet"
                        disabled={busy}
                        onClick={() => void guarded(() => deleteEntry(dailies[dailies.length - 1].id), 'Daily pay removed')}
                      >
                        <Icon name="undo" size={16} /> Undo daily pay
                      </button>
                    )}
                    <button className="btn btn-quiet" onClick={() => setAddingFor(worker.id)}>
                      <Icon name="plus" size={16} /> Deduction, bonus…
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {addingFor && <EntryForm workerId={addingFor} date={date} onClose={() => setAddingFor(null)} />}
    </div>
  )
}
