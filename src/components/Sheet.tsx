import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * A modal that slides up from the bottom on phones and sits centered on bigger screens.
 * Mount it to open it; `onClose` runs on the close button, Escape, the back gesture or a tap outside.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="sheet-panel">
        <header className="sheet-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-content">{children}</div>
      </div>
    </dialog>
  )
}
