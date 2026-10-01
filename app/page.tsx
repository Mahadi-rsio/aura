import { listFeedPage } from '@/lib/api'
import { getSessionId } from '@/lib/session'
import FeedClient from '@/components/feed/feed-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const sessionId = await getSessionId()
  const page = await listFeedPage({ limit: 12 }, sessionId)
  return <FeedClient initialPosts={page.posts} />
}