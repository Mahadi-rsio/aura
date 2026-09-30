import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from './auth'
import { getDb } from './db'
import { people, type PersonRow } from './schema'

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'Sign in to continue.') {
    super(message)
  }
}

async function getAuthUserId() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

export async function getSessionId() {
  const authUserId = await getAuthUserId()
  if (!authUserId) return null
  const db = getDb()
  if (!db) return null
  const rows = await db.select({ id: people.id }).from(people).where(eq(people.userId, authUserId)).limit(1)
  return rows[0]?.id ?? null
}

export async function requireSession() {
  const userId = await getSessionId()
  if (!userId) throw new UnauthorizedError()
  return userId
}

export async function getSessionUser(): Promise<PersonRow | null> {
  const authUserId = await getAuthUserId()
  if (!authUserId) return null
  const db = getDb()
  if (!db) return null
  const rows = await db.select().from(people).where(eq(people.userId, authUserId)).limit(1)
  return rows[0] ?? null
}

export async function requireSessionUser(): Promise<PersonRow> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  return user
}
