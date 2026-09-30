import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db, biographyContent } from '@/lib/db'

async function authorized() {
  return (await cookies()).get('biography_admin')?.value === 'authenticated'
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select().from(biographyContent)
  return NextResponse.json({ content: rows })
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as { section?: string; content?: Record<string, unknown> }
  const section = body.section?.trim()
  if (!section || !body.content || typeof body.content !== 'object') return NextResponse.json({ error: 'Section and content are required' }, { status: 400 })
  const [saved] = await db.insert(biographyContent).values({ section, content: body.content, updatedAt: new Date() }).onConflictDoUpdate({ target: biographyContent.section, set: { content: body.content, updatedAt: new Date() } }).returning()
  return NextResponse.json({ content: saved })
}
