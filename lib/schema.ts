import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const postTypeEnum = pgEnum('post_type', ['feeling', 'memory', 'achievement', 'mood', 'album', 'quote', 'poem', 'note'])
export const postVisibilityEnum = pgEnum('post_visibility', ['public', 'private'])
export const postStatusEnum = pgEnum('post_status', ['draft', 'published'])
export const postKindEnum = pgEnum('post_kind', ['image', 'literary'])

export const people = pgTable('people', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  location: text('location').notNull().default(''),
  statement: text('statement').notNull().default(''),
  bio: text('bio').notNull().default(''),
  imageKey: text('image_key'),
  accent: text('accent').notNull().default('01'),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  links: jsonb('links').$type<{ label: string; url: string }[]>().notNull().default(sql`'[]'::jsonb`),
  views: integer('views').notNull().default(0),
  stars: integer('stars').notNull().default(0),
  shares: integer('shares').notNull().default(0),
  userId: text('user_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    type: postTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    eyebrow: text('eyebrow'),
    place: text('place'),
    occurredOn: date('occurred_on'),
    moodScore: smallint('mood_score'),
    attribution: text('attribution'),
    visibility: postVisibilityEnum('visibility').notNull().default('public'),
    status: postStatusEnum('status').notNull().default('published'),
    views: integer('views').notNull().default(0),
    stars: integer('stars').notNull().default(0),
    shares: integer('shares').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('posts_created_at_idx').on(table.createdAt.desc()),
    index('posts_author_created_at_idx').on(table.authorId, table.createdAt.desc()),
    index('posts_type_idx').on(table.type),
  ],
)

export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  bucket: text('bucket').notNull(),
  objectKey: text('object_key').notNull().unique(),
  publicPath: text('public_path'),
  sourcePath: text('source_path'),
  mimeType: text('mime_type').notNull().default('image/png'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  width: integer('width'),
  height: integer('height'),
  altText: text('alt_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('media_source_path_idx').on(table.sourcePath)])

export const postMedia = pgTable(
  'post_media',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull().default(0),
    caption: text('caption'),
  },
  (table) => [uniqueIndex('post_media_post_media_unique').on(table.postId, table.mediaId)],
)

export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tag] })],
)

export const postTypes = pgTable('post_types', {
  type: postTypeEnum('type').primaryKey(),
  label: text('label').notNull(),
  blurb: text('blurb').notNull().default(''),
  icon: text('icon').notNull().default(''),
  kind: postKindEnum('kind').notNull(),
  allowsImages: boolean('allows_images').notNull().default(false),
  minImages: smallint('min_images').notNull().default(0),
  maxImages: smallint('max_images').notNull().default(0),
  requiredFields: jsonb('required_fields').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  fields: jsonb('fields').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  sortOrder: smallint('sort_order').notNull().default(0),
})

export const postStars = pgTable(
  'post_stars',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.sessionId] })],
)

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    blurb: text('blurb').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('collections_owner_slug_idx').on(table.ownerId, table.slug)],
)

export const collectionPosts = pgTable(
  'collection_posts',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.postId] })],
)

export const biographyContent = pgTable('biography_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  section: text('section').notNull().unique(),
  content: jsonb('content').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PersonRow = typeof people.$inferSelect
export type PostRow = typeof posts.$inferSelect
export type MediaRow = typeof media.$inferSelect
export type PostTypeRow = typeof postTypes.$inferSelect
export type CollectionRow = typeof collections.$inferSelect
