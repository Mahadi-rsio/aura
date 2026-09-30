import { and, count, desc, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm'
import { requireDb, safeDb } from './db-safe'
import {
  collectionPosts,
  collections,
  media,
  people,
  postMedia,
  postStars,
  postTags,
  postTypes,
  posts,
  type MediaRow,
  type PersonRow,
  type PostRow,
} from './schema'
import { feedPosts, people as mockPeople, type FeedPost } from './people'
import {
  toFeedPost,
  toMemory,
  toPerson,
  toSearchPerson,
  toSearchPost,
  type FeedPostView,
  type MemoryView,
  type PostSearchResult,
  type PostTypeView,
  type SearchResult,
} from './mappers'
import { mediaUrl } from './storage-config'
import { postTypeSpecs } from './post-types'
import type { CreatePostInput, ListPostsQuery, SearchQuery, UpdatePostInput } from './validation/posts'
import type { Person } from './people'

export class NotFoundError extends Error {
  readonly status = 404
  constructor(message = 'Not found') {
    super(message)
  }
}

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(message = 'You do not own this post') {
    super(message)
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80)
}

async function uniqueSlug(title: string, excludeId?: string) {
  const db = requireDb()
  const base = slugify(title) || 'entry'
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    const rows = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, candidate)).limit(1)
    if (!rows.length || rows[0].id === excludeId) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

export type FeedPage = {
  posts: FeedPostView[]
  nextCursor: string | null
  hasMore: boolean
}

export async function listFeedPage(query: ListPostsQuery = { limit: 12 }, sessionId?: string | null): Promise<FeedPage> {
  const db = safeDb()
  if (!db) return mockFeedPage(query)

  const conditions = [eq(posts.status, 'published'), eq(posts.visibility, 'public')]
  if (query.type) conditions.push(eq(posts.type, query.type))
  if (query.cursor) {
    const cursorDate = new Date(query.cursor)
    if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(posts.createdAt, cursorDate))
  }

  const rows = await db
    .select()
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(query.limit + 1)

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const hydrated = await hydrate(db, page, sessionId, hasMore)

  if (query.author) {
    const authorSlug = query.author
    return { ...hydrated, posts: hydrated.posts.filter((post) => post.authorSlug === authorSlug) }
  }
  return hydrated
}

async function hydrate(
  db: NonNullable<ReturnType<typeof safeDb>>,
  page: PostRow[],
  sessionId?: string | null,
  hasMore = false,
) {
  if (!page.length) return { posts: [] as FeedPostView[], nextCursor: null as string | null, hasMore: false }
  const postIds = page.map((row) => row.id)
  const authorIds = [...new Set(page.map((row) => row.authorId))]

  const [authorRows, mediaRows, tagRows, starRows] = await Promise.all([
    db.select().from(people).where(inArray(people.id, authorIds)),
    db
      .select({ postId: postMedia.postId, position: postMedia.position, media: media })
      .from(postMedia)
      .innerJoin(media, eq(media.id, postMedia.mediaId))
      .where(inArray(postMedia.postId, postIds))
      .orderBy(postMedia.position),
    db.select().from(postTags).where(inArray(postTags.postId, postIds)),
    sessionId
      ? db.select({ postId: postStars.postId }).from(postStars).where(and(inArray(postStars.postId, postIds), eq(postStars.sessionId, sessionId)))
      : Promise.resolve([]),
  ])

  const authorById = new Map(authorRows.map((row) => [row.id, row]))
  const starredIds = new Set(starRows.map((row) => row.postId))

  const mediaByPost = new Map<string, MediaRow[]>()
  for (const row of mediaRows) {
    const list = mediaByPost.get(row.postId) ?? []
    list.push(row.media)
    mediaByPost.set(row.postId, list)
  }

  const tagsByPost = new Map<string, string[]>()
  for (const row of tagRows) {
    const list = tagsByPost.get(row.postId) ?? []
    list.push(row.tag)
    tagsByPost.set(row.postId, list)
  }

  return {
    posts: page.map((row) =>
      toFeedPost(
        row,
        authorById.get(row.authorId),
        mediaByPost.get(row.id) ?? [],
        tagsByPost.get(row.id) ?? [],
        starredIds.has(row.id),
      ),
    ),
    nextCursor: page.length ? new Date(page[page.length - 1].createdAt).toISOString() : null,
    hasMore: hasMore,
  }
}

function mockFeedPage(query: ListPostsQuery): FeedPage {
  let list: FeedPost[] = [...feedPosts]
  if (query.type) list = list.filter((post) => post.type === query.type)
  if (query.author) list = list.filter((post) => post.authorSlug === query.author)
  if (query.cursor) list = list.slice(1)
  const page = list.slice(0, query.limit)
  return {
    posts: page.map((post) => ({
      ...post,
      slug: post.slug ?? post.id,
      authorId: post.authorSlug,
      place: post.eyebrow.split('/')[1]?.trim() || null,
      occurredOn: null,
      moodScore: post.type === 'feeling' ? 7 : post.type === 'mood' ? 4 : null,
      attribution: post.type === 'quote' ? post.body : null,
      tags: [],
      mediaIds: [],
      starred: false,
      viewsCount: post.viewsCount ?? 0,
      starsCount: post.starsCount ?? 0,
      sharesCount: post.sharesCount ?? 0,
    })),
    nextCursor: list.length > page.length ? page[page.length - 1].id : null,
    hasMore: list.length > page.length,
  }
}

export async function listPeople(): Promise<Person[]> {
  const db = safeDb()
  if (!db) return mockPeople
  const rows = await db.select().from(people).orderBy(people.slug)
  return rows.map(toPerson)
}

export async function getPersonBySlug(slug: string): Promise<PersonRow | null> {
  const db = safeDb()
  if (!db) return null
  const rows = await db.select().from(people).where(eq(people.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getPostBySlug(slug: string, sessionId?: string | null): Promise<FeedPostView> {
  const db = safeDb()
  if (!db) {
    const mock = feedPosts.find((post) => (post.slug ?? post.id) === slug)
    if (!mock) throw new NotFoundError('That entry does not exist')
    return {
      ...mock,
      slug: mock.slug ?? mock.id,
      authorId: mock.authorSlug,
      place: mock.eyebrow.split('/')[1]?.trim() || null,
      occurredOn: null,
      moodScore: mock.type === 'feeling' ? 7 : mock.type === 'mood' ? 4 : null,
      attribution: mock.type === 'quote' ? mock.body : null,
      tags: [],
      mediaIds: [],
      starred: false,
      viewsCount: mock.viewsCount ?? 0,
      starsCount: mock.starsCount ?? 0,
      sharesCount: mock.sharesCount ?? 0,
    }
  }

  const rows = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)
  const post = rows[0]
  if (!post || post.status !== 'published') throw new NotFoundError('That entry does not exist')
  if (post.visibility !== 'public' && post.authorId !== sessionId) {
    throw new NotFoundError('That entry does not exist')
  }

  const [authorRows, mediaRows, tagRows, starRows] = await Promise.all([
    db.select().from(people).where(eq(people.id, post.authorId)).limit(1),
    db
      .select({ media: media })
      .from(postMedia)
      .innerJoin(media, eq(media.id, postMedia.mediaId))
      .where(eq(postMedia.postId, post.id))
      .orderBy(postMedia.position),
    db.select().from(postTags).where(eq(postTags.postId, post.id)),
    sessionId ? db.select({ postId: postStars.postId }).from(postStars).where(and(eq(postStars.postId, post.id), eq(postStars.sessionId, sessionId))) : Promise.resolve([]),
  ])

  await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, post.id))

  return toFeedPost(
    post,
    authorRows[0],
    mediaRows.map((row) => row.media),
    tagRows.map((row) => row.tag),
    starRows.length > 0,
  )
}

export async function getAuthoredPosts(
  authorId: string,
  limit = 50,
  scope: 'public' | 'own' = 'public',
): Promise<FeedPostView[]> {
  const db = requireDb()
  const conditions =
    scope === 'own'
      ? [eq(posts.authorId, authorId)]
      : [eq(posts.authorId, authorId), eq(posts.status, 'published'), eq(posts.visibility, 'public')]

  const rows = await db
    .select()
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
  const hydrated = await hydrate(db, rows)
  return hydrated.posts
}

export async function getMemoryPosts(authorId: string): Promise<MemoryView[]> {
  const db = requireDb()
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.type, 'memory'), eq(posts.status, 'published')))
    .orderBy(desc(posts.createdAt))
    .limit(12)
  if (!rows.length) return []
  const [authorRows, mediaRows] = await Promise.all([
    db.select().from(people).where(eq(people.id, authorId)).limit(1),
    db
      .select({ postId: postMedia.postId, media: media })
      .from(postMedia)
      .innerJoin(media, eq(media.id, postMedia.mediaId))
      .where(inArray(postMedia.postId, rows.map((row) => row.id)))
      .orderBy(postMedia.position),
  ])
  const mediaByPost = new Map<string, MediaRow[]>()
  for (const row of mediaRows) {
    const list = mediaByPost.get(row.postId) ?? []
    list.push(row.media)
    mediaByPost.set(row.postId, list)
  }
  return rows.map((row) => toMemory(row, mediaByPost.get(row.id) ?? [], authorRows[0]))
}

export async function getGalleryImages(authorId: string, limit = 12): Promise<string[]> {
  const db = requireDb()
  const rows = await db
    .select({ media: media })
    .from(postMedia)
    .innerJoin(media, eq(media.id, postMedia.mediaId))
    .innerJoin(posts, eq(posts.id, postMedia.postId))
    .where(
      and(
        eq(posts.authorId, authorId),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public'),
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit)
  const urls = rows.map((row) => mediaUrl(row.media))
  return urls.length ? urls : ['/images/portrait.png']
}

export type ProfileStats = {
  posts: number
  stars: number
  media: number
}

export async function getProfileStats(authorId: string): Promise<ProfileStats> {
  const db = requireDb()
  const [postRows, starRows, mediaRows] = await Promise.all([
    db.select({ value: count() }).from(posts).where(and(eq(posts.authorId, authorId), eq(posts.status, 'published'))),
    db.select({ value: sql<number>`coalesce(sum(${posts.stars}), 0)` }).from(posts).where(eq(posts.authorId, authorId)),
    db
      .select({ value: count() })
      .from(postMedia)
      .innerJoin(posts, eq(posts.id, postMedia.postId))
      .where(eq(posts.authorId, authorId)),
  ])
  return {
    posts: postRows[0]?.value ?? 0,
    stars: Number(starRows[0]?.value ?? 0),
    media: mediaRows[0]?.value ?? 0,
  }
}

export type CollectionView = {
  id: string
  name: string
  slug: string
  blurb: string
  postCount: number
}

export async function getCollections(ownerId: string): Promise<CollectionView[]> {
  const db = requireDb()
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      blurb: collections.blurb,
      postCount: count(collectionPosts.postId),
    })
    .from(collections)
    .leftJoin(collectionPosts, eq(collectionPosts.collectionId, collections.id))
    .where(eq(collections.ownerId, ownerId))
    .groupBy(collections.id)
    .orderBy(collections.createdAt)
  return rows
}

export async function getPostTypeCatalog(): Promise<PostTypeView[]> {
  const db = safeDb()
  if (!db) return postTypeSpecs
  const rows = await db.select().from(postTypes).orderBy(postTypes.sortOrder)
  return rows.length ? rows : postTypeSpecs
}

export async function searchAll(query: SearchQuery): Promise<{ people: SearchResult[]; posts: PostSearchResult[] }> {
  const db = safeDb()
  if (!db) {
    const needle = query.q.toLowerCase()
    return {
      people: mockPeople
        .filter((person) => [person.name, person.role, person.location, ...person.tags].join(' ').toLowerCase().includes(needle))
        .slice(0, query.limit)
        .map((person) => ({
          slug: person.slug,
          name: person.name,
          role: person.role,
          location: person.location,
          statement: person.statement,
          image: person.image,
          accent: person.accent,
          tags: person.tags,
        })),
      posts: feedPosts
        .filter((post) => [post.title, post.body, post.author, post.type, post.eyebrow].join(' ').toLowerCase().includes(needle))
        .slice(0, query.limit)
        .map((post) => ({
          id: post.id,
          slug: post.slug ?? post.id,
          type: post.type,
          title: post.title,
          body: post.body,
          date: post.date,
          author: post.author,
          authorSlug: post.authorSlug,
        })),
    }
  }

  const pattern = `%${query.q}%`
  const [peopleRows, postRows] = await Promise.all([
    db
      .select()
      .from(people)
      .where(
        or(
          ilike(people.name, pattern),
          ilike(people.role, pattern),
          ilike(people.location, pattern),
          ilike(people.statement, pattern),
        ),
      )
      .limit(query.limit),
    db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.status, 'published'),
          eq(posts.visibility, 'public'),
          or(ilike(posts.title, pattern), ilike(posts.body, pattern), ilike(posts.eyebrow, pattern)),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(query.limit),
  ])

  const authorIds = [...new Set(postRows.map((row) => row.authorId))]
  const authorRows = authorIds.length ? await db.select().from(people).where(inArray(people.id, authorIds)) : []
  const authorById = new Map(authorRows.map((row) => [row.id, row]))

  return {
    people: peopleRows.map(toSearchPerson),
    posts: postRows.map((row) => toSearchPost(row, authorById.get(row.authorId))),
  }
}

export async function createPost(input: CreatePostInput, authorId: string): Promise<FeedPostView> {
  const db = requireDb()
  const slug = await uniqueSlug(input.title)
  const now = new Date()
  const body = input.body

  const postRows = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(posts)
      .values({
        slug,
        authorId,
        type: input.type,
        title: input.title,
        body,
        eyebrow: null,
        place: input.place ?? null,
        occurredOn: input.occurredOn ?? null,
        moodScore: input.moodScore ?? null,
        attribution: input.type === 'quote' ? input.attribution ?? null : null,
        visibility: input.visibility,
        status: 'published',
        publishedAt: now,
      })
      .returning()
    const insertedPost = inserted[0]

    if (input.mediaIds.length) {
      await tx
        .insert(postMedia)
        .values(input.mediaIds.map((mediaId, position) => ({ postId: insertedPost.id, mediaId, position })))
        .onConflictDoNothing()
    }
    if (input.tags.length) {
      await tx
        .insert(postTags)
        .values([...new Set(input.tags)].map((tag) => ({ postId: insertedPost.id, tag })))
        .onConflictDoNothing()
    }
    return inserted
  })

  const [authorRows, mediaRows, tagRows] = await Promise.all([
    db.select().from(people).where(eq(people.id, authorId)).limit(1),
    input.mediaIds.length
      ? db
          .select({ media: media })
          .from(postMedia)
          .innerJoin(media, eq(media.id, postMedia.mediaId))
          .where(eq(postMedia.postId, postRows[0].id))
          .orderBy(postMedia.position)
      : Promise.resolve([]),
    db.select().from(postTags).where(eq(postTags.postId, postRows[0].id)),
  ])

  return toFeedPost(postRows[0], authorRows[0], mediaRows.map((row) => row.media), tagRows.map((row) => row.tag), false)
}

async function findOwnedPost(slug: string, sessionId: string) {
  const db = requireDb()
  const rows = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)
  const post = rows[0]
  if (!post) throw new NotFoundError('That entry does not exist')
  if (post.authorId !== sessionId) throw new ForbiddenError()
  return post
}

export async function updatePost(slug: string, input: UpdatePostInput, sessionId: string): Promise<FeedPostView> {
  const db = requireDb()
  const existing = await findOwnedPost(slug, sessionId)

  const newSlug = input.title !== undefined ? await uniqueSlug(input.title, existing.id) : existing.slug

  await db
    .update(posts)
    .set({
      ...(input.title !== undefined ? { title: input.title, slug: newSlug } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.place !== undefined ? { place: input.place || null } : {}),
      ...(input.occurredOn !== undefined ? { occurredOn: input.occurredOn || null } : {}),
      ...(input.moodScore !== undefined ? { moodScore: input.moodScore ?? null } : {}),
      ...(input.attribution !== undefined ? { attribution: input.attribution || null } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, existing.id))

  if (input.mediaIds) {
    await db.delete(postMedia).where(eq(postMedia.postId, existing.id))
    if (input.mediaIds.length) {
      await db
        .insert(postMedia)
        .values(input.mediaIds.map((mediaId, position) => ({ postId: existing.id, mediaId, position })))
        .onConflictDoNothing()
    }
  }
  if (input.tags) {
    await db.delete(postTags).where(eq(postTags.postId, existing.id))
    const tags = [...new Set(input.tags)]
    if (tags.length) {
      await db.insert(postTags).values(tags.map((tag) => ({ postId: existing.id, tag }))).onConflictDoNothing()
    }
  }

  return getPostBySlug(newSlug, sessionId)
}

export async function deletePost(slug: string, sessionId: string) {
  const db = requireDb()
  const existing = await findOwnedPost(slug, sessionId)
  await db.delete(posts).where(eq(posts.id, existing.id))
}

export async function toggleStar(postId: string, sessionId: string): Promise<{ starred: boolean; stars: number }> {
  const db = requireDb()
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1)
  if (!post || post.status !== 'published' || post.visibility !== 'public') {
    throw new NotFoundError('That entry does not exist')
  }

  const existing = await db
    .select()
    .from(postStars)
    .where(and(eq(postStars.postId, postId), eq(postStars.sessionId, sessionId)))
    .limit(1)

  if (existing.length) {
    await db.delete(postStars).where(and(eq(postStars.postId, postId), eq(postStars.sessionId, sessionId)))
  } else {
    await db.insert(postStars).values({ postId, sessionId }).onConflictDoNothing()
  }

  const [total] = await db.select({ value: count() }).from(postStars).where(eq(postStars.postId, postId))
  const stars = total?.value ?? 0
  await db.update(posts).set({ stars }).where(eq(posts.id, postId))
  return { starred: !existing.length, stars }
}

export async function incrementShare(postId: string): Promise<{ shares: number }> {
  const db = requireDb()
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1)
  if (!post || post.status !== 'published' || post.visibility !== 'public') {
    throw new NotFoundError('That entry does not exist')
  }
  await db.update(posts).set({ shares: sql`${posts.shares} + 1` }).where(eq(posts.id, postId))
  const [updated] = await db.select({ shares: posts.shares }).from(posts).where(eq(posts.id, postId)).limit(1)
  return { shares: updated?.shares ?? post.shares + 1 }
}