import type { SupabaseClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { FeedbackProvider } from './app/feedback'
import { Layout } from './app/Layout'
import { AuthGate } from './app/session'
import { SettingsProvider } from './app/settings'
import { getMode, getSupabase } from './data/config'
import { DataProvider } from './data/DataContext'
import { LocalStore } from './data/localStore'
import type { DataStore } from './data/store'
import { SupabaseStore } from './data/supabaseStore'
import { MonthPage } from './pages/MonthPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { TodayPage } from './pages/TodayPage'
import { WorkerPage } from './pages/WorkerPage'
import { WorkersPage } from './pages/WorkersPage'

type Backend = { store: DataStore; supabase: SupabaseClient | null } | null

function pickBackend(): Backend {
  if (getMode() === 'demo') return { store: new LocalStore(), supabase: null }
  const supabase = getSupabase()
  return supabase ? { store: new SupabaseStore(supabase), supabase } : null
}

function Screens({ store }: { store: DataStore }) {
  return (
    <DataProvider store={store}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="month" element={<MonthPage />} />
            <Route path="workers" element={<WorkersPage />} />
            <Route path="workers/:id" element={<WorkerPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  )
}

export default function App() {
  const [backend] = useState(pickBackend)
  return (
    <SettingsProvider>
      <FeedbackProvider>
        {!backend ? (
          <SetupPage />
        ) : backend.supabase ? (
          <AuthGate supabase={backend.supabase}>
            <Screens store={backend.store} />
          </AuthGate>
        ) : (
          <Screens store={backend.store} />
        )}
      </FeedbackProvider>
    </SettingsProvider>
  )
}
