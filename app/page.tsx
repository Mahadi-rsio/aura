import { listFeedPage, listPeopleDirectory } from '@/lib/api'
import { getSessionUser } from '@/lib/session'
import { toPerson } from '@/lib/mappers'
import FeedClient from '@/components/feed/feed-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getSessionUser()
  const page = await listFeedPage({ limit: 12 }, user?.id ?? null)
  const directory = user ? await listPeopleDirectory(user.id) : []
  return (
    <FeedClient
      initialPosts={page.posts}
      account={user ? { name: user.name, image: toPerson(user).image } : null}
      initialPeople={directory}
    />
  )
}
