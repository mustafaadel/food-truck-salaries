import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LoginPage } from '../pages/LoginPage'

interface SessionContextValue {
  email: string | null
  signOut(): Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

/** The signed-in account, or null in demo mode. */
export function useSession(): SessionContextValue | null {
  return useContext(SessionContext)
}

/** Shows the sign-in screen until the owner is signed in to Supabase. */
export function AuthGate({ supabase, children }: { supabase: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [supabase])

  if (session === undefined) {
    return (
      <main className="center-screen">
        <div className="spinner" aria-label="Loading" />
      </main>
    )
  }
  if (!session) return <LoginPage supabase={supabase} />

  const value = {
    email: session.user.email ?? null,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  // Keyed by user so switching accounts reloads everything from scratch.
  return (
    <SessionContext.Provider value={value} key={session.user.id}>
      {children}
    </SessionContext.Provider>
  )
}
