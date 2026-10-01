import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionUser } from '@/lib/session'
import { toProfileEdit } from '@/lib/mappers'
import EditProfileClient from './edit-profile-client'

export const dynamic = 'force-dynamic'

export default async function EditProfilePage() {
  const user = await getSessionUser()

  if (!user) redirect('/login?next=/profile/edit')

  return (
    <main className="create-page edit-profile-page">
      <header className="create-header">
        <Link href={`/profile/${user.slug}`} className="create-back"><ArrowLeft size={15} /> Back to your profile</Link>
        <span className="create-header-label">Edit profile / {user.slug}</span>
      </header>
      <EditProfileClient profile={toProfileEdit(user)} />
    </main>
  )
}
