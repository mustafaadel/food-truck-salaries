import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  hint?: ReactNode
  onChange(value: string): void
}

export function Field({ label, hint, onChange, ...input }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input {...input} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

/** A money input that brings up the number keypad on phones. */
export function AmountField(props: FieldProps) {
  return <Field inputMode="decimal" autoComplete="off" enterKeyHint="done" placeholder="0" {...props} />
}

/** A month picker; browsers without one show a text box that takes YYYY-MM. */
export function MonthField(props: FieldProps) {
  return <Field type="month" pattern="\d{4}-\d{2}" placeholder="YYYY-MM" {...props} />
}
