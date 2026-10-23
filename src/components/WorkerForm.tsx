import { useState, type FormEvent } from 'react'
import { useFeedback } from '../app/feedback'
import { useData } from '../data/DataContext'
import { parseAmount } from '../lib/money'
import { currentMonth, isValidMonth } from '../lib/months'
import type { Worker } from '../lib/types'
import { AmountField, Field, MonthField } from './fields'
import { Sheet } from './Sheet'

/** Adds a new worker, or edits one when `worker` is given. Salary changes for existing workers live on the worker page. */
export function WorkerForm({ worker, onClose, onCreated }: { worker?: Worker; onClose(): void; onCreated?(id: string): void }) {
  const { createWorker, updateWorker } = useData()
  const { run } = useFeedback()
  const [name, setName] = useState(worker?.name ?? '')
  const [phone, setPhone] = useState(worker?.phone ?? '')
  const [salary, setSalary] = useState('')
  const [daily, setDaily] = useState(worker ? String(worker.dailyAmount) : '')
  const [startMonth, setStartMonth] = useState(worker?.startMonth ?? currentMonth())
  const [notes, setNotes] = useState(worker?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const dailyAmount = daily.trim() ? parseAmount(daily) : 0
    const monthlySalary = parseAmount(salary)
    if (!name.trim()) return setError('Enter a name.')
    if (!worker && monthlySalary === null) return setError('Enter the monthly salary.')
    if (dailyAmount === null) return setError('The daily amount must be a number.')
    if (!isValidMonth(startMonth)) return setError('Pick the month they started, like 2026-10.')
    if (worker?.endMonth && worker.endMonth < startMonth) return setError('The start month is after the month they left.')
    setError(null)
    setSaving(true)
    const fields = {
      name: name.trim(),
      phone: phone.trim() || null,
      dailyAmount,
      startMonth,
      notes: notes.trim() || null,
    }
    let createdId = ''
    const saved = await run(async () => {
      if (worker) await updateWorker(worker.id, fields)
      else createdId = await createWorker({ ...fields, endMonth: null, monthlySalary: monthlySalary! })
    }, worker ? 'Changes saved' : `${fields.name} added`)
    setSaving(false)
    if (!saved) return
    onClose()
    if (createdId) onCreated?.(createdId)
  }

  return (
    <Sheet title={worker ? `Edit ${worker.name}` : 'Add a worker'} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Name" value={name} onChange={setName} autoComplete="off" autoCapitalize="words" required />
        <div className="field-row">
          {!worker && <AmountField label="Monthly salary" value={salary} onChange={setSalary} required />}
          <AmountField
            label="Usual daily pay"
            value={daily}
            onChange={setDaily}
            hint="Used by the one-tap Pay button. Leave empty if they don't take daily pay."
          />
        </div>
        <MonthField
          label="Started in"
          value={startMonth}
          onChange={setStartMonth}
          hint="Their salary counts from this month."
          required
        />
        <Field label="Phone (optional)" type="tel" value={phone} onChange={setPhone} autoComplete="off" />
        <Field label="Notes (optional)" value={notes} onChange={setNotes} maxLength={300} />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Saving…' : worker ? 'Save changes' : 'Add worker'}
        </button>
      </form>
    </Sheet>
  )
}
