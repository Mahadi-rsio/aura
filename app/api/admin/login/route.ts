import { NextResponse } from 'next/server'
import { adminLoginSchema } from '@/lib/validation/session'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '369456'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = adminLoginSchema.safeParse(body)
  if (!parsed.success || parsed.data.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('biography_admin', 'authenticated', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('biography_admin')
  return response
}
