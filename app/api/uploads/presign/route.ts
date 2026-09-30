import { NextResponse } from 'next/server'
import { jsonError, jsonOk } from '@/lib/http'
import { presignRequestSchema } from '@/lib/validation/uploads'
import { buildKey, presignPut, StorageUnavailableError } from '@/lib/storage'
import { requireSession, UnauthorizedError } from '@/lib/session'
import { DatabaseUnavailableError } from '@/lib/db-safe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = presignRequestSchema.safeParse(body)
  if (!parsed.success) return jsonError(422, 'That file cannot be uploaded', parsed.error)

  try {
    await requireSession()
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not authorize the upload')
  }

  const { contentType } = parsed.data
  try {
    const presigned = await presignPut(buildKey(parsed.data.filename, contentType), contentType)
    return jsonOk(presigned)
  } catch (error) {
    if (error instanceof StorageUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not sign the upload')
  }
}