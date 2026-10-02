'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function LoginPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="login-prompt-backdrop" role="presentation" onClick={onClose}>
      <div
        className="login-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="login-prompt-kicker">Members only</p>
        <h2 id="login-prompt-title">Sign in to see the full archive</h2>
        <p className="login-prompt-copy">Follow people, star entries, and keep your place in the record.</p>
        <div className="login-prompt-actions">
          <Link href="/login" className="login-prompt-primary">Sign in</Link>
          <button type="button" className="login-prompt-secondary" onClick={onClose}>Not now</button>
        </div>
      </div>
    </div>
  )
}
