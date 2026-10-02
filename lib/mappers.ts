import type { FeedPost, Person } from './people'
import type { MediaRow, PersonRow, PostRow } from './schema'
import { mediaUrl } from './storage-config'

export function compactCount(value: number | null | undefined) {
  const count = Math.max(0, Number(value ?? 0))
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { month: '2-digit', year: '2-digit' })

export function formatMonthYear(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return dateFormatter.format(date).replace('/', '.')
}

export function formatPostDate(row: Pick<PostRow, 'createdAt' | 'occurredOn'>) {
  if (row.occurredOn) return formatMonthYear(`${row.occurredOn}T00:00:00.000Z`)
  const created = new Date(row.createdAt)
  const today = new Date()
  const sameDay = created.toDateString() === today.toDateString()
  if (sameDay) return 'Today'
  return formatMonthYear(created)
}

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    location: row.location,
    statement: row.statement,
    image: row.imageKey ? mediaUrl({ objectKey: row.imageKey, publicPath: null }) : '/images/portrait.png',
    accent: row.accent,
    tags: row.tags ?? [],
    views: compactCount(row.views),
    stars: compactCount(row.stars),
    shares: compactCount(row.shares),
  }
}

export type PersonDirectoryView = {
  id: string
  slug: string
  name: string
  role: string
  location: string
  statement: string
  image: string
  accent: string
  tags: string[]
  followers: string
  followersCount: number
  following: boolean
  isSelf: boolean
}

type DirectoryOptions = { followersCount?: number; following?: boolean; isSelf?: boolean }

export function toPersonDirectory(row: PersonRow, { followersCount = 0, following = false, isSelf = false }: DirectoryOptions = {}): PersonDirectoryView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    location: row.location,
    statement: row.statement,
    image: row.imageKey ? mediaUrl({ objectKey: row.imageKey, publicPath: null }) : '/images/portrait.png',
    accent: row.accent,
    tags: row.tags ?? [],
    followers: compactCount(followersCount),
    followersCount,
    following,
    isSelf,
  }
}

export function toPersonDirectoryMock(person: Person, { followersCount = 0, following = false, isSelf = false }: DirectoryOptions = {}): PersonDirectoryView {
  return {
    id: person.id ?? person.slug,
    slug: person.slug,
    name: person.name,
    role: person.role,
    location: person.location,
    statement: person.statement,
    image: person.image,
    accent: person.accent,
    tags: person.tags,
    followers: compactCount(followersCount),
    followersCount,
    following,
    isSelf,
  }
}

export type ProfileEditView = {
  id: string
  slug: string
  name: string
  role: string
  location: string
  statement: string
  bio: string
  accent: string
  tags: string[]
  links: ProfileLink[]
  imageKey: string | null
  image: string
  joined: string
}

export type ProfileLink = { label: string; url: string }

/**
 * `people.links` moved from a `{ label: url }` record to a `ProfileLink[]`
 * array so ordering is preserved. Rows written before that change still hold
 * the record shape, so every reader normalises through here.
 */
export function normalizeProfileLinks(value: unknown): ProfileLink[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (Array.isArray(entry)) {
        const [label, url] = entry
        return typeof label === 'string' && typeof url === 'string' ? [{ label, url }] : []
      }
      if (entry && typeof entry === 'object') {
        const { label, url } = entry as Partial<ProfileLink>
        return typeof label === 'string' && typeof url === 'string' ? [{ label, url }] : []
      }
      return []
    })
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ).map(([label, url]) => ({ label, url }))
  }
  return []
}

export function toProfileEdit(row: PersonRow): ProfileEditView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    location: row.location,
    statement: row.statement,
    bio: row.bio,
    accent: row.accent,
    tags: row.tags ?? [],
    links: normalizeProfileLinks(row.links),
    imageKey: row.imageKey,
    image: row.imageKey ? mediaUrl({ objectKey: row.imageKey, publicPath: null }) : '/images/portrait.png',
    joined: formatMonthYear(row.createdAt),
  }
}

export type FeedPostView = FeedPost & {
  slug: string
  authorId: string
  place: string | null
  occurredOn: string | null
  moodScore: number | null
  attribution: string | null
  tags: string[]
  mediaIds: string[]
  starred: boolean
  viewsCount: number
  starsCount: number
  sharesCount: number
}

export function toFeedPost(
  row: PostRow,
  author: PersonRow | undefined,
  media: MediaRow[] = [],
  tags: string[] = [],
  starred = false,
): FeedPostView {
  const images = media.map((item) => mediaUrl(item))
  const eyebrow = row.eyebrow || defaultEyebrow(row, author)
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    images: images.length ? images : undefined,
    author: author?.name ?? 'Unknown',
    authorSlug: author?.slug ?? '',
    authorId: row.authorId,
    image: images[0] ?? (author?.imageKey ? mediaUrl({ objectKey: author.imageKey, publicPath: null }) : ''),
    eyebrow,
    title: row.title,
    body: row.body,
    date: formatPostDate(row),
    views: compactCount(row.views),
    stars: compactCount(row.stars),
    shares: compactCount(row.shares),
    place: row.place,
    occurredOn: row.occurredOn,
    moodScore: row.moodScore,
    attribution: row.attribution,
    tags,
    mediaIds: media.map((item) => item.id),
    starred,
    viewsCount: row.views,
    starsCount: row.stars,
    sharesCount: row.shares,
  }
}

function defaultEyebrow(row: PostRow, author: PersonRow | undefined) {
  const typeLabel = row.type.charAt(0).toUpperCase() + row.type.slice(1)
  const detail = row.place || (author?.location ?? '')
  return detail ? `${typeLabel} / ${detail}` : typeLabel
}

export type MemoryView = {
  id: string
  image: string
  date: string
  place: string
  title: string
  story: string
}

export function toMemory(row: PostRow, media: MediaRow[] = [], author?: PersonRow): MemoryView {
  return {
    id: row.id,
    image: media[0] ? mediaUrl(media[0]) : (author?.imageKey ? mediaUrl({ objectKey: author.imageKey, publicPath: null }) : '/images/portrait.png'),
    date: formatPostDate(row),
    place: row.place ?? author?.location ?? '',
    title: row.title,
    story: row.body,
  }
}

export type SearchResult = {
  slug: string
  name: string
  role: string
  location: string
  statement: string
  image: string
  accent: string
  tags: string[]
}

export function toSearchPerson(row: PersonRow): SearchResult {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    location: row.location,
    statement: row.statement,
    image: row.imageKey ? mediaUrl({ objectKey: row.imageKey, publicPath: null }) : '/images/portrait.png',
    accent: row.accent,
    tags: row.tags ?? [],
  }
}

export type PostSearchResult = {
  id: string
  slug: string
  type: string
  title: string
  body: string
  date: string
  author: string
  authorSlug: string
}

export function toSearchPost(row: PostRow, author?: PersonRow): PostSearchResult {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    body: row.body,
    date: formatPostDate(row),
    author: author?.name ?? '',
    authorSlug: author?.slug ?? '',
  }
}

export type PostTypeView = {
  type: string
  label: string
  blurb: string
  icon: string
  kind: string
  allowsImages: boolean
  minImages: number
  maxImages: number
  requiredFields: string[]
  fields: string[]
  sortOrder: number
}