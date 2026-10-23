import { createContext, useContext, useState, type ReactNode } from 'react'
import { formatMoney } from '../lib/money'

const CURRENCY_KEY = 'fts.currency'

interface SettingsContextValue {
  currency: string
  setCurrency(currency: string): void
  money(amount: number): string
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside SettingsProvider')
  return value
}

function readCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_KEY) ?? ''
  } catch {
    return ''
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(readCurrency)

  const setCurrency = (value: string) => {
    const trimmed = value.trim()
    setCurrencyState(trimmed)
    try {
      localStorage.setItem(CURRENCY_KEY, trimmed)
    } catch {
      // The label just won't be remembered on this device.
    }
  }

  return (
    <SettingsContext.Provider value={{ currency, setCurrency, money: (amount) => formatMoney(amount, currency) }}>
      {children}
    </SettingsContext.Provider>
  )
}
