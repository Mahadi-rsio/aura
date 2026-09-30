import { drizzle } from 'drizzle-orm/neon-serverless'
import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'
import * as schema from './schema'

neonConfig.webSocketConstructor = ws

export type Database = ReturnType<typeof createDb> | null

declare global {
  // eslint-disable-next-line no-var
  var auraDb: ReturnType<typeof createDb> | undefined
}

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
  return drizzle(pool, { schema })
}

export function getDb() {
  if (!process.env.DATABASE_URL) return null
  const existing = globalThis.auraDb
  if (existing) return existing
  const created = createDb()
  globalThis.auraDb = created
  return created
}

export { schema }
