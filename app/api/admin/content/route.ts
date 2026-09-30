import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { requireDb, DatabaseUnavailableError } from '@/lib/db-safe'
import { biographyContent } from '@/lib/schema'
import { jsonError, jsonOk } from '@/lib/http'
import { adminContentSchema } from '@/lib/validation/session'

export const runtime = 'nodejs'

async function authorized() {
  return (await cookies()).get('biography_admin')?.value === 'authenticated'
}

export async function GET() {
  if (!(await authorized())) return jsonError(401, 'Unauthorized')
  try {
    const rows = await requireDb().select().from(biographyContent)
    return jsonOk({ content: rows })
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not read the content')
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return jsonError(401, 'Unauthorized')
  const body = await request.json().catch(() => null)
  const parsed = adminContentSchema.safeParse(body)
  if (!parsed.success) return jsonError(400, 'Section and content are required')

  try {
    const db = requireDb()
    const [saved] = await db
      .insert(biographyContent)
      .values({ section: parsed.data.section, content: parsed.data.content, updatedAt: new Date() })
      .onConflictDoUpdate({ target: biographyContent.section, set: { content: parsed.data.content, updatedAt: new Date() } })
      .returning()
    return jsonOk({ content: saved })
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not save the content')
  }
}