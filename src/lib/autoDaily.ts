import { addDays, firstDayOfMonth, lastDayOfMonth, type ISODate } from './months'
import type { DaySkip, Entry, Worker } from './types'

/** Whether `worker` gets daily pay recorded automatically on `date`, unless the day is skipped. */
export function autoDailyApplies(worker: Worker, date: ISODate): boolean {
  if (!worker.autoDaily || !worker.autoDailyFrom || worker.dailyAmount <= 0) return false
  if (date < worker.autoDailyFrom || date < firstDayOfMonth(worker.startMonth)) return false
  return worker.endMonth === null || date <= lastDayOfMonth(worker.endMonth)
}

/**
 * The automatic daily pay still missing up to and including `today`. A day is left alone when the
 * worker already has any daily pay on it (automatic or tapped by hand) or it was marked as skipped.
 */
export function missingAutoDailies(
  workers: Worker[],
  entries: Entry[],
  skips: DaySkip[],
  today: ISODate,
): Omit<Entry, 'id' | 'auto'>[] {
  const covered = new Set<string>()
  for (const e of entries) if (e.kind === 'daily') covered.add(`${e.workerId}|${e.date}`)
  for (const s of skips) covered.add(`${s.workerId}|${s.date}`)

  const missing: Omit<Entry, 'id' | 'auto'>[] = []
  for (const worker of workers) {
    if (!worker.autoDaily || !worker.autoDailyFrom) continue
    for (let date = worker.autoDailyFrom; date <= today; date = addDays(date, 1)) {
      if (!autoDailyApplies(worker, date) || covered.has(`${worker.id}|${date}`)) continue
      missing.push({ workerId: worker.id, date, kind: 'daily', amount: worker.dailyAmount, note: null })
    }
  }
  return missing
}
