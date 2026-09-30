import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { requireDb } from './db-safe'
import { people, type PersonRow } from './schema'
import { toPerson } from './mappers'

export const SESSION_COOKIE = 'aura_session'
const SESSION_DAYS = 365

function secret() {
  return process.env.SESSION_SECRET || 'aura-development-secret'
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionToken(userId: string) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const payload = `${userId}.${expires}`
  return `${payload}.${sign(payload)}`
}

export function parseSessionToken(token: string | undefined) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expiry, signature] = parts
  const payload = `${userId}.${expiry}`
  const expected = sign(payload)
  const given = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null
  if (!Number.isFinite(Number(expiry)) || Number(expiry) < Date.now()) return null
  return userId
}

export async function getSessionId() {
  const store = await cookies()
  return parseSessionToken(store.get(SESSION_COOKIE)?.value)
}

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'No active session.') {
    super(message)
  }
}

export async function requireSession() {
  const userId = await getSessionId()
  if (!userId) throw new UnauthorizedError()
  return userId
}

export async function getSessionUser(): Promise<PersonRow | null> {
  const userId = await getSessionId()
  if (!userId) return null
  const db = requireDb()
  const rows = await db.select().from(people).where(eq(people.id, userId)).limit(1)
  return rows[0] ?? null
}

export async function ensureUser(): Promise<PersonRow> {
  const existing = await getSessionUser()
  if (existing) return existing
  const db = requireDb()
  const slug = `aura-${Date.now().toString(36)}`
  const [created] = await db
    .insert(people)
    .values({
      slug,
      name: `Aura ${slug.split('-')[1]}`,
      role: 'Collector in training',
      location: 'Somewhere quiet',
      statement: 'A new voice in the archive. Everything here began today.',
      bio: 'This profile was created the moment the first entry was published.',
      imageKey: null,
      accent: '06',
      tags: ['new'],
      links: {},
      isSessionOwner: true,
    })
    .returning()
  if (!created) throw new Error('Could not create a session user')
  return created
}

export async function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  return response
}

export { toPerson }