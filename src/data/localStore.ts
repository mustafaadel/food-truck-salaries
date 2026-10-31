import { addDays, addMonths, currentMonth, firstDayOfMonth, todayISO, type ISODate } from '../lib/months'
import type { DaySkip, Entry, SkipReason, Worker } from '../lib/types'
import type { DataStore, NewEntry, NewWorker, Snapshot, WorkerPatch } from './store'

const KEY = 'fts.demo-data'

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      // Demo data saved by an earlier version lacks the automatic daily pay fields.
      const saved = JSON.parse(raw) as Snapshot
      return {
        workers: saved.workers.map((w) => ({
          ...w,
          autoDaily: w.autoDaily ?? false,
          autoDailyFrom: w.autoDailyFrom ?? null,
        })),
        rates: saved.rates,
        entries: saved.entries.map((e) => ({ ...e, auto: e.auto ?? false })),
        skips: saved.skips ?? [],
      }
    }
  } catch {
    // Unreadable demo data is replaced by fresh sample data below.
  }
  const sample = sampleData()
  write(sample)
  return sample
}

function write(snapshot: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(snapshot))
}

export function resetDemoData() {
  localStorage.removeItem(KEY)
}

/**
 * Two sample workers so demo mode has something to show. Their daily pay is automatic from the start
 * of this month, so the app fills it in when it opens; one absence shows how a skipped day looks.
 */
function sampleData(): Snapshot {
  const month = currentMonth()
  const startMonth = addMonths(month, -1)
  const autoDailyFrom = firstDayOfMonth(month)
  const sample = (name: string, dailyAmount: number): Worker => ({
    id: crypto.randomUUID(),
    name,
    phone: null,
    dailyAmount,
    startMonth,
    endMonth: null,
    notes: null,
    autoDaily: true,
    autoDailyFrom,
  })
  const workers = [sample('Sample worker 1', 100), sample('Sample worker 2', 150)]
  const rates = [
    { id: crypto.randomUUID(), workerId: workers[0].id, effectiveMonth: startMonth, monthlyAmount: 10000 },
    { id: crypto.randomUUID(), workerId: workers[1].id, effectiveMonth: startMonth, monthlyAmount: 8000 },
  ]
  const entries: Entry[] = [
    {
      id: crypto.randomUUID(),
      workerId: workers[1].id,
      date: autoDailyFrom,
      kind: 'deduction',
      amount: 200,
      note: 'Late arrival',
      auto: false,
    },
  ]
  // Last month was settled in full.
  for (const [i, worker] of workers.entries()) {
    entries.push({
      id: crypto.randomUUID(),
      workerId: worker.id,
      date: addDays(autoDailyFrom, -1),
      kind: 'payment',
      amount: rates[i].monthlyAmount,
      note: `Salary for ${startMonth}`,
      auto: false,
    })
  }
  const secondDay = addDays(autoDailyFrom, 1)
  const skips: DaySkip[] =
    secondDay < todayISO() ? [{ workerId: workers[1].id, date: secondDay, reason: 'absent' }] : []
  return { workers, rates, entries, skips }
}

/** Keeps everything in this browser's storage. Used for trying the app before the database is set up. */
export class LocalStore implements DataStore {
  readonly mode = 'demo'

  private update<T>(change: (data: Snapshot) => T): T {
    const data = read()
    const result = change(data)
    write(data)
    return result
  }

  async load() {
    return read()
  }

  async createWorker({ monthlySalary, ...fields }: NewWorker) {
    return this.update((data) => {
      const worker = { ...fields, id: crypto.randomUUID() }
      const rate = {
        id: crypto.randomUUID(),
        workerId: worker.id,
        effectiveMonth: worker.startMonth,
        monthlyAmount: monthlySalary,
      }
      data.workers.push(worker)
      data.rates.push(rate)
      return { worker, rate }
    })
  }

  async updateWorker(id: string, patch: WorkerPatch) {
    return this.update((data) => {
      const index = data.workers.findIndex((w) => w.id === id)
      if (index < 0) throw new Error('Worker not found')
      data.workers[index] = { ...data.workers[index], ...patch }
      return data.workers[index]
    })
  }

  async deleteWorker(id: string) {
    this.update((data) => {
      data.workers = data.workers.filter((w) => w.id !== id)
      data.rates = data.rates.filter((r) => r.workerId !== id)
      data.entries = data.entries.filter((e) => e.workerId !== id)
      data.skips = data.skips.filter((s) => s.workerId !== id)
    })
  }

  async setSalary(workerId: string, effectiveMonth: string, monthlyAmount: number) {
    return this.update((data) => {
      const existing = data.rates.find((r) => r.workerId === workerId && r.effectiveMonth === effectiveMonth)
      if (existing) {
        existing.monthlyAmount = monthlyAmount
        return existing
      }
      const rate = { id: crypto.randomUUID(), workerId, effectiveMonth, monthlyAmount }
      data.rates.push(rate)
      return rate
    })
  }

  async deleteSalary(id: string) {
    this.update((data) => {
      data.rates = data.rates.filter((r) => r.id !== id)
    })
  }

  async addEntries(entries: NewEntry[]) {
    return this.update((data) => {
      const created = entries.map((e) => ({ ...e, id: crypto.randomUUID(), auto: false }))
      data.entries.push(...created)
      return created
    })
  }

  async addAutoDailies(entries: NewEntry[]) {
    return this.update((data) => {
      const filled = new Set(data.entries.filter((e) => e.auto).map((e) => `${e.workerId}|${e.date}`))
      const created = entries
        .filter((e) => !filled.has(`${e.workerId}|${e.date}`))
        .map((e) => ({ ...e, id: crypto.randomUUID(), auto: true }))
      data.entries.push(...created)
      return created
    })
  }

  async deleteEntry(id: string) {
    this.update((data) => {
      data.entries = data.entries.filter((e) => e.id !== id)
    })
  }

  async skipDay(workerId: string, date: ISODate, reason: SkipReason) {
    return this.update((data) => {
      const skip = { workerId, date, reason }
      data.skips = [...data.skips.filter((s) => s.workerId !== workerId || s.date !== date), skip]
      data.entries = data.entries.filter((e) => !(e.auto && e.workerId === workerId && e.date === date))
      return skip
    })
  }

  async unskipDay(workerId: string, date: ISODate) {
    this.update((data) => {
      data.skips = data.skips.filter((s) => s.workerId !== workerId || s.date !== date)
    })
  }
}
