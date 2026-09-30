import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionId } from '@/lib/session'
import LoginClient from './login-client'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const sessionId = await getSessionId()
  const params = await searchParams
  if (sessionId) {
    const next = params.next
    redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/profile')
  }

  return (
    <Suspense fallback={<main className="login-page" />}>
      <LoginClient />
    </Suspense>
  )
}
