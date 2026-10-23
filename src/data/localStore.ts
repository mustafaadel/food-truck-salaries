import { addDays, addMonths, currentMonth, todayISO } from '../lib/months'
import type { Entry } from '../lib/types'
import type { DataStore, NewEntry, NewWorker, Snapshot, WorkerPatch } from './store'

const KEY = 'fts.demo-data'

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Snapshot
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

/** Two sample workers so demo mode has something to show, including the 10,000 − daily pay example. */
function sampleData(): Snapshot {
  const month = currentMonth()
  const startMonth = addMonths(month, -1)
  const workers = [
    { id: crypto.randomUUID(), name: 'Sample worker 1', phone: null, dailyAmount: 100, startMonth, endMonth: null, notes: null },
    { id: crypto.randomUUID(), name: 'Sample worker 2', phone: null, dailyAmount: 150, startMonth, endMonth: null, notes: null },
  ]
  const rates = [
    { id: crypto.randomUUID(), workerId: workers[0].id, effectiveMonth: startMonth, monthlyAmount: 10000 },
    { id: crypto.randomUUID(), workerId: workers[1].id, effectiveMonth: startMonth, monthlyAmount: 8000 },
  ]
  const entries: Entry[] = []
  const today = todayISO()
  // Daily pay for every day of this month before today, for both workers.
  for (let date = `${month}-01`; date < today; date = addDays(date, 1)) {
    for (const worker of workers) {
      entries.push({ id: crypto.randomUUID(), workerId: worker.id, date, kind: 'daily', amount: worker.dailyAmount, note: null })
    }
  }
  if (entries.length > 0) {
    entries.push({ id: crypto.randomUUID(), workerId: workers[1].id, date: `${month}-01`, kind: 'deduction', amount: 200, note: 'Late arrival' })
  }
  // Last month was settled in full.
  for (const [i, worker] of workers.entries()) {
    entries.push({
      id: crypto.randomUUID(),
      workerId: worker.id,
      date: addDays(`${month}-01`, -1),
      kind: 'payment',
      amount: rates[i].monthlyAmount,
      note: `Salary for ${startMonth}`,
    })
  }
  return { workers, rates, entries }
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
      const rate = { id: crypto.randomUUID(), workerId: worker.id, effectiveMonth: worker.startMonth, monthlyAmount: monthlySalary }
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
      const created = entries.map((e) => ({ ...e, id: crypto.randomUUID() }))
      data.entries.push(...created)
      return created
    })
  }

  async deleteEntry(id: string) {
    this.update((data) => {
      data.entries = data.entries.filter((e) => e.id !== id)
    })
  }
}
