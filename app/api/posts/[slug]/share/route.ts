import { jsonError, jsonOk } from '@/lib/http'
import { ForbiddenError, incrementShare, NotFoundError } from '@/lib/api'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    return jsonOk(await incrementShare(slug))
  } catch (error) {
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not record that share')
  }
}