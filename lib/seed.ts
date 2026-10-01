import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { collectionPosts, collections, media, people, postMedia, postTypes, posts } from './schema'
import { postTypeSpecs } from './post-types'
import { feedPosts, people as mockPeople, profileMemories } from './people'
import { buildKey, putObject } from './storage'

const mockDates: Record<string, string> = {
  'memory-01': '2022-03-14',
  'achievement-01': '2026-04-02',
  'mood-01': '2014-08-21',
}

export async function runSeed() {
  const db = getDb()
  if (!db) {
    console.error('DATABASE_URL is not set. Nothing was seeded.')
    process.exit(1)
  }

  console.log('Seeding post types…')
  await db
    .insert(postTypes)
    .values(
      postTypeSpecs.map((spec) => ({
        type: spec.type,
        label: spec.label,
        blurb: spec.blurb,
        icon: spec.icon,
        kind: spec.kind,
        allowsImages: spec.allowsImages,
        minImages: spec.minImages,
        maxImages: spec.maxImages,
        requiredFields: spec.requiredFields,
        fields: spec.fields,
        sortOrder: spec.sortOrder,
      })),
    )
    .onConflictDoNothing()

  console.log('Uploading bundled images to MinIO…')
  const mediaIdByPath = new Map<string, string>()
  const objectKeyByPath = new Map<string, string>()
  for (const path of uniqueMediaPaths()) {
    const filePath = join(process.cwd(), 'public', path)
    const existing = await db.select().from(media).where(eq(media.sourcePath, path)).limit(1)
    if (existing.length) {
      mediaIdByPath.set(path, existing[0].id)
      objectKeyByPath.set(path, existing[0].objectKey)
      continue
    }
    const objectKey = buildKey(path, contentTypeFor(path))
    const uploaded = await uploadIfPossible(objectKey, filePath, contentTypeFor(path))
    await db
      .insert(media)
      .values({
        bucket: process.env.MINIO_BUCKET || 'aura',
        objectKey,
        sourcePath: path,
        publicPath: uploaded ? null : path,
        mimeType: contentTypeFor(path),
        sizeBytes: sizeOf(filePath),
        altText: path,
      })
      .onConflictDoNothing()
    const [row] = await db.select().from(media).where(eq(media.sourcePath, path)).limit(1)
    if (row) {
      mediaIdByPath.set(path, row.id)
      objectKeyByPath.set(path, row.objectKey)
    }
  }

  console.log('Seeding people…')
  await db
    .insert(people)
    .values(
      mockPeople.map((person) => ({
        slug: person.slug,
        name: person.name,
        role: person.role,
        location: person.location,
        statement: person.statement,
        bio: person.bio ?? person.statement,
        imageKey: objectKeyByPath.get(person.image) ?? null,
        accent: person.accent,
        tags: person.tags,
        links: person.links ?? [],
        views: person.viewsCount ?? 0,
        stars: person.starsCount ?? 0,
        shares: person.sharesCount ?? 0,
      })),
    )
    .onConflictDoNothing()

  const personRows = await db.select().from(people)
  const personBySlug = new Map(personRows.map((row) => [row.slug, row]))

  console.log('Seeding posts…')
  for (const mock of feedPosts) {
    const author = personBySlug.get(mock.authorSlug)
    if (!author) continue
    const imagePaths = mock.images ?? (mock.image ? [mock.image] : [])
    const mediaIds = imagePaths
      .map((path) => mediaIdByPath.get(path))
      .filter((id): id is string => Boolean(id))

    const [inserted] = await db
      .insert(posts)
      .values({
        slug: mock.slug ?? mock.id,
        authorId: author.id,
        type: mock.type,
        title: mock.title,
        body: mock.body,
        eyebrow: mock.eyebrow,
        place: mock.eyebrow.split('/')[1]?.trim() || null,
        occurredOn: mockDates[mock.id] ?? null,
        moodScore: mock.type === 'feeling' ? 7 : mock.type === 'mood' ? 4 : null,
        attribution: mock.type === 'quote' ? mock.body : null,
        visibility: 'public',
        status: 'published',
        views: mock.viewsCount ?? 0,
        stars: mock.starsCount ?? 0,
        shares: mock.sharesCount ?? 0,
      })
      .onConflictDoNothing()
      .returning()

    const postId = inserted?.id ?? (await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, mock.slug ?? mock.id)).limit(1))[0]?.id
    if (postId && mediaIds.length) {
      await db
        .insert(postMedia)
        .values(mediaIds.map((mediaId, position) => ({ postId, mediaId, position })))
        .onConflictDoNothing()
    }
  }

  console.log('Seeding profile memories…')
  const memoryAuthor = personBySlug.get('elias-vale')
  if (memoryAuthor) {
    const memoryDates = ['2014-08-21', '2018-11-04', '2022-03-14']
    for (const [index, memory] of profileMemories.entries()) {
      const [inserted] = await db
        .insert(posts)
        .values({
          slug: `profile-memory-0${index + 1}`,
          authorId: memoryAuthor.id,
          type: 'memory',
          title: memory.title,
          body: memory.story,
          eyebrow: `Memory / ${memory.place}`,
          place: memory.place,
          occurredOn: memoryDates[index] ?? null,
          visibility: 'public',
          status: 'published',
        })
        .onConflictDoNothing()
        .returning()
      const postId =
        inserted?.id ?? (await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, `profile-memory-0${index + 1}`)).limit(1))[0]?.id
      const mediaId = mediaIdByPath.get(memory.image)
      if (postId && mediaId) {
        await db.insert(postMedia).values({ postId, mediaId, position: 0 }).onConflictDoNothing()
      }
    }
  }

  console.log('Seeding collections…')
  const [owner] = await db.select().from(people).where(eq(people.slug, 'theo-march')).limit(1)
  if (owner) {
    await db
      .insert(collections)
      .values([
        { ownerId: owner.id, name: 'Small beginnings', slug: 'small-beginnings', blurb: 'First entries, before the archive had a shape.' },
        { ownerId: owner.id, name: 'Rooms I remember', slug: 'rooms-i-remember', blurb: 'Places that stayed after I left.' },
        { ownerId: owner.id, name: 'Words to return to', slug: 'words-to-return-to', blurb: 'Sentences that keep their meaning.' },
      ])
      .onConflictDoNothing({ target: [collections.ownerId, collections.slug] })

    const collectionRows = await db.select().from(collections).where(eq(collections.ownerId, owner.id))
    const postRows = await db.select().from(posts)
    for (const collection of collectionRows) {
      const keyword = collection.slug.split('-')[0]
      const matches = postRows.filter((post) => post.title.toLowerCase().includes(keyword)).slice(0, 5)
      const chosen = matches.length ? matches : postRows.slice(0, 3)
      if (!chosen.length) continue
      await db
        .insert(collectionPosts)
        .values(chosen.map((post) => ({ collectionId: collection.id, postId: post.id })))
        .onConflictDoNothing()
    }
  }

  const [postRows, mediaRows] = await Promise.all([
  db.select({ id: posts.id }).from(posts),
  db.select({ id: media.id }).from(media),
])
  console.log('Seed complete.', {
    people: personRows.length,
    posts: postRows.length,
    media: mediaRows.length,
  })
}

function uniqueMediaPaths() {
  const paths = new Set<string>()
  for (const person of mockPeople) paths.add(person.image)
  for (const post of feedPosts) {
    if (post.image) paths.add(post.image)
    for (const image of post.images ?? []) paths.add(image)
  }
  for (const memory of profileMemories) paths.add(memory.image)
  return [...paths]
}

function publicPathToKey(path: string) {
  return path ? path.replace(/^\//, '') : null
}

function contentTypeFor(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'image/png'
}

function sizeOf(path: string) {
  try {
    return readFileSync(path).byteLength
  } catch {
    return 0
  }
}

async function uploadIfPossible(objectKey: string, filePath: string, contentType: string) {
  if (!process.env.MINIO_ENDPOINT || !existsSync(filePath)) return false
  try {
    await putObject(objectKey, readFileSync(filePath), contentType)
    return true
  } catch (error) {
    console.warn(`  MinIO unavailable, falling back to publicPath for ${objectKey}:`, error instanceof Error ? error.message : error)
    return false
  }
}

const invokedDirectly = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false

if (invokedDirectly) {
  runSeed().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}