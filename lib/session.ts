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

async function getAuthSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}

async function findPersonForAuthUser(userId: string): Promise<PersonRow | null> {
  const db = getDb()
  if (!db) return null
  const existing = await db.select().from(people).where(eq(people.userId, userId)).limit(1)
  return existing[0] ?? null
}

export async function getAuthUser() {
  const session = await getAuthSession()
  return session?.user ?? null
}

export async function getSessionUser(): Promise<PersonRow | null> {
  const session = await getAuthSession()
  if (!session?.user) return null
  const person = await findPersonForAuthUser(session.user.id)
  if (person?.disabledAt) return null
  return person
}

export async function getSessionId() {
  const user = await getSessionUser()
  return user?.id ?? null
}

export async function requireSession() {
  const userId = await getSessionId()
  if (!userId) throw new UnauthorizedError()
  return userId
}

export async function requireSessionUser(): Promise<PersonRow> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  return user
}
