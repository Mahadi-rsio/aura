import { listFeedPage, listPeople } from '@/lib/api'
import { getSessionId } from '@/lib/session'
import FeedClient from '@/components/feed/feed-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const sessionId = await getSessionId()
  const [page, people] = await Promise.all([listFeedPage({ limit: 12 }, sessionId), listPeople()])
  return <FeedClient initialPosts={page.posts} initialPeople={people} />
}