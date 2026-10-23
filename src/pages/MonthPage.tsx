import { useState } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../app/feedback'
import { useSettings } from '../app/settings'
import { MonthNav } from '../components/PeriodNav'
import { SummaryRows } from '../components/SummaryRows'
import { useData } from '../data/DataContext'
import { defaultDateIn, formatMonth, monthOf } from '../lib/months'
import { isEmployedIn, sumSummaries, summarizeMonth } from '../lib/payroll'
import { useMonthParam } from '../lib/useMonthParam'
import { byName } from '../lib/workers'

/** End-of-month view: what each worker earned, took and can still take. */
export function MonthPage() {
  const { data, addEntries } = useData()
  const { money } = useSettings()
  const { run } = useFeedback()
  const [month, setMonth] = useMonthParam()
  const [busy, setBusy] = useState(false)

  const rows = [...data.workers]
    .sort(byName)
    .map((worker) => ({ worker, summary: summarizeMonth(worker, data.rates, data.entries, month) }))
    .filter(
      ({ worker, summary }) =>
        isEmployedIn(worker, month) ||
        summary.remaining !== 0 ||
        data.entries.some((e) => e.workerId === worker.id && monthOf(e.date) === month),
    )
  const total = sumSummaries(
    month,
    rows.map((r) => r.summary),
  )

  const payRest = async (workerId: string, name: string, amount: number) => {
    if (busy || !confirm(`Record a payout of ${money(amount)} to ${name} for ${formatMonth(month)}?`)) return
    setBusy(true)
    await run(
      () =>
        addEntries([
          { workerId, date: defaultDateIn(month), kind: 'payment', amount, note: `Salary for ${formatMonth(month)}` },
        ]),
      `Payout to ${name} saved`,
    )
    setBusy(false)
  }

  return (
    <div className="page">
      <MonthNav month={month} onChange={setMonth} />

      {rows.length === 0 ? (
        <div className="card empty">
          <p>No salaries in {formatMonth(month)}.</p>
          <Link className="btn btn-secondary" to="/workers">
            Go to workers
          </Link>
        </div>
      ) : (
        <>
          <section className="card total-card">
            <div className="muted small">Left to pay for {formatMonth(month)}</div>
            <div className="big-amount">{money(total.remaining)}</div>
            <div className="total-grid">
              <div>
                <span className="muted small">Salaries</span>
                <strong>{money(total.salary)}</strong>
              </div>
              <div>
                <span className="muted small">Daily pay</span>
                <strong>{money(total.dailyPaid)}</strong>
              </div>
              <div>
                <span className="muted small">Deductions</span>
                <strong>{money(total.deductions)}</strong>
              </div>
              <div>
                <span className="muted small">Bonuses</span>
                <strong>{money(total.bonuses)}</strong>
              </div>
              <div>
                <span className="muted small">Payouts</span>
                <strong>{money(total.otherPaid)}</strong>
              </div>
            </div>
          </section>

          <ul className="card-grid">
            {rows.map(({ worker, summary }) => (
              <li key={worker.id} className="card stack-sm">
                <div className="card-head">
                  <Link to={`/workers/${worker.id}?m=${month}`} className="worker-name">
                    {worker.name}
                  </Link>
                  {!isEmployedIn(worker, month) && <span className="badge">Not working this month</span>}
                </div>
                <SummaryRows summary={summary} />
                {summary.remaining > 0 && (
                  <button
                    className="btn btn-primary btn-block"
                    disabled={busy}
                    onClick={() => void payRest(worker.id, worker.name, summary.remaining)}
                  >
                    Pay the rest: {money(summary.remaining)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
