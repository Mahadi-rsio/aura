import { getDb } from './db'
import type { Database } from './db'

export function safeDb(): Database {
  return getDb()
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL)
}

export class DatabaseUnavailableError extends Error {
  readonly status = 503
  constructor() {
    super('No database is configured. Set DATABASE_URL to enable this action.')
  }
}

export function requireDb() {
  const db = getDb()
  if (!db) throw new DatabaseUnavailableError()
  return db
}

export type { Database }