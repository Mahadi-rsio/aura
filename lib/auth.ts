import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { nextCookies } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'
import { getDb, type Database } from './db'
import { DatabaseUnavailableError, requireDb } from './db-safe'
import { people } from './schema'
import * as authSchema from './auth-schema'

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

/** Lazily resolve the DB so importing auth without DATABASE_URL does not throw. */
function lazyDb(): NonNullable<Database> {
  return new Proxy({} as NonNullable<Database>, {
    get(_target, prop, _receiver) {
      const db = getDb()
      if (!db) throw new DatabaseUnavailableError()
      const value = Reflect.get(db, prop, db)
      return typeof value === 'function' ? value.bind(db) : value
    },
  })
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter((value): value is string => Boolean(value)),
  database: drizzleAdapter(lazyDb(), {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    freshAge: 0,
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    deleteUser: {
      enabled: true,
      afterDelete: async (user) => {
        const db = getDb()
        if (!db) return
        await db.delete(people).where(eq(people.userId, user.id))
      },
    },
  },
  plugins: [nextCookies()],
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const db = getDb()
          if (!db) return
          await db
            .update(people)
            .set({ disabledAt: null, updatedAt: new Date() })
            .where(eq(people.userId, session.userId))
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          const db = requireDb()
          const existing = await db
            .select({ id: people.id })
            .from(people)
            .where(eq(people.userId, user.id))
            .limit(1)
          if (existing[0]) return
          await db.insert(people).values({
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
        },
      },
    },
  },
})

export type AuthSession = typeof auth.$Infer.Session
