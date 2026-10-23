import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// The Supabase project URL and publishable (anon) key are baked in at build time from
// .env.production. Both are safe to expose: row level security in supabase/schema.sql is what
// protects the data. When they are missing, the app asks for them on first launch and remembers
// them on that device.
const CONFIG_KEY = 'fts.supabase-config'
const MODE_KEY = 'fts.mode'

export interface SupabaseConfig {
  url: string
  key: string
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && key) return { url, key }
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    return saved ? (JSON.parse(saved) as SupabaseConfig) : null
  } catch {
    return null
  }
}

export function isConfigBuiltIn(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function saveSupabaseConfig(config: SupabaseConfig | null) {
  if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  else localStorage.removeItem(CONFIG_KEY)
}

export type AppMode = 'cloud' | 'demo'

export function getMode(): AppMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'demo' ? 'demo' : 'cloud'
  } catch {
    return 'cloud'
  }
}

export function setMode(mode: AppMode) {
  localStorage.setItem(MODE_KEY, mode)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (client) return client
  const config = getSupabaseConfig()
  if (!config) return null
  client = createClient(config.url, config.key)
  return client
}
