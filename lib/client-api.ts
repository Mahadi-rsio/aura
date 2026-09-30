import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { FeedPostView, PostSearchResult, PostTypeView, SearchResult } from './mappers'
import type { CreatePostInput } from './validation/posts'

export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  readonly issues: { path: (string | number)[]; message: string; code: string }[]

  constructor(status: number, message: string, issues: ApiError['issues'] = []) {
    super(message)
    this.status = status
    this.issues = issues
  }

  get fieldErrors(): FieldErrors {
    const map: FieldErrors = {}
    for (const issue of this.issues) {
      const key = String(issue.path[0] ?? 'form')
      if (!map[key]) map[key] = issue.message
    }
    return map
  }
}

const client: AxiosInstance = axios.create({ withCredentials: true })

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; issues?: ApiError['issues'] }>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data
    throw new ApiError(status, body?.error || error.message || 'Something went wrong', body?.issues ?? [])
  },
)

export async function listPosts(params: { limit?: number; cursor?: string; type?: string; author?: string } = {}) {
  const response = await client.get<{ posts: FeedPostView[]; nextCursor: string | null; hasMore: boolean }>('/api/posts', { params })
  return response.data
}

export async function getPost(slug: string) {
  const response = await client.get<{ post: FeedPostView }>(`/api/posts/${slug}`)
  return response.data.post
}

export async function createPost(input: CreatePostInput) {
  const response = await client.post<{ post: FeedPostView }>('/api/posts', input)
  return response.data.post
}

export async function deletePost(slug: string) {
  await client.delete(`/api/posts/${slug}`)
}

export async function toggleStar(id: string) {
  const response = await client.post<{ starred: boolean; stars: number }>(`/api/posts/${id}/star`)
  return response.data
}

export async function incrementShare(id: string) {
  const response = await client.post<{ shares: number }>(`/api/posts/${id}/share`)
  return response.data
}

export async function search(q: string) {
  const response = await client.get<{ people: SearchResult[]; posts: PostSearchResult[] }>('/api/search', { params: { q } })
  return response.data
}

export async function uploadImage(file: File, onProgress?: (percent: number) => void) {
  const form = new FormData()
  form.append('file', file)
  form.append('altText', file.name)

  const response = await client.post<{ mediaId: string; url: string; key: string }>('/api/uploads', form, {
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    },
  })
  return response.data
}

export async function presignUpload(file: File, onProgress?: (percent: number) => void) {
  return uploadImage(file, onProgress)
}

export async function completeUpload(key: string, contentType: string, size: number, altText?: string) {
  const response = await client.post<{ mediaId: string; url: string; key: string }>('/api/uploads/complete', {
    key,
    contentType,
    size,
    altText,
  })
  return response.data
}

export async function fetchPostTypes(): Promise<PostTypeView[]> {
  const { postTypeSpecs } = await import('./post-types')
  return postTypeSpecs
}

export { client }