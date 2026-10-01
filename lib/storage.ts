import { AwsClient } from 'aws4fetch'
import { StorageMissingError, StorageUnavailableError, storageConfig, type StorageConfig } from './storage-config'

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
  var auraS3: { signature: string; client: AwsClient; ensured: boolean } | undefined
}

function configSignature(config: StorageConfig) {
  return [
    config.endPoint,
    config.port,
    config.useSSL,
    config.bucket,
    config.region,
    config.accessKey,
    config.forcePathStyle,
  ].join(':')
}

function getClient() {
  const config = storageConfig()
  if (!config) throw new StorageUnavailableError()
  const signature = configSignature(config)
  const cached = globalThis.auraS3
  if (cached && cached.signature === signature) return { client: cached.client, config, ensured: cached.ensured }
  const client = new AwsClient({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    service: 's3',
    region: config.region,
    retries: 2,
  })
  const entry = { signature, client, ensured: false }
  globalThis.auraS3 = entry
  return { client, config, ensured: false }
}

function markEnsured() {
  const cached = globalThis.auraS3
  if (cached) cached.ensured = true
}

function origin(config: StorageConfig) {
  const defaultPort = (config.useSSL && config.port === 443) || (!config.useSSL && config.port === 80)
  return `${config.useSSL ? 'https' : 'http'}://${config.endPoint}${defaultPort ? '' : `:${config.port}`}`
}

function encodeKey(key: string) {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

function hostFor(config: StorageConfig) {
  return new URL(origin(config))
}

function objectUrl(config: StorageConfig, key: string) {
  const url = hostFor(config)
  if (config.forcePathStyle) return `${origin(config)}/${config.bucket}/${encodeKey(key)}`
  url.host = `${config.bucket}.${url.host}`
  return `${url.origin}/${encodeKey(key)}`
}

function bucketUrl(config: StorageConfig) {
  const url = hostFor(config)
  if (config.forcePathStyle) return `${origin(config)}/${config.bucket}`
  url.host = `${config.bucket}.${url.host}`
  return url.origin
}

export async function ensureBucket() {
  const { client, config, ensured } = getClient()
  if (ensured) return config.bucket
  try {
    const head = await client.fetch(bucketUrl(config), { method: 'HEAD' })
    if (head.ok) {
      markEnsured()
      return config.bucket
    }
    if (head.status !== 404) throw new StorageUnavailableError(`Bucket check failed with status ${head.status}`)
    const created = await client.fetch(bucketUrl(config), { method: 'PUT' })
    if (!created.ok && created.status !== 409) {
      throw new StorageUnavailableError(`Bucket creation failed with status ${created.status}`)
    }
    markEnsured()
    return config.bucket
  } catch (error) {
    if (error instanceof StorageUnavailableError) throw error
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export async function presignPut(key: string, contentType: string, expirySeconds = 60 * 30) {
  const { client, config } = getClient()
  await ensureBucket()
  try {
    const target = new URL(objectUrl(config, key))
    target.searchParams.set('X-Amz-Expires', String(expirySeconds))
    const signed = await client.sign(target.toString(), {
      method: 'PUT',
      headers: { 'content-type': contentType },
      aws: { signQuery: true },
    })
    return {
      key,
      uploadUrl: signed.url,
      mediaUrl: `/api/images/${key}`,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
    }
  } catch (error) {
    if (error instanceof StorageUnavailableError) throw error
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export async function objectExists(key: string) {
  const { client, config } = getClient()
  await ensureBucket()
  try {
    const response = await client.fetch(objectUrl(config, key), { method: 'HEAD' })
    if (response.ok) return true
    if (response.status === 404) return false
    throw new StorageUnavailableError(`Object check failed with status ${response.status}`)
  } catch (error) {
    if (error instanceof StorageUnavailableError) throw error
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export type ObjectStats = {
  size: number
  metaData: { 'content-type'?: string }
}

export async function statObject(key: string): Promise<ObjectStats> {
  const { client, config } = getClient()
  await ensureBucket()
  try {
    const response = await client.fetch(objectUrl(config, key), { method: 'HEAD' })
    if (response.status === 404) throw new StorageMissingError()
    if (!response.ok) throw new StorageUnavailableError(`Object stat failed with status ${response.status}`)
    return {
      size: Number(response.headers.get('content-length') ?? 0),
      metaData: { 'content-type': response.headers.get('content-type') ?? guessContentType(key) },
    }
  } catch (error) {
    if (error instanceof StorageMissingError || error instanceof StorageUnavailableError) throw error
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export type ObjectPayload = {
  stream: ReadableStream<Uint8Array>
  contentType: string
  sizeBytes: number
}

export async function getObjectStream(key: string): Promise<ObjectPayload> {
  const { client, config } = getClient()
  await ensureBucket()
  try {
    const response = await client.fetch(objectUrl(config, key))
    if (response.status === 404) throw new StorageMissingError()
    if (!response.ok || !response.body) throw new StorageUnavailableError(`Object read failed with status ${response.status}`)
    return {
      stream: response.body as ReadableStream<Uint8Array>,
      contentType: response.headers.get('content-type') || guessContentType(key),
      sizeBytes: Number(response.headers.get('content-length') ?? 0),
    }
  } catch (error) {
    if (error instanceof StorageMissingError || error instanceof StorageUnavailableError) throw error
    throw new StorageUnavailableError(error instanceof Error ? error.message : undefined)
  }
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const { client, config } = getClient()
  await ensureBucket()
  try {
    const response = await client.fetch(objectUrl(config, key), {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body,
    })
    if (!response.ok) throw new StorageUnavailableError(`Object upload failed with status ${response.status}`)
  } catch (error) {
    if (error instanceof StorageUnavailableError) throw error
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
