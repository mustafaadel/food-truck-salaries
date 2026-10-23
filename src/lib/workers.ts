import { LOCALE } from './money'
import type { Worker } from './types'

export const byName = (a: Worker, b: Worker) => a.name.localeCompare(b.name, LOCALE, { sensitivity: 'base' })
