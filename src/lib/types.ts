import type { ISODate, Month } from './months'

export interface Worker {
  id: string
  name: string
  phone: string | null
  /** Amount usually handed over each working day, used by the one-tap "Pay daily" button. */
  dailyAmount: number
  /** First month the worker earns a salary. */
  startMonth: Month
  /** Last month the worker earns a salary; null while they still work here. */
  endMonth: Month | null
  notes: string | null
}

/** A monthly salary that applies from `effectiveMonth` until a later rate replaces it. */
export interface SalaryRate {
  id: string
  workerId: string
  effectiveMonth: Month
  monthlyAmount: number
}

export type EntryKind = 'daily' | 'payment' | 'deduction' | 'bonus'

export interface Entry {
  id: string
  workerId: string
  date: ISODate
  kind: EntryKind
  /** Always positive; `kind` decides whether it adds to or subtracts from what the worker is owed. */
  amount: number
  note: string | null
}

export const ENTRY_KINDS: { kind: EntryKind; label: string; hint: string }[] = [
  { kind: 'daily', label: 'Daily pay', hint: 'Money handed over for a working day' },
  { kind: 'payment', label: 'Payout', hint: 'Any other money paid, like the end-of-month salary' },
  { kind: 'deduction', label: 'Deduction', hint: 'Taken off the salary, like an absence or a loan' },
  { kind: 'bonus', label: 'Bonus', hint: 'Added to the salary, like overtime or a reward' },
]

export function entryKindLabel(kind: EntryKind): string {
  return ENTRY_KINDS.find((k) => k.kind === kind)!.label
}
