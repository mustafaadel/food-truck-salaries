import { describe, expect, it } from 'vitest'
import { formatMoney, parseAmount } from './money'

describe('parseAmount', () => {
  it('reads plain and formatted numbers', () => {
    expect(parseAmount('100')).toBe(100)
    expect(parseAmount(' 10,000 ')).toBe(10000)
    expect(parseAmount('12.5')).toBe(12.5)
    expect(parseAmount('.5')).toBe(0.5)
    expect(parseAmount('0')).toBe(0)
  })

  it('reads Arabic and Persian digits', () => {
    expect(parseAmount('١٠٠')).toBe(100)
    expect(parseAmount('١٠٬٠٠٠')).toBe(10000)
    expect(parseAmount('۱۵۰')).toBe(150)
    expect(parseAmount('٢٫٥')).toBe(2.5)
  })

  it('rounds to two decimals', () => {
    expect(parseAmount('1.006')).toBe(1.01)
  })

  it('rejects anything else', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('groups thousands and adds the currency', () => {
    expect(formatMoney(7000)).toBe('7,000')
    expect(formatMoney(7000, 'EGP')).toBe('7,000 EGP')
    expect(formatMoney(-2000.5)).toBe('−2,000.50')
    expect(formatMoney(125000.25)).toBe('125,000.25')
    expect(formatMoney(0)).toBe('0')
  })
})
