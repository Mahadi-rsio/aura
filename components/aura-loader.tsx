'use client'

import { useEffect, useMemo, useState } from 'react'

type AuraLoaderProps = {
  text?: string | string[]
  variant?: 'overlay' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function AuraLoader({ text = 'Remembering', variant = 'inline', size = 'md', className = '' }: AuraLoaderProps) {
  const phrases = useMemo(() => {
    const list = Array.isArray(text) ? text : [text]
    return list.map((phrase) => phrase.trim()).filter(Boolean)
  }, [text])

  const [phraseIndex, setPhraseIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [reduced, setReduced] = useState(false)
  const phraseKey = phrases.join('\u0001')

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const phrase = phrases[phraseIndex % phrases.length] ?? ''
    if (!phrase) return
    let delay = deleting ? 42 : 88
    if (!deleting && typed === phrase) delay = 1500
    if (deleting && typed === '') delay = 320
    const timer = window.setTimeout(() => {
      if (!deleting && typed === phrase) {
        setDeleting(true)
      } else if (deleting && typed === '') {
        setDeleting(false)
        if (phrases.length > 1) setPhraseIndex((index) => (index + 1) % phrases.length)
      } else {
        setTyped(deleting ? phrase.slice(0, typed.length - 1) : phrase.slice(0, typed.length + 1))
      }
    }, reduced ? 900 : delay)
    return () => window.clearTimeout(timer)
  }, [typed, deleting, phraseIndex, phraseKey, reduced])

  const label = phrases[0] ?? ''
  const shown = reduced ? label : typed

  return (
    <span className={`aura-loader aura-loader-${variant} aura-loader-${size} ${className}`} role="status" aria-label={label}>
      {variant === 'overlay' && <span className="aura-loader-kicker" aria-hidden="true">Aura / the archive</span>}
      <span className="aura-loader-word" aria-hidden="true">
        {shown}
        <span className="aura-loader-caret" />
      </span>
      {variant === 'overlay' && <span className="aura-loader-rule" aria-hidden="true" />}
    </span>
  )
}
