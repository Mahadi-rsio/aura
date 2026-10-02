import { eq } from 'drizzle-orm'
import { jsonError, jsonOk } from '@/lib/http'
import { DatabaseUnavailableError, requireDb } from '@/lib/db-safe'
import { people } from '@/lib/schema'
import { session as authSession } from '@/lib/auth-schema'
import { requireSessionUser, UnauthorizedError } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const person = await requireSessionUser()
    const db = requireDb()
    const now = new Date()
    await db.update(people).set({ disabledAt: now, updatedAt: now }).where(eq(people.id, person.id))
    if (person.userId) {
      await db.delete(authSession).where(eq(authSession.userId, person.userId))
    }
    return jsonOk({ disabled: true })
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not disable your account')
  }
}
