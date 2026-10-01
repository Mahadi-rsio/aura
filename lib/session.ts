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

function slugFromEmail(email: string) {
  const local = email
    .split('@')[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
  const base = local || 'aura'
  const suffix = Date.now().toString(36).slice(-4)
  return `${base}-${suffix}`
}

async function getAuthSession() {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
}

async function ensurePeopleForAuthUser(user: { id: string; name?: string | null; email: string }): Promise<PersonRow | null> {
  const db = getDb()
  if (!db) return null
  const existing = await db.select().from(people).where(eq(people.userId, user.id)).limit(1)
  if (existing[0]) return existing[0]
  const [created] = await db
    .insert(people)
    .values({
      slug: slugFromEmail(user.email),
      name: user.name?.trim() || user.email.split('@')[0] || 'Aura',
      role: 'Collector',
      location: '',
      statement: 'A new voice in the archive.',
      bio: '',
      imageKey: null,
      accent: '06',
      tags: ['new'],
      links: [],
      userId: user.id,
    })
    .returning()
  return created ?? null
}

export async function getSessionUser(): Promise<PersonRow | null> {
  const session = await getAuthSession()
  if (!session?.user) return null
  return ensurePeopleForAuthUser(session.user)
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
