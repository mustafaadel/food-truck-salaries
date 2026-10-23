import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Month } from '../lib/months'
import { useSession } from '../app/session'
import { NoAccessError, type DataStore, type NewEntry, type NewWorker, type Snapshot, type WorkerPatch } from './store'

interface DataContextValue {
  mode: DataStore['mode']
  data: Snapshot
  reload(): Promise<void>
  createWorker(input: NewWorker): Promise<string>
  updateWorker(id: string, patch: WorkerPatch): Promise<void>
  deleteWorker(id: string): Promise<void>
  setSalary(workerId: string, effectiveMonth: Month, monthlyAmount: number): Promise<void>
  deleteSalary(id: string): Promise<void>
  addEntries(entries: NewEntry[]): Promise<void>
  deleteEntry(id: string): Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData must be used inside DataProvider')
  return value
}

export function DataProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [noAccess, setNoAccess] = useState(false)
  const session = useSession()

  const load = useCallback(
    () =>
      store.load().then(setData, (error: unknown) => {
        if (error instanceof NoAccessError) return setNoAccess(true)
        setLoadError(typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error))
      }),
    [store],
  )

  useEffect(() => {
    void load()
  }, [load])

  const reload = useCallback(async () => {
    setLoadError(null)
    await load()
  }, [load])

  const value = useMemo<DataContextValue | null>(() => {
    if (!data) return null
    return {
      mode: store.mode,
      data,
      reload,
      async createWorker(input) {
        const { worker, rate } = await store.createWorker(input)
        setData((d) => d && { ...d, workers: [...d.workers, worker], rates: [...d.rates, rate] })
        return worker.id
      },
      async updateWorker(id, patch) {
        const worker = await store.updateWorker(id, patch)
        setData((d) => d && { ...d, workers: d.workers.map((w) => (w.id === id ? worker : w)) })
      },
      async deleteWorker(id) {
        await store.deleteWorker(id)
        setData(
          (d) =>
            d && {
              workers: d.workers.filter((w) => w.id !== id),
              rates: d.rates.filter((r) => r.workerId !== id),
              entries: d.entries.filter((e) => e.workerId !== id),
            },
        )
      },
      async setSalary(workerId, effectiveMonth, monthlyAmount) {
        const rate = await store.setSalary(workerId, effectiveMonth, monthlyAmount)
        setData((d) => d && { ...d, rates: [...d.rates.filter((r) => r.id !== rate.id), rate] })
      },
      async deleteSalary(id) {
        await store.deleteSalary(id)
        setData((d) => d && { ...d, rates: d.rates.filter((r) => r.id !== id) })
      },
      async addEntries(entries) {
        const created = await store.addEntries(entries)
        setData((d) => d && { ...d, entries: [...d.entries, ...created] })
      },
      async deleteEntry(id) {
        await store.deleteEntry(id)
        setData((d) => d && { ...d, entries: d.entries.filter((e) => e.id !== id) })
      },
    }
  }, [data, reload, store])

  if (noAccess) {
    return (
      <main className="center-screen">
        <div className="card auth-card stack">
          <h1>No access yet</h1>
          <p>
            You're signed in as <strong>{session?.email}</strong>, but this account isn't an admin yet.
          </p>
          <p className="muted">
            Ask an admin to add your email in the app under Settings → Admins, then tap Try again.
          </p>
          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                setNoAccess(false)
                void reload()
              }}
            >
              Try again
            </button>
            <button className="btn btn-quiet" onClick={() => void session?.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </main>
    )
  }
  if (loadError) {
    return (
      <main className="center-screen">
        <div className="card stack">
          <h1>Couldn't load your records</h1>
          <p className="muted">{loadError}</p>
          <p className="muted">Check your internet connection and try again.</p>
          <button className="btn btn-primary" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      </main>
    )
  }
  if (!value) {
    return (
      <main className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </main>
    )
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
