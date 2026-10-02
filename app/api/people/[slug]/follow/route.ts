import { jsonError, jsonOk } from '@/lib/http'
import { ForbiddenError, NotFoundError, toggleFollow } from '@/lib/api'
import { requireSession, UnauthorizedError } from '@/lib/session'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const sessionId = await requireSession()
    return jsonOk(await toggleFollow(slug, sessionId))
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not record that follow')
  }
}
