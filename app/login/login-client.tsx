'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

type Mode = 'signin' | 'signup'

function safeNext(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/profile'
  return path
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = useMemo(() => safeNext(searchParams.get('next')), [searchParams])
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const result = await authClient.signUp.email({
          name: name.trim() || email.split('@')[0] || 'Aura',
          email: email.trim(),
          password,
        })
        if (result.error) {
          setError(result.error.message || 'Could not create the account')
          return
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        })
        if (result.error) {
          setError(result.error.message || 'Could not sign in')
          return
        }
      }
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <Link href="/" className="login-back"><ArrowLeft size={15} /> Back to Aura</Link>
        <span className="login-header-label">Archive access / 2026</span>
      </header>
      <div className="login-layout">
        <section className="login-intro">
          <p className="feed-kicker">Sign in to write</p>
          <h1>Keep your<br /><em>voice.</em></h1>
          <p className="login-note">Email and password open your archive. Compose, star, and claim a profile that stays yours.</p>
        </section>
        <section className="login-panel">
          <div className="login-modes" role="tablist" aria-label="Auth mode">
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'is-selected' : ''} onClick={() => setMode('signin')}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-selected' : ''} onClick={() => setMode('signup')}>
              Create account
            </button>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="login-field">
                <span>01 / Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we address you?" autoComplete="name" />
              </label>
            )}
            <label className="login-field">
              <span>{mode === 'signup' ? '02' : '01'} / Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </label>
            <label className="login-field">
              <span>{mode === 'signup' ? '03' : '02'} / Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </label>
            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            {error && <p className="login-error" role="alert">{error}</p>}
          </form>
        </section>
      </div>
    </main>
  )
}
