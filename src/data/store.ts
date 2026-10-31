import type { ISODate, Month } from '../lib/months'
import type { DaySkip, Entry, SalaryRate, SkipReason, Worker } from '../lib/types'

export interface Snapshot {
  workers: Worker[]
  rates: SalaryRate[]
  entries: Entry[]
  skips: DaySkip[]
}

export type NewWorker = Omit<Worker, 'id'> & { monthlySalary: number }
export type WorkerPatch = Partial<Omit<Worker, 'id'>>
/** An entry to add. Entries added by hand are never automatic; addAutoDailies marks its own. */
export type NewEntry = Omit<Entry, 'id' | 'auto'>

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
  /** Adds automatic daily pay, quietly ignoring days another device already filled. Returns what was added. */
  addAutoDailies(entries: NewEntry[]): Promise<Entry[]>
  deleteEntry(id: string): Promise<void>
  /** Marks a day as absent or not taken and removes that day's automatic daily pay. */
  skipDay(workerId: string, date: ISODate, reason: SkipReason): Promise<DaySkip>
  /** Removes the mark, so automatic daily pay applies to that day again. */
  unskipDay(workerId: string, date: ISODate): Promise<void>
}

/** The signed-in account isn't on the admins list, so it can't see any records. */
export class NoAccessError extends Error {
  constructor() {
    super("This account doesn't have access yet.")
    this.name = 'NoAccessError'
  }
}
