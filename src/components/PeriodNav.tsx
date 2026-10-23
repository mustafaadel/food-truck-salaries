import { useRef } from 'react'
import { addDays, addMonths, currentMonth, formatDate, formatMonth, todayISO, type ISODate, type Month } from '../lib/months'
import { Icon } from './Icon'

interface PeriodNavProps {
  label: string
  inputType: 'month' | 'date'
  value: string
  isCurrent: boolean
  currentLabel: string
  onChange(value: string): void
  onStep(delta: number): void
  onReset(): void
}

/** Previous / next arrows around a label that opens the phone's native picker when tapped. */
function PeriodNav({ label, inputType, value, isCurrent, currentLabel, onChange, onStep, onReset }: PeriodNavProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="period-nav">
      <button type="button" className="icon-btn" onClick={() => onStep(-1)} aria-label={`Previous ${inputType === 'month' ? 'month' : 'day'}`}>
        <Icon name="left" />
      </button>
      <div className="period-center">
        <button
          type="button"
          className="period-label"
          onClick={() => {
            try {
              input.current?.showPicker()
            } catch {
              input.current?.focus()
            }
          }}
        >
          {label}
        </button>
        <input
          ref={input}
          className="period-input"
          type={inputType}
          value={value}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
        {!isCurrent && (
          <button type="button" className="link-btn period-reset" onClick={onReset}>
            {currentLabel}
          </button>
        )}
      </div>
      <button type="button" className="icon-btn" onClick={() => onStep(1)} aria-label={`Next ${inputType === 'month' ? 'month' : 'day'}`}>
        <Icon name="right" />
      </button>
    </div>
  )
}

export function MonthNav({ month, onChange }: { month: Month; onChange(month: Month): void }) {
  return (
    <PeriodNav
      label={formatMonth(month)}
      inputType="month"
      value={month}
      isCurrent={month === currentMonth()}
      currentLabel="Back to this month"
      onChange={onChange}
      onStep={(delta) => onChange(addMonths(month, delta))}
      onReset={() => onChange(currentMonth())}
    />
  )
}

export function DateNav({ date, onChange }: { date: ISODate; onChange(date: ISODate): void }) {
  const today = todayISO()
  return (
    <PeriodNav
      label={date === today ? `Today, ${formatDate(date, { weekday: undefined })}` : formatDate(date, { year: 'numeric' })}
      inputType="date"
      value={date}
      isCurrent={date === today}
      currentLabel="Back to today"
      onChange={onChange}
      onStep={(delta) => onChange(addDays(date, delta))}
      onReset={() => onChange(today)}
    />
  )
}
