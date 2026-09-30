import { jsonError, jsonOk } from '@/lib/http'
import { searchQuerySchema } from '@/lib/validation/posts'
import { searchAll } from '@/lib/api'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsed = searchQuerySchema.safeParse({
    q: url.searchParams.get('q') ?? '',
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return jsonError(422, 'That search is not valid', parsed.error)

  try {
    return jsonOk(await searchAll(parsed.data))
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not search the archive')
  }
}