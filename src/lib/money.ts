export const LOCALE = 'en-GB'

const wholeFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const centsFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatMoney(amount: number, currency = ''): string {
  const abs = Math.abs(amount)
  const number = (Number.isInteger(Math.round(abs * 100) / 100) ? wholeFormat : centsFormat).format(abs)
  const sign = amount < 0 ? '−' : ''
  return currency ? `${sign}${number} ${currency}` : `${sign}${number}`
}

const DIGITS: Record<string, string> = {}
for (const zero of ['٠', '۰']) {
  for (let i = 0; i < 10; i++) DIGITS[String.fromCharCode(zero.charCodeAt(0) + i)] = String(i)
}

/**
 * Reads an amount typed by hand. Accepts thousands separators ("10,000") and Arabic or Persian
 * digits, and returns null for anything that isn't a non-negative number.
 */
export function parseAmount(input: string): number | null {
  const normalized = input
    .trim()
    .replace(/[٠-٩۰-۹]/g, (d) => DIGITS[d])
    .replace(/٫/g, '.')
    .replace(/[,٬\s]/g, '')
  if (!/^\d+(\.\d+)?$/.test(normalized) && !/^\.\d+$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100) / 100
}

/** Adds amounts in whole cents so the total never drifts. */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((cents, amount) => cents + Math.round(amount * 100), 0) / 100
}
