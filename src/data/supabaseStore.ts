import type { SupabaseClient } from '@supabase/supabase-js'
import type { Entry, EntryKind, SalaryRate, Worker } from '../lib/types'
import type { DataStore, NewEntry, NewWorker, WorkerPatch } from './store'

interface WorkerRow {
  id: string
  name: string
  phone: string | null
  daily_amount: number | string
  start_month: string
  end_month: string | null
  notes: string | null
}

interface RateRow {
  id: string
  worker_id: string
  effective_month: string
  monthly_amount: number | string
}

interface EntryRow {
  id: string
  worker_id: string
  entry_date: string
  kind: EntryKind
  amount: number | string
  note: string | null
}

const toWorker = (r: WorkerRow): Worker => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  dailyAmount: Number(r.daily_amount),
  startMonth: r.start_month,
  endMonth: r.end_month,
  notes: r.notes,
})

const toRate = (r: RateRow): SalaryRate => ({
  id: r.id,
  workerId: r.worker_id,
  effectiveMonth: r.effective_month,
  monthlyAmount: Number(r.monthly_amount),
})

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  workerId: r.worker_id,
  date: r.entry_date,
  kind: r.kind,
  amount: Number(r.amount),
  note: r.note,
})

function workerColumns(w: WorkerPatch): Partial<WorkerRow> {
  const row: Partial<WorkerRow> = {}
  if (w.name !== undefined) row.name = w.name
  if (w.phone !== undefined) row.phone = w.phone
  if (w.dailyAmount !== undefined) row.daily_amount = w.dailyAmount
  if (w.startMonth !== undefined) row.start_month = w.startMonth
  if (w.endMonth !== undefined) row.end_month = w.endMonth
  if (w.notes !== undefined) row.notes = w.notes
  return row
}

const PAGE_SIZE = 1000

export class SupabaseStore implements DataStore {
  readonly mode = 'cloud'
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  /** Supabase returns at most 1000 rows per request, so read big tables page by page. */
  private async fetchAll<T>(table: string, columns: string): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await this.db
        .from(table)
        .select(columns)
        .order('created_at')
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...(data as T[]))
      if (data.length < PAGE_SIZE) return rows
    }
  }

  async load() {
    const [workers, rates, entries] = await Promise.all([
      this.fetchAll<WorkerRow>('workers', 'id, name, phone, daily_amount, start_month, end_month, notes'),
      this.fetchAll<RateRow>('salary_rates', 'id, worker_id, effective_month, monthly_amount'),
      this.fetchAll<EntryRow>('entries', 'id, worker_id, entry_date, kind, amount, note'),
    ])
    return { workers: workers.map(toWorker), rates: rates.map(toRate), entries: entries.map(toEntry) }
  }

  async createWorker({ monthlySalary, ...fields }: NewWorker) {
    const { data, error } = await this.db.from('workers').insert(workerColumns(fields)).select().single()
    if (error) throw error
    const worker = toWorker(data)
    try {
      const rate = await this.setSalary(worker.id, worker.startMonth, monthlySalary)
      return { worker, rate }
    } catch (rateError) {
      // Don't leave a worker without a salary behind.
      await this.db.from('workers').delete().eq('id', worker.id)
      throw rateError
    }
  }

  async updateWorker(id: string, patch: WorkerPatch) {
    const { data, error } = await this.db.from('workers').update(workerColumns(patch)).eq('id', id).select().single()
    if (error) throw error
    return toWorker(data)
  }

  async deleteWorker(id: string) {
    const { error } = await this.db.from('workers').delete().eq('id', id)
    if (error) throw error
  }

  async setSalary(workerId: string, effectiveMonth: string, monthlyAmount: number) {
    const { data, error } = await this.db
      .from('salary_rates')
      .upsert(
        { worker_id: workerId, effective_month: effectiveMonth, monthly_amount: monthlyAmount },
        { onConflict: 'worker_id,effective_month' },
      )
      .select()
      .single()
    if (error) throw error
    return toRate(data)
  }

  async deleteSalary(id: string) {
    const { error } = await this.db.from('salary_rates').delete().eq('id', id)
    if (error) throw error
  }

  async addEntries(entries: NewEntry[]) {
    const rows = entries.map((e) => ({
      worker_id: e.workerId,
      entry_date: e.date,
      kind: e.kind,
      amount: e.amount,
      note: e.note,
    }))
    const { data, error } = await this.db.from('entries').insert(rows).select()
    if (error) throw error
    return (data as EntryRow[]).map(toEntry)
  }

  async deleteEntry(id: string) {
    const { error } = await this.db.from('entries').delete().eq('id', id)
    if (error) throw error
  }
}
