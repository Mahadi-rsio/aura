import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

for (const name of ['.env.local', '.env']) {
  const path = join(process.cwd(), name)
  if (existsSync(path)) config({ path })
}

export default defineConfig({
  schema: ['./lib/schema.ts', './lib/auth-schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})