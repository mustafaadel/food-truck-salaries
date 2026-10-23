import { monthOf, monthRange, type Month } from './months'
import type { Entry, SalaryRate, Worker } from './types'

// All arithmetic runs in whole cents so sums like 0.1 + 0.2 never drift.
const toCents = (amount: number) => Math.round(amount * 100)
const fromCents = (cents: number) => cents / 100

export function isEmployedIn(worker: Worker, month: Month): boolean {
  return worker.startMonth <= month && (worker.endMonth === null || month <= worker.endMonth)
}

/**
 * The salary rate in force in `month`: the latest one that has started. Months before the first
 * rate use the first rate, so the worker's start month alone decides when pay begins.
 */
export function rateFor(worker: Worker, rates: SalaryRate[], month: Month): SalaryRate | undefined {
  let current: SalaryRate | undefined
  let earliest: SalaryRate | undefined
  for (const rate of rates) {
    if (rate.workerId !== worker.id) continue
    if (!earliest || rate.effectiveMonth < earliest.effectiveMonth) earliest = rate
    if (rate.effectiveMonth <= month && (!current || rate.effectiveMonth > current.effectiveMonth)) current = rate
  }
  return current ?? earliest
}

/** The monthly salary the worker earns in `month`, or 0 outside their employment. */
export function salaryFor(worker: Worker, rates: SalaryRate[], month: Month): number {
  if (!isEmployedIn(worker, month)) return 0
  return rateFor(worker, rates, month)?.monthlyAmount ?? 0
}

export interface MonthSummary {
  month: Month
  /** Balance left over from earlier months. Positive means you still owe the worker. */
  carriedOver: number
  salary: number
  bonuses: number
  deductions: number
  dailyPaid: number
  /** Number of different days with daily pay. */
  dailyDays: number
  /** Payouts other than daily pay, like the end-of-month salary. */
  otherPaid: number
  /** What the worker can still take for this month. Negative means they were overpaid. */
  remaining: number
}

interface CentTotals {
  salary: number
  bonuses: number
  deductions: number
  dailyPaid: number
  otherPaid: number
  dailyDates: Set<string>
}

function totalsFor(entries: Entry[], salary: number): CentTotals {
  const totals: CentTotals = {
    salary: toCents(salary),
    bonuses: 0,
    deductions: 0,
    dailyPaid: 0,
    otherPaid: 0,
    dailyDates: new Set(),
  }
  for (const entry of entries) {
    const cents = toCents(entry.amount)
    switch (entry.kind) {
      case 'daily':
        totals.dailyPaid += cents
        totals.dailyDates.add(entry.date)
        break
      case 'payment':
        totals.otherPaid += cents
        break
      case 'deduction':
        totals.deductions += cents
        break
      case 'bonus':
        totals.bonuses += cents
        break
    }
  }
  return totals
}

const balanceOf = (t: CentTotals) => t.salary + t.bonuses - t.deductions - t.dailyPaid - t.otherPaid

/**
 * Works out a worker's month as a running ledger: every month adds its salary and bonuses and
 * subtracts deductions and money paid, and whatever is left (or overpaid) carries into the next month.
 */
export function summarizeMonth(
  worker: Worker,
  rates: SalaryRate[],
  entries: Entry[],
  month: Month,
): MonthSummary {
  const byMonth = new Map<Month, Entry[]>()
  let firstMonth = worker.startMonth
  for (const entry of entries) {
    if (entry.workerId !== worker.id) continue
    const m = monthOf(entry.date)
    if (m > month) continue
    if (m < firstMonth) firstMonth = m
    const list = byMonth.get(m)
    if (list) list.push(entry)
    else byMonth.set(m, [entry])
  }

  let carried = 0
  let totals = totalsFor([], 0)
  for (const m of monthRange(firstMonth, month)) {
    totals = totalsFor(byMonth.get(m) ?? [], salaryFor(worker, rates, m))
    if (m === month) break
    carried += balanceOf(totals)
  }

  return {
    month,
    carriedOver: fromCents(carried),
    salary: fromCents(totals.salary),
    bonuses: fromCents(totals.bonuses),
    deductions: fromCents(totals.deductions),
    dailyPaid: fromCents(totals.dailyPaid),
    dailyDays: totals.dailyDates.size,
    otherPaid: fromCents(totals.otherPaid),
    remaining: fromCents(carried + balanceOf(totals)),
  }
}

/** Adds up several workers' summaries for the same month. */
export function sumSummaries(month: Month, summaries: MonthSummary[]): MonthSummary {
  const sum = (pick: (s: MonthSummary) => number) =>
    fromCents(summaries.reduce((total, s) => total + toCents(pick(s)), 0))
  return {
    month,
    carriedOver: sum((s) => s.carriedOver),
    salary: sum((s) => s.salary),
    bonuses: sum((s) => s.bonuses),
    deductions: sum((s) => s.deductions),
    dailyPaid: sum((s) => s.dailyPaid),
    dailyDays: summaries.reduce((total, s) => total + s.dailyDays, 0),
    otherPaid: sum((s) => s.otherPaid),
    remaining: sum((s) => s.remaining),
  }
}
