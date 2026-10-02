import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAuthUser, getSessionUser } from '@/lib/session'
import { nameUnlockAt } from '@/lib/api'
import { toPerson } from '@/lib/mappers'
import SettingsClient from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [user, authUser] = await Promise.all([getSessionUser(), getAuthUser()])

  if (!user || !authUser) redirect('/login?next=/settings')

  return (
    <main className="create-page settings-page">
      <header className="create-header">
        <Link href="/" className="create-back"><ArrowLeft size={15} /> Back to Aura</Link>
        <span className="create-header-label">Settings / {user.slug}</span>
      </header>
      <SettingsClient name={user.name} email={authUser.email} image={toPerson(user).image} slug={user.slug} nameLockedUntil={nameUnlockAt(user.nameChangedAt)} />
    </main>
  )
}
