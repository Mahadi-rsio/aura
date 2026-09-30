import { jsonError, jsonOk } from '@/lib/http'
import { createPostSchema, updatePostSchema } from '@/lib/validation/posts'
import { deletePost, ForbiddenError, getPostBySlug, NotFoundError, updatePost } from '@/lib/api'
import { getSessionId, requireSession, UnauthorizedError } from '@/lib/session'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

type Context = { params: Promise<{ slug: string }> }

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params
  try {
    const sessionId = await getSessionId()
    const post = await getPostBySlug(slug, sessionId)
    return jsonOk({ post })
  } catch (error) {
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not read that entry')
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const { slug } = await params
  const body = await request.json().catch(() => null)
  const parsed = updatePostSchema.safeParse(body)
  if (!parsed.success) return jsonError(422, 'Those changes are not valid', parsed.error)

  try {
    const sessionId = await requireSession()
    const post = await updatePost(slug, parsed.data, sessionId)
    return jsonOk({ post })
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not update that entry')
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { slug } = await params
  try {
    const sessionId = await requireSession()
    await deletePost(slug, sessionId)
    return jsonOk({ ok: true })
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not delete that entry')
  }
}