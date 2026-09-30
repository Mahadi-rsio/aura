import { jsonError, jsonOk } from '@/lib/http'
import { listPostsQuerySchema, createPostSchema } from '@/lib/validation/posts'
import { createPost, ForbiddenError, listFeedPage } from '@/lib/api'
import { getSessionId, requireSession, UnauthorizedError } from '@/lib/session'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = listPostsQuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    type: url.searchParams.get('type') ?? undefined,
    author: url.searchParams.get('author') ?? undefined,
  })
  if (!parsed.success) return jsonError(422, 'Those filters are not valid', parsed.error)

  try {
    const sessionId = await getSessionId()
    const page = await listFeedPage(parsed.data, sessionId)
    return jsonOk({ posts: page.posts, nextCursor: page.nextCursor, hasMore: page.hasMore })
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not read the feed')
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) return jsonError(422, 'That entry is not complete yet', parsed.error)

  try {
    const authorId = await requireSession()
    const post = await createPost(parsed.data, authorId)
    return jsonOk({ post }, 201)
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not publish the entry')
  }
}
