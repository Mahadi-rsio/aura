import { Readable } from 'node:stream'
import type { Client as MinioClient } from 'minio'
import { StorageMissingError, StorageUnavailableError, storageConfig } from './storage-config'

export {
  MAX_UPLOAD_BYTES,
  StorageMissingError,
  StorageUnavailableError,
  buildKey,
  bucketName,
  extensionFor,
  mediaUrl,
  storageConfig,
} from './storage-config'
export type { MediaRef, StorageConfig } from './storage-config'

declare global {
  // eslint-disable-next-line no-var
  var auraMinio: { client: MinioClient; bucket: string; ensured: boolean } | undefined
}

async function getClient() {
  const config = storageConfig()
  if (!config) throw new StorageUnavailableError()
  const cached = globalThis.auraMinio
  if (cached) return cached
  const { Client } = await import('minio')
  const client = new Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
  })
  const entry = { client, bucket: config.bucket, ensured: false }
  globalThis.auraMinio = entry
  return entry
}

export async function ensureBucket() {
  const entry = await getClient()
  if (entry.ensured) return entry.bucket
  try {
    const exists = await entry.client.bucketExists(entry.bucket)
    if (!exists) await entry.client.makeBucket(entry.bucket, storageConfig()?.region || 'us-east-1')
    entry.ensured = true
    return entry.bucket
  } catch (error) {
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export async function presignPut(key: string, contentType: string, expirySeconds = 60 * 30) {
  const { client, bucket } = await getClient()
  await ensureBucket()
  let uploadUrl: string
  try {
    uploadUrl = await client.presignedPutObject(bucket, key, expirySeconds)
  } catch (error) {
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
  return {
    key,
    uploadUrl,
    mediaUrl: `/api/images/${key}`,
    headers: { 'Content-Type': contentType },
    expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
  }
}

export async function objectExists(key: string) {
  const { client, bucket } = await getClient()
  await ensureBucket()
  try {
    await client.statObject(bucket, key)
    return true
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'NotFound' || code === 'NoSuchKey') return false
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export async function statObject(key: string) {
  const { client, bucket } = await getClient()
  await ensureBucket()
  try {
    return await client.statObject(bucket, key)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'NotFound' || code === 'NoSuchKey') throw new StorageMissingError()
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export type ObjectPayload = {
  stream: ReadableStream<Uint8Array>
  contentType: string
  sizeBytes: number
}

export async function getObjectStream(key: string): Promise<ObjectPayload> {
  const { client, bucket } = await getClient()
  await ensureBucket()
  try {
    const nodeStream = await client.getObject(bucket, key)
    const stats = await client.statObject(bucket, key)
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      contentType: (stats.metaData?.['content-type'] as string | undefined) || guessContentType(key),
      sizeBytes: Number(stats.size ?? 0),
    }
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'NotFound' || code === 'NoSuchKey') throw new StorageMissingError()
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  const { client, bucket } = await getClient()
  await ensureBucket()
  try {
    await client.putObject(bucket, key, body, body.length, { 'Content-Type': contentType })
  } catch (error) {
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

function guessContentType(key: string) {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'avif':
      return 'image/avif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}