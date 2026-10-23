import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tone = 'success' | 'error'

interface Toast {
  id: number
  message: string
  tone: Tone
}

interface FeedbackContextValue {
  notify(message: string, tone?: Tone): void
  /** Runs a save, shows `success` when it works and the error message when it doesn't. Returns whether it worked. */
  run(action: () => Promise<unknown>, success?: string): Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider')
  return value
}

function errorMessage(error: unknown): string {
  // Supabase errors are plain objects with a message, not Error instances.
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error)
  if (/failed to fetch|network/i.test(message)) return "Couldn't reach the server. Check your internet and try again."
  return message
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const notify = useCallback((message: string, tone: Tone = 'success') => {
    const id = nextId.current++
    setToasts((list) => [...list, { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 2500)
  }, [])

  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string) => {
      try {
        await action()
        if (success) notify(success)
        return true
      } catch (error) {
        notify(errorMessage(error), 'error')
        return false
      }
    },
    [notify],
  )

  return (
    <FeedbackContext.Provider value={{ notify, run }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}
