import { NextResponse } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http'
import { ensureUser, setSessionCookie, UnauthorizedError } from '@/lib/session'
import { toPerson } from '@/lib/mappers'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const user = await ensureUser()
    const response = jsonOk({ user: toPerson(user) }) as NextResponse
    return setSessionCookie(response, user.id)
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    if (error instanceof UnauthorizedError) return jsonError(error.status, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not start a session')
  }
}