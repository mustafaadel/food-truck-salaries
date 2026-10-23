import { describe, expect, it } from 'vitest'
import { addDays, addMonths, isValidMonth, lastDayOfMonth, monthRange } from './months'

describe('months', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-05', -17)).toBe('2024-12')
  })

  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('knows the last day of each month', () => {
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28')
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29')
    expect(lastDayOfMonth('2026-10')).toBe('2026-10-31')
  })

  it('lists an inclusive range of months', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
    expect(monthRange('2026-03', '2026-02')).toEqual([])
  })

  it('validates month strings', () => {
    expect(isValidMonth('2026-10')).toBe(true)
    expect(isValidMonth('2026-13')).toBe(false)
    expect(isValidMonth('2026-1')).toBe(false)
  })
})
