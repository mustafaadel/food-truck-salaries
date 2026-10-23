import { useSettings } from '../app/settings'
import type { MonthSummary } from '../lib/payroll'

function Row({ label, value, tone }: { label: string; value: string; tone?: 'total' | 'minus' | 'plus' }) {
  return (
    <div className={`summary-row${tone ? ` summary-${tone}` : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** The month's breakdown, ending with how much the worker can still take. */
export function SummaryRows({ summary }: { summary: MonthSummary }) {
  const { money } = useSettings()
  const days = summary.dailyDays === 1 ? '1 day' : `${summary.dailyDays} days`
  return (
    <dl className="summary">
      {summary.carriedOver !== 0 && (
        <Row
          label={summary.carriedOver > 0 ? 'Left from earlier months' : 'Overpaid in earlier months'}
          value={money(summary.carriedOver)}
        />
      )}
      <Row label="Monthly salary" value={money(summary.salary)} />
      {summary.bonuses !== 0 && <Row label="Bonuses" value={`+ ${money(summary.bonuses)}`} tone="plus" />}
      <Row
        label={`Daily pay (${days})`}
        value={summary.dailyPaid ? `− ${money(summary.dailyPaid)}` : money(0)}
        tone={summary.dailyPaid ? 'minus' : undefined}
      />
      {summary.deductions !== 0 && <Row label="Deductions" value={`− ${money(summary.deductions)}`} tone="minus" />}
      {summary.otherPaid !== 0 && <Row label="Payouts" value={`− ${money(summary.otherPaid)}`} tone="minus" />}
      <Row
        label={summary.remaining >= 0 ? 'Left to pay' : 'Overpaid by'}
        value={money(Math.abs(summary.remaining))}
        tone="total"
      />
    </dl>
  )
}
