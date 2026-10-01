import { cache } from 'react'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { neonConfig, Pool } from '@neondatabase/serverless'
import * as schema from './schema'
import * as authSchema from './auth-schema'

if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket
}

const fullSchema = { ...schema, ...authSchema }

export type Database = ReturnType<typeof createDb> | null

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
  return drizzle(pool, { schema: fullSchema })
}

/**
 * On Cloudflare Workers a connection pool must not be shared across requests,
 * so the Neon pool is scoped to a single request via React's `cache`. Outside
 * the Next.js runtime (e.g. `pnpm db:seed`) a fresh client is returned instead.
 */
const requestDb = cache(createDb)

export function getDb() {
  if (!process.env.DATABASE_URL) return null
  return process.env.NEXT_RUNTIME ? requestDb() : createDb()
}

export { schema }
