import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, lt, notInArray, or, sql } from 'drizzle-orm'
import { requireDb, safeDb } from './db-safe'
import {
  collectionPosts,
  collections,
  follows,
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
  formatPostDate,
  toFeedPost,
  toMemory,
  toPerson,
  toPersonDirectory,
  toPersonDirectoryMock,
  toProfileEdit,
  toSearchPerson,
  toSearchPost,
  type FeedPostView,
  type MemoryView,
  type PersonDirectoryView,
  type PostSearchResult,
  type PostTypeView,
  type ProfileEditView,
  type ProfileLink,
  type SearchResult,
} from './mappers'
import { mediaUrl } from './storage-config'
import { user as authUsers } from './auth-schema'
import { postTypeSpecs, type PostType } from './post-types'
import type { CreatePostInput, ListPostsQuery, SearchQuery, UpdatePostInput } from './validation/posts'
import type { UpdateProfileInput } from './validation/profile'
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

export class RateLimitError extends Error {
  readonly status = 429
  readonly availableAt: string | null
  constructor(message: string, availableAt: string | null = null) {
    super(message)
    this.availableAt = availableAt
  }
}

export const NAME_CHANGE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000

export function nameUnlockAt(changedAt: Date | string | null | undefined): string | null {
  if (!changedAt) return null
  const until = new Date(changedAt).getTime() + NAME_CHANGE_COOLDOWN_MS
  return until > Date.now() ? new Date(until).toISOString() : null
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

  const conditions = [
    eq(posts.status, 'published'),
    eq(posts.visibility, 'public'),
    notInArray(posts.authorId, db.select({ id: people.id }).from(people).where(isNotNull(people.disabledAt))),
  ]
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
  const rows = await db.select().from(people).where(isNull(people.disabledAt)).orderBy(people.slug)
  return rows.map(toPerson)
}

export async function listPeopleDirectory(viewerId: string | null): Promise<PersonDirectoryView[]> {
  const db = safeDb()
  if (!db) return mockPeople.map((person) => toPersonDirectoryMock(person))

  const rows = await db.select().from(people).where(isNull(people.disabledAt)).orderBy(people.slug)
  const ids = rows.map((row) => row.id)
  const [countRows, followRows] = ids.length
    ? await Promise.all([
        db
          .select({ followingId: follows.followingId, value: count() })
          .from(follows)
          .where(inArray(follows.followingId, ids))
          .groupBy(follows.followingId),
        viewerId
          ? db
              .select({ followingId: follows.followingId })
              .from(follows)
              .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, ids)))
          : Promise.resolve([] as { followingId: string }[]),
      ])
    : [[], [] as { followingId: string }[]]

  const counts = new Map(countRows.map((row) => [row.followingId, Number(row.value)]))
  const following = new Set(followRows.map((row) => row.followingId))
  return rows.map((row) =>
    toPersonDirectory(row, {
      followersCount: counts.get(row.id) ?? 0,
      following: following.has(row.id),
      isSelf: row.id === viewerId,
    }),
  )
}

export async function toggleFollow(slug: string, viewerId: string): Promise<{ following: boolean; followersCount: number }> {
  const db = requireDb()
  const [target] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.slug, slug), isNull(people.disabledAt)))
    .limit(1)
  if (!target) throw new NotFoundError('That profile does not exist')
  if (target.id === viewerId) throw new ForbiddenError('You cannot follow yourself')

  const existing = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, target.id)))
    .limit(1)

  if (existing.length) {
    await db.delete(follows).where(and(eq(follows.followerId, viewerId), eq(follows.followingId, target.id)))
  } else {
    await db.insert(follows).values({ followerId: viewerId, followingId: target.id }).onConflictDoNothing()
  }

  const [total] = await db.select({ value: count() }).from(follows).where(eq(follows.followingId, target.id))
  return { following: existing.length === 0, followersCount: Number(total?.value ?? 0) }
}

export async function getPersonBySlug(slug: string): Promise<PersonRow | null> {
  const db = safeDb()
  if (!db) return null
  const rows = await db.select().from(people).where(and(eq(people.slug, slug), isNull(people.disabledAt))).limit(1)
  return rows[0] ?? null
}

export async function getProfileEdit(personId: string): Promise<ProfileEditView | null> {
  const db = safeDb()
  if (!db) return null
  const rows = await db.select().from(people).where(eq(people.id, personId)).limit(1)
  return rows[0] ? toProfileEdit(rows[0]) : null
}

export async function updateProfile(personId: string, input: UpdateProfileInput, sessionId: string): Promise<ProfileEditView> {
  const db = requireDb()
  if (personId !== sessionId) throw new ForbiddenError('You can only edit your own profile')
  const [existing] = await db.select({ id: people.id }).from(people).where(eq(people.id, personId)).limit(1)
  if (!existing) throw new NotFoundError('That profile does not exist')

  const links: ProfileLink[] = input.links.filter((link) => link.label && link.url)

  const [updated] = await db
    .update(people)
    .set({
      role: input.role,
      location: input.location,
      statement: input.statement,
      bio: input.bio,
      accent: input.accent,
      tags: [...new Set(input.tags)],
      links,
      imageKey: input.imageKey,
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId))
    .returning()

  return toProfileEdit(updated)
}

export type AccountView = { name: string; nameLockedUntil: string | null }

export async function updateAccountName(personId: string, name: string): Promise<AccountView> {
  const db = requireDb()
  const [person] = await db.select().from(people).where(eq(people.id, personId)).limit(1)
  if (!person) throw new NotFoundError('That profile does not exist')

  const trimmed = name.trim()
  const lockedUntil = nameUnlockAt(person.nameChangedAt)
  if (trimmed === person.name) return { name: person.name, nameLockedUntil: lockedUntil }
  if (lockedUntil) {
    throw new RateLimitError('You can only change your name once every three days.', lockedUntil)
  }

  const now = new Date()
  await db.update(people).set({ name: trimmed, nameChangedAt: now, updatedAt: now }).where(eq(people.id, personId))
  if (person.userId) {
    await db.update(authUsers).set({ name: trimmed, updatedAt: now }).where(eq(authUsers.id, person.userId))
  }
  return { name: trimmed, nameLockedUntil: nameUnlockAt(now) }
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

  const author = authorRows[0]
  if (author?.disabledAt && post.authorId !== sessionId) {
    throw new NotFoundError('That entry does not exist')
  }

  await db.update(posts).set({ views: sql`${posts.views} + 1` }).where(eq(posts.id, post.id))

  return toFeedPost(
    post,
    author,
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
  return rows.map((row) => mediaUrl(row.media))
}

export async function getAuthoredPostsByType(authorId: string, types: PostType[], limit = 12): Promise<FeedPostView[]> {
  const db = requireDb()
  if (!types.length) return []
  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.authorId, authorId),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public'),
        inArray(posts.type, types),
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit)
  const hydrated = await hydrate(db, rows)
  return hydrated.posts
}

export async function getTopStarredPosts(authorId: string, limit = 3): Promise<FeedPostView[]> {
  const db = requireDb()
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.status, 'published'), eq(posts.visibility, 'public')))
    .orderBy(desc(posts.stars), desc(posts.createdAt))
    .limit(limit)
  const hydrated = await hydrate(db, rows)
  return hydrated.posts
}

export type ProfilePlaceView = { place: string; count: number }

export async function getProfilePlaces(authorId: string, limit = 10): Promise<ProfilePlaceView[]> {
  const db = requireDb()
  const rows = await db
    .select({ place: posts.place, total: count() })
    .from(posts)
    .where(
      and(
        eq(posts.authorId, authorId),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public'),
        isNotNull(posts.place),
      ),
    )
    .groupBy(posts.place)
    .orderBy(desc(count()))
    .limit(limit)
  return rows
    .map((row) => ({ place: (row.place ?? '').trim(), count: Number(row.total) }))
    .filter((row) => row.place)
}

export type ProfileTagView = { tag: string; count: number }

export async function getProfileTags(authorId: string, limit = 18): Promise<ProfileTagView[]> {
  const db = requireDb()
  const rows = await db
    .select({ tag: postTags.tag, total: count() })
    .from(postTags)
    .innerJoin(posts, eq(posts.id, postTags.postId))
    .where(and(eq(posts.authorId, authorId), eq(posts.status, 'published')))
    .groupBy(postTags.tag)
    .orderBy(desc(count()))
    .limit(limit)
  return rows.map((row) => ({ tag: row.tag, count: Number(row.total) }))
}

export type ProfilePeriodView = { period: string; count: number }

export async function getProfilePeriods(authorId: string): Promise<ProfilePeriodView[]> {
  const db = requireDb()
  const rows = await db
    .select({ createdAt: posts.createdAt })
    .from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.status, 'published')))
    .orderBy(asc(posts.createdAt))
  const buckets = new Map<string, number>()
  for (const row of rows) {
    const period = String(new Date(row.createdAt).getUTCFullYear())
    buckets.set(period, (buckets.get(period) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([period, count]) => ({ period, count }))
}

export type ProfileStats = {
  posts: number
  stars: number
  media: number
  shares: number
  views: number
  words: number
  since: string | null
  byType: { type: PostType; count: number }[]
}

export async function getProfileStats(authorId: string): Promise<ProfileStats> {
  const db = requireDb()
  const [postRows, starRows, mediaRows, totalsRows, typeRows, sinceRows] = await Promise.all([
    db.select({ value: count() }).from(posts).where(and(eq(posts.authorId, authorId), eq(posts.status, 'published'))),
    db.select({ value: sql<number>`coalesce(sum(${posts.stars}), 0)` }).from(posts).where(eq(posts.authorId, authorId)),
    db
      .select({ value: count() })
      .from(postMedia)
      .innerJoin(posts, eq(posts.id, postMedia.postId))
      .where(eq(posts.authorId, authorId)),
    db
      .select({
        views: sql<number>`coalesce(sum(${posts.views}), 0)`,
        shares: sql<number>`coalesce(sum(${posts.shares}), 0)`,
        words: sql<number>`coalesce(sum(array_length(regexp_split_to_array(btrim(${posts.body}), '\\s+'), 1)), 0)`,
      })
      .from(posts)
      .where(eq(posts.authorId, authorId)),
    db
      .select({ type: posts.type, value: count() })
      .from(posts)
      .where(and(eq(posts.authorId, authorId), eq(posts.status, 'published')))
      .groupBy(posts.type),
    db
      .select({ value: posts.createdAt })
      .from(posts)
      .where(eq(posts.authorId, authorId))
      .orderBy(asc(posts.createdAt))
      .limit(1),
  ])
  return {
    posts: postRows[0]?.value ?? 0,
    stars: Number(starRows[0]?.value ?? 0),
    media: mediaRows[0]?.value ?? 0,
    views: Number(totalsRows[0]?.views ?? 0),
    shares: Number(totalsRows[0]?.shares ?? 0),
    words: Number(totalsRows[0]?.words ?? 0),
    since: sinceRows[0]?.value ? new Date(sinceRows[0].value).toISOString() : null,
    byType: typeRows.map((row) => ({ type: row.type, count: Number(row.value) })),
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
        and(
          isNull(people.disabledAt),
          or(
            ilike(people.name, pattern),
            ilike(people.role, pattern),
            ilike(people.location, pattern),
            ilike(people.statement, pattern),
          ),
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
          notInArray(posts.authorId, db.select({ id: people.id }).from(people).where(isNotNull(people.disabledAt))),
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