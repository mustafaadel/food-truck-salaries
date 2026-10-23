import { Link, useNavigate, useSearchParams } from 'react-router'
import { useSettings } from '../app/settings'
import { Icon } from '../components/Icon'
import { WorkerForm } from '../components/WorkerForm'
import { useData } from '../data/DataContext'
import { currentMonth, formatMonth } from '../lib/months'
import { isEmployedIn, salaryFor, summarizeMonth } from '../lib/payroll'
import type { Worker } from '../lib/types'
import { byName } from '../lib/workers'

export function WorkersPage() {
  const { data } = useData()
  const { money } = useSettings()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const month = currentMonth()
  const adding = params.get('new') === '1'

  const workers = [...data.workers].sort(byName)
  const current = workers.filter((w) => w.endMonth === null || w.endMonth >= month)
  const former = workers.filter((w) => !current.includes(w))

  const row = (worker: Worker) => {
    const summary = summarizeMonth(worker, data.rates, data.entries, month)
    const employed = isEmployedIn(worker, month)
    return (
      <li key={worker.id}>
        <Link to={`/workers/${worker.id}`} className="card worker-row">
          <div className="worker-row-main">
            <span className="worker-name">{worker.name}</span>
            <span className="muted small">
              {employed
                ? `${money(salaryFor(worker, data.rates, month))} a month · ${worker.dailyAmount ? `${money(worker.dailyAmount)} a day` : 'no daily pay'}`
                : worker.startMonth > month
                  ? `Starts in ${formatMonth(worker.startMonth)}`
                  : `Left after ${formatMonth(worker.endMonth!)}`}
            </span>
          </div>
          {summary.remaining !== 0 && (
            <span className={`worker-row-amount${summary.remaining < 0 ? ' text-bad' : ''}`}>
              {money(summary.remaining)}
              <span className="muted small">{summary.remaining > 0 ? 'left to pay' : 'overpaid'}</span>
            </span>
          )}
          <Icon name="right" size={18} />
        </Link>
      </li>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Workers</h1>
        <button className="btn btn-primary" onClick={() => setParams({ new: '1' })}>
          <Icon name="plus" size={18} /> Add worker
        </button>
      </div>

      {workers.length === 0 && (
        <div className="card empty">
          <Icon name="users" size={32} />
          <p>Add each worker with their monthly salary and the amount they usually take each day.</p>
        </div>
      )}

      {current.length > 0 && <ul className="card-list">{current.map(row)}</ul>}

      {former.length > 0 && (
        <>
          <h2 className="section-title">Former workers</h2>
          <ul className="card-list">{former.map(row)}</ul>
        </>
      )}

      {adding && (
        <WorkerForm
          onClose={() => setParams({}, { replace: true })}
          onCreated={(id) => navigate(`/workers/${id}`, { replace: true })}
        />
      )}
    </div>
  )
}
