import { useState, type FormEvent } from 'react'
import { useFeedback } from '../app/feedback'
import { useData } from '../data/DataContext'
import { parseAmount } from '../lib/money'
import type { ISODate } from '../lib/months'
import { ENTRY_KINDS, entryKindLabel, type EntryKind } from '../lib/types'
import { AmountField, Field } from './fields'
import { Sheet } from './Sheet'

interface EntryFormProps {
  workerId: string
  date: ISODate
  kind?: EntryKind
  onClose(): void
}

/** Records daily pay, a payout, a deduction or a bonus for one worker. */
export function EntryForm({ workerId, date: initialDate, kind: initialKind = 'deduction', onClose }: EntryFormProps) {
  const { data, addEntries } = useData()
  const { run } = useFeedback()
  const worker = data.workers.find((w) => w.id === workerId)
  const [kind, setKind] = useState<EntryKind>(initialKind)
  const [amount, setAmount] = useState(initialKind === 'daily' && worker?.dailyAmount ? String(worker.dailyAmount) : '')
  const [date, setDate] = useState(initialDate)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!worker) return null

  const chooseKind = (next: EntryKind) => {
    setKind(next)
    if (next === 'daily' && !amount && worker.dailyAmount) setAmount(String(worker.dailyAmount))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = parseAmount(amount)
    if (!value) return setError('Enter an amount above zero.')
    if (!date) return setError('Pick a date.')
    setError(null)
    setSaving(true)
    const saved = await run(
      () => addEntries([{ workerId, date, kind, amount: value, note: note.trim() || null }]),
      `${entryKindLabel(kind)} saved`,
    )
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet title={`Add for ${worker.name}`} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <fieldset className="choice-grid">
          <legend className="field-label">Type</legend>
          {ENTRY_KINDS.map((k) => (
            <label key={k.kind} className={`choice${kind === k.kind ? ' choice-on' : ''}`}>
              <input type="radio" name="kind" value={k.kind} checked={kind === k.kind} onChange={() => chooseKind(k.kind)} />
              <span className="choice-title">{k.label}</span>
              <span className="choice-hint">{k.hint}</span>
            </label>
          ))}
        </fieldset>
        <AmountField label="Amount" value={amount} onChange={setAmount} required />
        <Field label="Date" type="date" value={date} onChange={setDate} required />
        <Field label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Absent on Friday" maxLength={200} />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Saving…' : `Save ${entryKindLabel(kind).toLowerCase()}`}
        </button>
      </form>
    </Sheet>
  )
}
