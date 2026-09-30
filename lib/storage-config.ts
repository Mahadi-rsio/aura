export class StorageUnavailableError extends Error {
  readonly status = 503
  constructor(message = 'Object storage is not reachable. Check MINIO_ENDPOINT and the credentials.') {
    super(message)
  }
}

export class StorageMissingError extends Error {
  readonly status = 404
  constructor(message = 'That object does not exist in the bucket.') {
    super(message)
  }
}

const imageExtensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function bucketName() {
  return process.env.MINIO_BUCKET || 'aura'
}

export function extensionFor(contentType: string) {
  return imageExtensions[contentType.toLowerCase().split(';')[0].trim()] ?? 'png'
}

export type MediaRef = { objectKey: string; publicPath?: string | null }

export function mediaUrl(media: MediaRef) {
  return media.publicPath || `/api/images/${media.objectKey}`
}

export function buildKey(filename: string, contentType: string) {
  const year = new Date().getFullYear()
  const uuid = globalThis.crypto.randomUUID().replace(/-/g, '')
  return `posts/${year}/${uuid}.${extensionFor(contentType || filename.slice(filename.lastIndexOf('.')))}`
}

export type StorageConfig = {
  endPoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
  region: string
  bucket: string
}

export function storageConfig(): StorageConfig | null {
  const endPoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY_ID
  const secretKey = process.env.MINIO_SECRET_ACCESS_KEY
  if (!endPoint || !accessKey || !secretKey) return null
  const [host, portPart] = endPoint.includes('://') ? endPoint.replace(/^https?:\/\//, '').split(':') : endPoint.split(':')
  const useSSL = endPoint.startsWith('https://')
  return {
    endPoint: host,
    port: portPart ? Number(portPart) : useSSL ? 443 : 80,
    useSSL,
    accessKey,
    secretKey,
    region: process.env.MINIO_REGION || 'us-east-1',
    bucket: bucketName(),
  }
}