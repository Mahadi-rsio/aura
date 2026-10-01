import type { FeedPostView, PostSearchResult, PostTypeView, ProfileEditView, SearchResult } from './mappers'
import type { CreatePostInput } from './validation/posts'
import type { UpdateProfileInput } from './validation/profile'

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
      const key = issue.path.length ? issue.path.map(String).join('.') : 'form'
      if (!map[key]) map[key] = issue.message
    }
    return map
  }
}

type ApiBody = { error?: string; issues?: ApiError['issues'] } & Record<string, unknown>

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

function jsonRequest(method: string, data: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }
}

async function parseBody(response: Response): Promise<ApiBody | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as ApiBody
  } catch {
    return null
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init })
  const body = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(response.status, body?.error || response.statusText || 'Something went wrong', body?.issues ?? [])
  }
  return body as T
}

export async function listPosts(params: { limit?: number; cursor?: string; type?: string; author?: string } = {}) {
  return request<{ posts: FeedPostView[]; nextCursor: string | null; hasMore: boolean }>(`/api/posts${buildQuery(params)}`)
}

export async function getPost(slug: string) {
  const body = await request<{ post: FeedPostView }>(`/api/posts/${encodeURIComponent(slug)}`)
  return body.post
}

export async function createPost(input: CreatePostInput) {
  const body = await request<{ post: FeedPostView }>('/api/posts', jsonRequest('POST', input))
  return body.post
}

export async function deletePost(slug: string) {
  await request(`/api/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
}

export async function toggleStar(id: string) {
  return request<{ starred: boolean; stars: number }>(`/api/posts/${encodeURIComponent(id)}/star`, { method: 'POST' })
}

export async function incrementShare(id: string) {
  return request<{ shares: number }>(`/api/posts/${encodeURIComponent(id)}/share`, { method: 'POST' })
}

export async function search(q: string) {
  return request<{ people: SearchResult[]; posts: PostSearchResult[] }>(`/api/search${buildQuery({ q })}`)
}

export function uploadImage(file: File, onProgress?: (percent: number) => void) {
  return new Promise<{ mediaId: string; url: string; key: string }>((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('altText', file.name)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.withCredentials = true
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }
    xhr.onload = () => {
      let body: ApiBody | null = null
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as ApiBody) : null
      } catch {
        body = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as { mediaId: string; url: string; key: string })
      } else {
        reject(new ApiError(xhr.status, body?.error || xhr.statusText || 'Could not upload the image', body?.issues ?? []))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, 'Could not reach the server'))
    xhr.send(form)
  })
}

export async function presignUpload(file: File, onProgress?: (percent: number) => void) {
  return uploadImage(file, onProgress)
}

export async function completeUpload(key: string, contentType: string, size: number, altText?: string) {
  return request<{ mediaId: string; url: string; key: string }>('/api/uploads/complete', jsonRequest('POST', { key, contentType, size, altText }))
}

export async function fetchPostTypes(): Promise<PostTypeView[]> {
  const { postTypeSpecs } = await import('./post-types')
  return postTypeSpecs
}

export async function fetchProfile() {
  const body = await request<{ profile: ProfileEditView }>('/api/profile')
  return body.profile
}

export async function updateProfile(input: UpdateProfileInput) {
  const body = await request<{ profile: ProfileEditView }>('/api/profile', jsonRequest('PATCH', input))
  return body.profile
}
