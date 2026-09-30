import { z } from 'zod'
import { postTypeByName, postTypes } from '../post-types'

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const baseFields = {
  type: z.enum(postTypes, { message: 'Choose one of the 8 entry types' }),
  title: z.string().trim().min(1, 'Title is required').max(140, 'Title must be 140 characters or fewer'),
  body: z.string().trim().min(1, 'Body is required').max(8000, 'Body must be 8000 characters or fewer'),
  mediaIds: z.array(z.string()).max(10, 'An album can hold at most 10 images').default([]),
  place: z.string().trim().max(120, 'Place is too long').optional(),
  occurredOn: z
    .string()
    .regex(datePattern, 'Date must look like YYYY-MM-DD')
    .optional(),
  moodScore: z.number().int().min(1, 'Mood intensity must be between 1 and 10').max(10, 'Mood intensity must be between 1 and 10').optional(),
  attribution: z.string().trim().max(120, 'Attribution is too long').optional(),
  tags: z.array(z.string().trim().min(1).max(32, 'Tags must be 32 characters or fewer')).max(10, 'At most 10 tags').default([]),
  visibility: z.enum(['public', 'private']).default('public'),
}

function imageRules(type: (typeof postTypes)[number], mediaIds: string[] | undefined) {
  const spec = postTypeByName[type]
  const count = mediaIds?.length ?? 0
  if (!spec.allowsImages && count > 0) {
    return { ok: false as const, message: `A ${type} cannot carry images` }
  }
  if (count < spec.minImages) {
    return { ok: false as const, message: spec.minImages > 1 ? `An ${type} needs at least ${spec.minImages} images` : `A ${type} needs at least ${spec.minImages} image` }
  }
  if (count > spec.maxImages) {
    return { ok: false as const, message: `A ${type} can hold at most ${spec.maxImages} image${spec.maxImages === 1 ? '' : 's'}` }
  }
  return { ok: true as const }
}

const perTypeRules: Record<(typeof postTypes)[number], (value: { moodScore?: number; mediaIds?: string[] }) => string | null> = {
  feeling: (value) => (value.moodScore === undefined ? 'Feeling entries need an intensity' : null),
  mood: (value) => (value.moodScore === undefined ? 'Mood entries need an intensity' : null),
  memory: () => null,
  achievement: () => null,
  album: () => null,
  quote: () => null,
  poem: () => null,
  note: () => null,
}

const postObject = z.object(baseFields)

type PostValue = Partial<z.infer<typeof postObject>>

function refinePost(value: PostValue, ctx: z.RefinementCtx, partial: boolean) {
  if (value.type) {
    const imageRule = imageRules(value.type, value.mediaIds)
    if (!imageRule.ok && !partial) {
      ctx.addIssue({ code: 'custom', path: ['mediaIds'], message: imageRule.message })
    }
    if (!partial) {
      const missing = perTypeRules[value.type](value)
      if (missing) ctx.addIssue({ code: 'custom', path: ['moodScore'], message: missing })
    }
    if (value.type !== 'quote' && value.attribution) {
      ctx.addIssue({ code: 'custom', path: ['attribution'], message: 'Only a quote can carry an attribution' })
    }
    if (value.moodScore !== undefined && value.type !== 'mood' && value.type !== 'feeling') {
      ctx.addIssue({ code: 'custom', path: ['moodScore'], message: 'Only a mood or feeling carries an intensity' })
    }
    if (value.mediaIds && value.mediaIds.length && !postTypeByName[value.type].allowsImages) {
      ctx.addIssue({ code: 'custom', path: ['mediaIds'], message: `A ${value.type} cannot carry images` })
    }
  }
}

export const createPostSchema = postObject.superRefine((value, ctx) => refinePost(value, ctx, false))

const updatePostObject = postObject.partial()

export const updatePostSchema = updatePostObject.superRefine((value, ctx) => refinePost(value, ctx, true))

export const listPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().optional(),
  type: z.enum(postTypes).optional(),
  author: z.string().max(120).optional(),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Enter something to search for').max(120, 'Search is limited to 120 characters'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const postTypeCatalogSchema = z.object({
  type: z.enum(postTypes),
  label: z.string().min(1),
  blurb: z.string().default(''),
  icon: z.string().default(''),
  kind: z.enum(['image', 'literary']),
  allowsImages: z.boolean(),
  minImages: z.number().int().nonnegative(),
  maxImages: z.number().int().nonnegative(),
  requiredFields: z.array(z.string()).default([]),
  fields: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>