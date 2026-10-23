import { LOCALE } from './money'

// Months are 'YYYY-MM' strings and dates are 'YYYY-MM-DD' strings, both in local time.
// Plain strings sort chronologically and never shift across time zones.
export type Month = string
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function currentMonth(): Month {
  return monthOf(todayISO())
}

export function monthOf(date: ISODate): Month {
  return date.slice(0, 7)
}

function parseMonth(month: Month): [year: number, monthIndex: number] {
  const [year, m] = month.split('-').map(Number)
  return [year, m - 1]
}

export function addMonths(month: Month, delta: number): Month {
  const [year, monthIndex] = parseMonth(month)
  const index = year * 12 + monthIndex + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

export function addDays(date: ISODate, delta: number): ISODate {
  const [year, m, d] = date.split('-').map(Number)
  return toISODate(new Date(year, m - 1, d + delta))
}

export function firstDayOfMonth(month: Month): ISODate {
  return `${month}-01`
}

export function lastDayOfMonth(month: Month): ISODate {
  const [year, monthIndex] = parseMonth(month)
  return `${month}-${pad(new Date(year, monthIndex + 1, 0).getDate())}`
}

/** Every month from `from` to `to`, inclusive. Empty when `from` is after `to`. */
export function monthRange(from: Month, to: Month): Month[] {
  const months: Month[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m)
  return months
}

/** A date inside `month`: today if today falls in it, otherwise the month's last day. */
export function defaultDateIn(month: Month): ISODate {
  const today = todayISO()
  return monthOf(today) === month ? today : lastDayOfMonth(month)
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function formatMonth(month: Month): string {
  const [year, monthIndex] = parseMonth(month)
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(
    new Date(year, monthIndex, 1),
  )
}

export function formatDate(date: ISODate, options: Intl.DateTimeFormatOptions = {}): string {
  const [year, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(year, m - 1, d))
}
