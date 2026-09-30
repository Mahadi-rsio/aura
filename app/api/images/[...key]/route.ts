import { jsonError } from '@/lib/http'
import { getObjectStream, StorageMissingError, StorageUnavailableError } from '@/lib/storage'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params
  if (!segments?.length) return jsonError(404, 'No object key was given')

  const key = segments.map((segment) => decodeURIComponent(segment)).join('/')
  if (key.includes('..')) return jsonError(400, 'That object key is not valid')

  try {
    const object = await getObjectStream(key)
    return new Response(object.stream, {
      status: 200,
      headers: {
        'content-type': object.contentType,
        'content-length': String(object.sizeBytes),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    if (error instanceof StorageMissingError) return jsonError(404, error.message)
    if (error instanceof StorageUnavailableError) return jsonError(502, error.message)
    return jsonError(500, error instanceof Error ? error.message : 'Could not read that object')
  }
}