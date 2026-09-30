import { redirect } from 'next/navigation'
import { getSessionId } from '@/lib/session'
import CreateClient from './create-client'

export const dynamic = 'force-dynamic'

export default async function CreatePage() {
  const sessionId = await getSessionId()
  if (!sessionId) redirect('/login?next=/create')
  return <CreateClient />
}
