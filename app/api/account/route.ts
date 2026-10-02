import { jsonError, jsonOk } from '@/lib/http'
import { updateAccountSchema } from '@/lib/validation/account'
import { DatabaseUnavailableError } from '@/lib/db-safe'
import { NotFoundError, RateLimitError, updateAccountName } from '@/lib/api'
import { requireSessionUser, UnauthorizedError } from '@/lib/session'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = updateAccountSchema.safeParse(body)
  if (!parsed.success) return jsonError(422, 'That name is not valid', parsed.error)

  try {
    const person = await requireSessionUser()
    const account = await updateAccountName(person.id, parsed.data.name)
    return jsonOk(account)
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof NotFoundError) return jsonError(404, error.message)
    if (error instanceof RateLimitError) return jsonError(429, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not save your account')
  }
}
