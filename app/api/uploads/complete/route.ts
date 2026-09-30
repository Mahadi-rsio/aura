import { eq } from 'drizzle-orm'
import { jsonError, jsonOk } from '@/lib/http'
import { completeUploadSchema } from '@/lib/validation/uploads'
import { media } from '@/lib/schema'
import { requireDb, DatabaseUnavailableError } from '@/lib/db-safe'
import { requireSession, UnauthorizedError } from '@/lib/session'
import { mediaUrl, objectExists, StorageMissingError, StorageUnavailableError } from '@/lib/storage'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = completeUploadSchema.safeParse(body)
  if (!parsed.success) return jsonError(422, 'That upload cannot be completed', parsed.error)

  try {
    await requireSession()
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not authorize the upload')
  }

  try {
    const exists = await objectExists(parsed.data.key)
    if (!exists) return jsonError(404, 'That object is not in the bucket. Re-presign and upload it again.')

    const db = requireDb()
    const [existing] = await db.select().from(media).where(eq(media.objectKey, parsed.data.key)).limit(1)
    if (existing) {
      return jsonOk({ mediaId: existing.id, url: mediaUrl(existing), key: existing.objectKey })
    }

    const [inserted] = await db
      .insert(media)
      .values({
        bucket: process.env.MINIO_BUCKET || 'aura',
        objectKey: parsed.data.key,
        publicPath: null,
        mimeType: parsed.data.contentType,
        sizeBytes: parsed.data.size,
        altText: parsed.data.altText ?? null,
      })
      .returning()
    return jsonOk({ mediaId: inserted.id, url: mediaUrl(inserted), key: inserted.objectKey })
  } catch (error) {
    if (error instanceof StorageMissingError) return jsonError(404, error.message)
    if (error instanceof StorageUnavailableError) return jsonError(503, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not complete the upload')
  }
}