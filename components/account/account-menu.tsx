'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Settings, User } from 'lucide-react'

export default function AccountMenu({ name, image }: { name: string; image: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <img src={image} alt="" />
      </button>
      {open && (
        <div className="account-menu-dropdown" role="menu">
          <p className="account-menu-name">{name}</p>
          <Link href="/profile" role="menuitem" className="account-menu-item" onClick={() => setOpen(false)}>
            <User size={14} aria-hidden="true" /> Profile
          </Link>
          <Link href="/settings" role="menuitem" className="account-menu-item" onClick={() => setOpen(false)}>
            <Settings size={14} aria-hidden="true" /> Settings
          </Link>
        </div>
      )}
    </div>
  )
}
