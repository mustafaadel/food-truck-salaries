import { useSearchParams } from 'react-router'
import { currentMonth, isValidMonth, type Month } from './months'

/** The month shown on a page, kept in the address (?m=2026-10) so back/forward and refresh keep it. */
export function useMonthParam(): [Month, (month: Month) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get('m')
  const month = value && isValidMonth(value) ? value : currentMonth()
  const setMonth = (next: Month) =>
    setParams(
      (current) => {
        current.set('m', next)
        return current
      },
      { replace: true },
    )
  return [month, setMonth]
}
