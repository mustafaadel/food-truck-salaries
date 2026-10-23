import { describe, expect, it } from 'vitest'
import { addMonths, monthRange } from './months'
import { salaryFor, sumSummaries, summarizeMonth } from './payroll'
import type { Entry, EntryKind, SalaryRate, Worker } from './types'

const worker: Worker = {
  id: 'w1',
  name: 'Worker',
  phone: null,
  dailyAmount: 100,
  startMonth: '2026-01',
  endMonth: null,
  notes: null,
}

const rates: SalaryRate[] = [{ id: 'r1', workerId: 'w1', effectiveMonth: '2026-01', monthlyAmount: 10000 }]

let nextId = 0
function entry(date: string, kind: EntryKind, amount: number, workerId = 'w1'): Entry {
  return { id: `e${nextId++}`, workerId, date, kind, amount, note: null }
}

function dailies(month: string, days: number, amount = 100): Entry[] {
  return Array.from({ length: days }, (_, i) => entry(`${month}-${String(i + 1).padStart(2, '0')}`, 'daily', amount))
}

describe('summarizeMonth', () => {
  it('leaves 7000 of a 10000 salary after 30 days of 100 daily pay', () => {
    const summary = summarizeMonth(worker, rates, dailies('2026-01', 30), '2026-01')
    expect(summary).toMatchObject({ salary: 10000, dailyPaid: 3000, dailyDays: 30, remaining: 7000, carriedOver: 0 })
  })

  it('subtracts deductions and adds bonuses', () => {
    const entries = [
      ...dailies('2026-01', 10),
      entry('2026-01-12', 'deduction', 250),
      entry('2026-01-20', 'bonus', 500),
    ]
    const summary = summarizeMonth(worker, rates, entries, '2026-01')
    expect(summary).toMatchObject({ deductions: 250, bonuses: 500, remaining: 10000 - 1000 - 250 + 500 })
  })

  it('reaches zero once the rest of the salary is paid out', () => {
    const entries = [...dailies('2026-01', 30), entry('2026-01-31', 'payment', 7000)]
    expect(summarizeMonth(worker, rates, entries, '2026-01').remaining).toBe(0)
  })

  it('carries an unpaid balance into the next month', () => {
    const entries = [...dailies('2026-01', 30), entry('2026-02-01', 'payment', 5000)]
    const feb = summarizeMonth(worker, rates, entries, '2026-02')
    expect(feb.carriedOver).toBe(7000)
    expect(feb.remaining).toBe(7000 + 10000 - 5000)
  })

  it('carries an overpayment into the next month as a negative balance', () => {
    const entries = [...dailies('2026-01', 30, 400)]
    const jan = summarizeMonth(worker, rates, entries, '2026-01')
    expect(jan.remaining).toBe(-2000)
    expect(summarizeMonth(worker, rates, entries, '2026-02')).toMatchObject({ carriedOver: -2000, remaining: 8000 })
  })

  it('ignores other workers and later months', () => {
    const entries = [entry('2026-01-05', 'daily', 100, 'w2'), entry('2026-02-05', 'daily', 100)]
    expect(summarizeMonth(worker, rates, entries, '2026-01').remaining).toBe(10000)
  })

  it('counts days, not entries, for daily pay', () => {
    const entries = [entry('2026-01-05', 'daily', 100), entry('2026-01-05', 'daily', 50)]
    expect(summarizeMonth(worker, rates, entries, '2026-01')).toMatchObject({ dailyDays: 1, dailyPaid: 150 })
  })

  it('handles decimal amounts without rounding errors', () => {
    const entries = [entry('2026-01-01', 'daily', 0.1), entry('2026-01-02', 'daily', 0.2)]
    expect(summarizeMonth(worker, rates, entries, '2026-01').remaining).toBe(9999.7)
  })

  it('returns zeros before the worker started', () => {
    expect(summarizeMonth(worker, rates, [], '2025-12')).toMatchObject({ salary: 0, remaining: 0, carriedOver: 0 })
  })

  it('stops the salary after the last month but keeps the balance', () => {
    const leaver = { ...worker, endMonth: '2026-01' }
    const entries = dailies('2026-01', 30)
    expect(summarizeMonth(leaver, rates, entries, '2026-02')).toMatchObject({ salary: 0, carriedOver: 7000, remaining: 7000 })
  })

  it('accumulates over many months', () => {
    const months = monthRange('2026-01', '2026-12')
    const entries = months.flatMap((m) => [...dailies(m, 20), entry(`${m}-28`, 'payment', 8000)])
    expect(summarizeMonth(worker, rates, entries, '2026-12').remaining).toBe(0)
    expect(summarizeMonth(worker, rates, entries, addMonths('2026-12', 1)).remaining).toBe(10000)
  })
})

describe('salaryFor', () => {
  const raised: SalaryRate[] = [...rates, { id: 'r2', workerId: 'w1', effectiveMonth: '2026-04', monthlyAmount: 12000 }]

  it('uses the latest rate that has started', () => {
    expect(salaryFor(worker, raised, '2026-03')).toBe(10000)
    expect(salaryFor(worker, raised, '2026-04')).toBe(12000)
    expect(salaryFor(worker, raised, '2027-01')).toBe(12000)
  })

  it('uses the first rate for months before it, so an earlier start month still earns', () => {
    const lateRate = [{ id: 'r9', workerId: 'w1', effectiveMonth: '2026-03', monthlyAmount: 9000 }]
    expect(salaryFor(worker, lateRate, '2026-01')).toBe(9000)
    expect(salaryFor(worker, [], '2026-01')).toBe(0)
  })

  it('applies a raise only from its month in the running balance', () => {
    const summary = summarizeMonth(worker, raised, [], '2026-04')
    expect(summary).toMatchObject({ carriedOver: 30000, salary: 12000, remaining: 42000 })
  })
})

describe('sumSummaries', () => {
  it('adds summaries field by field', () => {
    const other: Worker = { ...worker, id: 'w2' }
    const allRates = [...rates, { id: 'r3', workerId: 'w2', effectiveMonth: '2026-01', monthlyAmount: 8000 }]
    const entries = [...dailies('2026-01', 30), entry('2026-01-03', 'daily', 100, 'w2')]
    const total = sumSummaries('2026-01', [
      summarizeMonth(worker, allRates, entries, '2026-01'),
      summarizeMonth(other, allRates, entries, '2026-01'),
    ])
    expect(total).toMatchObject({ salary: 18000, dailyPaid: 3100, dailyDays: 31, remaining: 14900 })
  })
})
