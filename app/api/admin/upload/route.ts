import { cookies } from 'next/headers'
import { jsonError, jsonOk } from '@/lib/http'
import { adminUploadSchema } from '@/lib/validation/session'
import { buildKey, ensureBucket, MAX_UPLOAD_BYTES, putObject, StorageUnavailableError } from '@/lib/storage'
import { requireDb, DatabaseUnavailableError } from '@/lib/db-safe'
import { media } from '@/lib/schema'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get('biography_admin')?.value !== 'authenticated') return jsonError(401, 'Unauthorized')

  const formData = await request.formData().catch(() => null)
  if (!formData) return jsonError(400, 'That upload must be a form')

  const file = formData.get('file')
  const parsedSection = adminUploadSchema.safeParse({ section: String(formData.get('section') || 'archive') })
  const section = parsedSection.success ? parsedSection.data.section : 'archive'

  if (!(file instanceof File) || !file.type.startsWith('image/')) return jsonError(400, 'Please choose an image file')
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(400, 'Images must be smaller than 10MB')

  try {
    await ensureBucket()
    const key = buildKey(file.name, file.type)
    await putObject(key, Buffer.from(await file.arrayBuffer()), file.type)

    const db = requireDb()
    const [inserted] = await db
      .insert(media)
      .values({
        bucket: process.env.MINIO_BUCKET || 'aura',
        objectKey: key,
        publicPath: null,
        mimeType: file.type,
        sizeBytes: file.size,
        altText: `${section} upload`,
      })
      .returning()

    return jsonOk({ url: `/api/images/${inserted.objectKey}`, key: inserted.objectKey, mediaId: inserted.id, section })
  } catch (error) {
    if (error instanceof StorageUnavailableError) return jsonError(503, error.message)
    if (error instanceof DatabaseUnavailableError) return jsonError(503, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Upload failed')
  }
}