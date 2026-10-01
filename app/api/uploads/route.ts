import { jsonError, jsonOk } from '@/lib/http'
import { requireSession, UnauthorizedError } from '@/lib/session'
import { requireDb, DatabaseUnavailableError } from '@/lib/db-safe'
import { media } from '@/lib/schema'
import {
  buildKey,
  ensureBucket,
  MAX_UPLOAD_BYTES,
  mediaUrl,
  putObject,
  StorageUnavailableError,
} from '@/lib/storage'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    await requireSession()
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonError(401, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not authorize the upload')
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) return jsonError(400, 'That upload must be a form')

  const file = formData.get('file')
  const altText = String(formData.get('altText') || '').slice(0, 300) || undefined

  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return jsonError(400, 'Please choose an image file')
  }
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(400, 'Images must be smaller than 10MB')

  try {
    await ensureBucket()
    const key = buildKey(file.name, file.type)
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type)

    const db = requireDb()
    const [inserted] = await db
      .insert(media)
      .values({
        bucket: process.env.MINIO_BUCKET || 'aura',
        objectKey: key,
        publicPath: null,
        mimeType: file.type,
        sizeBytes: file.size,
        altText: altText ?? null,
      })
      .returning()

    return jsonOk({ mediaId: inserted.id, url: mediaUrl(inserted), key: inserted.objectKey }, 201)
  } catch (error) {
    if (error instanceof StorageUnavailableError) return jsonError(503, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not upload the image')
  }
}
