import { drizzle } from 'drizzle-orm/node-postgres'
import { pgTable, text, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'

export const biographyContent = pgTable('biography_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  section: text('section').notNull().unique(),
  content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

const globalForDb = globalThis as unknown as { biographyPool?: Pool }
const pool = globalForDb.biographyPool ?? new Pool({ connectionString: process.env.DATABASE_URL })
if (process.env.NODE_ENV !== 'production') globalForDb.biographyPool = pool
export const db = drizzle(pool)
