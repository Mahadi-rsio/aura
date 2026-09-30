import { create } from 'zustand'
import { postTypeByName, type PostType } from '@/lib/post-types'
import { completeUpload, createPost, presignUpload, ApiError, type FieldErrors } from '@/lib/client-api'
import type { FeedPostView } from '@/lib/mappers'

export type DraftMedia = {
  localId: string
  file: File | null
  key: string | null
  mediaId: string | null
  previewUrl: string
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  error: string | null
}

type DraftValues = {
  title: string
  body: string
  place: string
  occurredOn: string
  moodScore: number
  attribution: string
  tags: string
  visibility: 'public' | 'private'
}

const emptyValues: DraftValues = {
  title: '',
  body: '',
  place: '',
  occurredOn: '',
  moodScore: 5,
  attribution: '',
  tags: '',
  visibility: 'public',
}

const DRAFT_KEY = 'aura-composer-draft'

type ComposerState = {
  type: PostType
  values: DraftValues
  media: DraftMedia[]
  fieldErrors: FieldErrors
  formError: string | null
  submitting: boolean
  setType: (type: PostType) => void
  setValue: <K extends keyof DraftValues>(key: K, value: DraftValues[K]) => void
  addFiles: (files: File[]) => void
  removeMedia: (localId: string) => void
  retryUpload: (localId: string) => Promise<void>
  submit: () => Promise<FeedPostView | null>
  restore: () => void
  reset: () => void
  clearError: () => void
}

function previewFor(file: File) {
  return typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : ''
}

export const useComposerStore = create<ComposerState>((set, get) => ({
  type: 'memory',
  values: { ...emptyValues },
  media: [],
  fieldErrors: {},
  formError: null,
  submitting: false,

  setType: (type) => set({ type, fieldErrors: {}, formError: null }),

  setValue: (key, value) =>
    set((state) => ({
      values: { ...state.values, [key]: value },
      fieldErrors: { ...state.fieldErrors, [key]: '' },
      formError: null,
    })),

  addFiles: (files) => {
    const spec = postTypeByName[get().type]
    const current = get().media
    const room = Math.max(0, spec.maxImages - current.length)
    const accepted = files.filter((file) => file.type.startsWith('image/')).slice(0, room)
    if (!accepted.length) {
      set({ formError: spec.allowsImages ? 'That type cannot take any more images' : `A ${get().type} cannot carry images` })
      return
    }
    const added: DraftMedia[] = accepted.map((file) => ({
      localId: globalThis.crypto.randomUUID(),
      file,
      key: null,
      mediaId: null,
      previewUrl: previewFor(file),
      progress: 0,
      status: 'queued',
      error: null,
    }))
    set((state) => ({ media: [...state.media, ...added], formError: null }))
    for (const item of added) void get().retryUpload(item.localId)
  },

  removeMedia: (localId) =>
    set((state) => ({ media: state.media.filter((item) => item.localId !== localId) })),

  retryUpload: async (localId) => {
    const item = get().media.find((entry) => entry.localId === localId)
    if (!item?.file) return
    set((state) => ({
      media: state.media.map((entry) => (entry.localId === localId ? { ...entry, status: 'uploading', progress: 0, error: null } : entry)),
    }))
    try {
      const presigned = await presignUpload(item.file, (percent) => {
        set((state) => ({
          media: state.media.map((entry) => (entry.localId === localId ? { ...entry, progress: percent } : entry)),
        }))
      })
      const completed = await completeUpload(presigned.key, item.file.type, item.file.size, item.file.name)
      set((state) => ({
        media: state.media.map((entry) =>
          entry.localId === localId
            ? { ...entry, key: presigned.key, mediaId: completed.mediaId, progress: 100, status: 'done', error: null }
            : entry,
        ),
      }))
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'That image did not upload'
      set((state) => ({
        media: state.media.map((entry) => (entry.localId === localId ? { ...entry, status: 'error', error: message } : entry)),
      }))
    }
  },

  submit: async () => {
    const state = get()
    if (state.submitting) return null
    const spec = postTypeByName[state.type]

    const pending = state.media.filter((item) => item.status === 'uploading' || item.status === 'queued')
    if (pending.length) {
      set({ formError: 'Wait for the images to finish uploading' })
      return null
    }
    const failed = state.media.find((item) => item.status === 'error')
    if (failed) {
      set({ formError: failed.error ?? 'One of the images did not upload. Retry it or remove it.' })
      return null
    }

    set({ submitting: true, fieldErrors: {}, formError: null })
    try {
      const post = await createPost({
        type: state.type,
        title: state.values.title,
        body: state.values.body,
        mediaIds: state.media.map((item) => item.mediaId).filter((id): id is string => Boolean(id)),
        place: state.values.place || undefined,
        occurredOn: state.values.occurredOn || undefined,
        moodScore: spec.fields.includes('moodScore') ? state.values.moodScore : undefined,
        attribution: state.values.attribution || undefined,
        tags: state.values.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility: state.values.visibility,
      })
      get().reset()
      return post
    } catch (error) {
      if (error instanceof ApiError) {
        set({ fieldErrors: error.fieldErrors, formError: error.status === 422 ? 'Some details are still missing' : error.message })
      } else {
        set({ formError: 'Could not publish that entry' })
      }
      return null
    } finally {
      set({ submitting: false })
    }
  },

  restore: () => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { type?: PostType; values?: Partial<DraftValues> }
      set({ type: parsed.type ?? 'memory', values: { ...emptyValues, ...parsed.values } })
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    }
  },

  reset: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(DRAFT_KEY)
    set({ type: 'memory', values: { ...emptyValues }, media: [], fieldErrors: {}, formError: null, submitting: false })
  },

  clearError: () => set({ fieldErrors: {}, formError: null }),
}))

if (typeof window !== 'undefined') {
  useComposerStore.subscribe((state) => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ type: state.type, values: state.values }))
    } catch {
      /* storage is full or blocked; the draft is a convenience, not a requirement */
    }
  })
}