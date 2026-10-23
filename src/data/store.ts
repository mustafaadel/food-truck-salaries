import type { Month } from '../lib/months'
import type { Entry, SalaryRate, Worker } from '../lib/types'

export interface Snapshot {
  workers: Worker[]
  rates: SalaryRate[]
  entries: Entry[]
}

export type NewWorker = Omit<Worker, 'id'> & { monthlySalary: number }
export type WorkerPatch = Partial<Omit<Worker, 'id'>>
export type NewEntry = Omit<Entry, 'id'>

/** Where the records live: the Supabase database, or this browser for demo mode. */
export interface DataStore {
  readonly mode: 'cloud' | 'demo'
  load(): Promise<Snapshot>
  createWorker(input: NewWorker): Promise<{ worker: Worker; rate: SalaryRate }>
  updateWorker(id: string, patch: WorkerPatch): Promise<Worker>
  deleteWorker(id: string): Promise<void>
  /** Sets the monthly salary from `effectiveMonth` on, replacing any rate for that same month. */
  setSalary(workerId: string, effectiveMonth: Month, monthlyAmount: number): Promise<SalaryRate>
  deleteSalary(id: string): Promise<void>
  addEntries(entries: NewEntry[]): Promise<Entry[]>
  deleteEntry(id: string): Promise<void>
}

/** The signed-in account isn't on the admins list, so it can't see any records. */
export class NoAccessError extends Error {
  constructor() {
    super("This account doesn't have access yet.")
    this.name = 'NoAccessError'
  }
}
