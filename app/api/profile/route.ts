import { jsonError, jsonOk } from '@/lib/http'
import { updateProfileSchema } from '@/lib/validation/profile'
import { ForbiddenError, getProfileEdit, NotFoundError, updateProfile } from '@/lib/api'
import { requireSession, UnauthorizedError } from '@/lib/session'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const sessionId = await requireSession()
    const profile = await getProfileEdit(sessionId)
    if (!profile) return jsonError(404, 'That profile does not exist')
    return jsonOk({ profile })
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not read that profile')
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) return jsonError(422, 'Those details are not valid yet', parsed.error)

  try {
    const sessionId = await requireSession()
    const profile = await updateProfile(sessionId, parsed.data, sessionId)
    return jsonOk({ profile })
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof ForbiddenError) return jsonError(403, error.message)
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not save that profile')
  }
}
