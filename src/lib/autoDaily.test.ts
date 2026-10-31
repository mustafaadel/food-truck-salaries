import { describe, expect, it } from 'vitest'
import { autoDailyApplies, missingAutoDailies } from './autoDaily'
import { summarizeMonth } from './payroll'
import type { DaySkip, Entry, Worker } from './types'

const worker: Worker = {
  id: 'w1',
  name: 'Worker',
  phone: null,
  dailyAmount: 100,
  startMonth: '2026-10',
  endMonth: null,
  notes: null,
  autoDaily: true,
  autoDailyFrom: '2026-10-01',
}

const entry = (date: string, auto = true, workerId = 'w1'): Entry => ({
  id: `${workerId}-${date}-${auto}`,
  workerId,
  date,
  kind: 'daily',
  amount: 100,
  note: null,
  auto,
})

describe('missingAutoDailies', () => {
  it('fills every day from the start date through today', () => {
    const missing = missingAutoDailies([worker], [], [], '2026-10-05')
    expect(missing.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'])
    expect(missing[0]).toEqual({ workerId: 'w1', date: '2026-10-01', kind: 'daily', amount: 100, note: null })
  })

  it('skips days that already have daily pay, automatic or by hand', () => {
    const missing = missingAutoDailies([worker], [entry('2026-10-01'), entry('2026-10-02', false)], [], '2026-10-03')
    expect(missing.map((e) => e.date)).toEqual(['2026-10-03'])
  })

  it('skips days marked absent or not taken, including in the future', () => {
    const skips: DaySkip[] = [
      { workerId: 'w1', date: '2026-10-02', reason: 'absent' },
      { workerId: 'w1', date: '2026-10-03', reason: 'not_taken' },
    ]
    expect(missingAutoDailies([worker], [], skips, '2026-10-04').map((e) => e.date)).toEqual([
      '2026-10-01',
      '2026-10-04',
    ])
  })

  it('ignores other kinds of entries on the same day', () => {
    const deduction: Entry = { ...entry('2026-10-01'), kind: 'deduction', auto: false }
    expect(missingAutoDailies([worker], [deduction], [], '2026-10-01')).toHaveLength(1)
  })

  it('does nothing when automatic daily pay is off, has no amount, or has no start date', () => {
    const today = '2026-10-03'
    expect(missingAutoDailies([{ ...worker, autoDaily: false }], [], [], today)).toEqual([])
    expect(missingAutoDailies([{ ...worker, dailyAmount: 0 }], [], [], today)).toEqual([])
    expect(missingAutoDailies([{ ...worker, autoDailyFrom: null }], [], [], today)).toEqual([])
  })

  it('never fills days in the future', () => {
    expect(missingAutoDailies([{ ...worker, autoDailyFrom: '2026-11-01' }], [], [], '2026-10-31')).toEqual([])
  })

  it('stops after the last month of a worker who left', () => {
    const leaver = { ...worker, autoDailyFrom: '2026-09-29', startMonth: '2026-09', endMonth: '2026-09' }
    expect(missingAutoDailies([leaver], [], [], '2026-10-02').map((e) => e.date)).toEqual(['2026-09-29', '2026-09-30'])
  })

  it('waits for the start month even if the automatic start date is earlier', () => {
    const later = { ...worker, startMonth: '2026-11', autoDailyFrom: '2026-10-30' }
    expect(missingAutoDailies([later], [], [], '2026-11-02').map((e) => e.date)).toEqual(['2026-11-01', '2026-11-02'])
  })

  it('uses the current daily amount for the days it fills', () => {
    const raised = { ...worker, dailyAmount: 150 }
    expect(missingAutoDailies([raised], [entry('2026-10-01')], [], '2026-10-02')).toMatchObject([{ amount: 150 }])
  })

  it('gives the 10,000 − 30 × 100 = 7,000 example once the month is filled', () => {
    const filled = missingAutoDailies([worker], [], [], '2026-10-30').map((e, i) => ({ ...e, id: `e${i}`, auto: true }))
    const rates = [{ id: 'r', workerId: 'w1', effectiveMonth: '2026-10', monthlyAmount: 10000 }]
    expect(summarizeMonth(worker, rates, filled, '2026-10')).toMatchObject({ dailyDays: 30, remaining: 7000 })
  })
})

describe('autoDailyApplies', () => {
  it('starts on the automatic start date', () => {
    const fromMid = { ...worker, autoDailyFrom: '2026-10-15' }
    expect(autoDailyApplies(fromMid, '2026-10-14')).toBe(false)
    expect(autoDailyApplies(fromMid, '2026-10-15')).toBe(true)
  })
})
