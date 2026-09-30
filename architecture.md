# Aura — architecture

Next.js 16 App Router, single app, no monorepo. The archive is read-heavy and
write-light: a server component reads the feed and a profile from Postgres and
hands plain view models to client components that own interaction state.

```
                     ┌──────────────────────────┐
  browser ──────────▶│  Next.js app (Vercel)    │
   │                 │                          │
   │  1. fetch RSC   │  server components ──────┼──▶ lib/api.ts ──▶ lib/db.ts
   │  2. POST axios  │  route handlers          │        │            │
   │  3. PUT presign │                          │        │       Neon Postgres
   └────────────────▶│  client components       │        │       (drizzle-orm/neon-http)
                     │   zustand stores         │        │
                     └──────────┬───────────────┘        │
                                │  lib/storage.ts        │
                                ▼                        ▼
                          MinIO (S3)              drizzle/ 00xx_*.sql
                        localhost:9000             pushed by drizzle-kit
                        proxied to the browser
```

## Layers

| Layer | Files | Rule |
| --- | --- | --- |
| Schema | `lib/schema.ts` | Drizzle tables + enums. Imported by server code only. |
| Connection | `lib/db.ts`, `lib/db-safe.ts` | `db` is lazy and may be `null` when `DATABASE_URL` is unset. |
| Data access | `lib/api.ts` | The only module that queries. Returns view models, not rows. |
| View models | `lib/mappers.ts`, `lib/people.ts` | `toFeedPost(row)`, `toPerson(row)`. `people.ts` is seed data + mock fallback. |
| Validation | `lib/validation/*.ts` | Zod. Shared verbatim by client and server. |
| HTTP | `lib/http.ts`, `app/api/**` | `jsonError()` so every failure is `{ error, issues }`. |
| Auth | `lib/auth.ts`, `lib/session.ts` | Better Auth email/password → `people` via `userId`. |
| Storage | `lib/storage.ts` | MinIO client, presign, object stream, bucket bootstrap. |
| Client data | `lib/client-api.ts` | Axios instance + field-error mapping. |
| State | `store/feed.ts`, `store/composer.ts` | Zustand. No provider, no hydration dance. |
| Styles | `app/globals.css` | Hand-written CSS, one rule per line, no blank lines between rules. |

The one-way rule: **client components never import `lib/db.ts` or `lib/schema.ts`.**
They get view models from a server component's props or from `lib/client-api.ts`.

## Data model

### Enums

- `post_type` — `feeling | memory | achievement | mood | album | quote | poem | note`
- `post_visibility` — `public | private`
- `post_status` — `draft | published`

The 8 types are closed. The CSS branches on `feed-post-<type>` and
`literary-card-<type>`, so a new type needs both a CSS rule and a `post_types`
row. `post_types.kind` records which branch to use: `image` for
`memory, achievement, mood, feeling, album`, `literary` for `quote, poem, note`.

### Tables

**people** — every profile and every author.

| column | notes |
| --- | --- |
| `id` | `uuid` pk, `defaultRandom()` |
| `slug` | `text` unique — the `/profile/[slug]` key |
| `name`, `role`, `location`, `statement`, `bio` | text |
| `image_key` | text — MinIO object key |
| `accent` | text — the `01`…`05` badge |
| `tags` | `text[]`, default `{}` |
| `links` | `jsonb`, default `{}` — `{ instagram, website, email }` |
| `user_id` | text unique nullable — Better Auth `user.id` when the profile is claimed |
| `created_at`, `updated_at` | `timestamptz` |

**posts**

| column | notes |
| --- | --- |
| `id` | `uuid` pk |
| `slug` | `text` unique — the `/post/[slug]` key |
| `author_id` | `uuid` → `people.id`, `onDelete: 'cascade'` |
| `type` | `post_type` |
| `title`, `body` | text, both not null |
| `eyebrow` | text — the `Feeling / 06:42` line |
| `place` | text |
| `occurred_on` | `date` |
| `mood_score` | `smallint` 1–10 — mood and feeling only |
| `attribution` | text — `— Name` on quotes |
| `visibility`, `status` | enums above |
| `views`, `stars`, `shares` | `integer`, default 0 |
| `created_at`, `updated_at`, `published_at` | `timestamptz` |

Indexes: `(created_at desc)`, `(author_id, created_at desc)`, `type`.

**media** — one uploaded or bundled image.

| column | notes |
| --- | --- |
| `id` | `uuid` pk |
| `bucket` | text — `MINIO_BUCKET` |
| `object_key` | text unique — the MinIO key |
| `public_path` | text nullable — a bundled `/images/*.png` used instead of MinIO |
| `mime_type`, `size_bytes`, `width`, `height`, `alt_text` | |

`mediaUrl(media)` in `lib/storage.ts` returns `publicPath` when set, otherwise
`/api/images/${objectKey}`. This is what lets the seed reuse the 5 existing
2 MB PNGs in `public/images/` without re-uploading them.

**post_media** — `post_id` → `posts.id` cascade, `media_id` → `media.id`
cascade, `position smallint`, `caption text`, unique `(post_id, media_id)`.
One post of any type may have many media; albums require 2–10.

**post_tags** — `(post_id, tag)` composite pk, cascade on post.

**post_types** — the catalog the composer reads. `type` pk, `label`, `blurb`,
`icon`, `kind`, `allows_images`, `min_images`, `max_images`,
`required_fields jsonb`, `fields jsonb`, `sort_order`.
Seeded from the same TypeScript constant the zod schemas use, so the form and
the validator cannot drift.

**post_stars** — `(post_id, session_id)` composite pk, cascade. One row per
star, so toggling is a delete-or-insert and the displayed count is a real count.

**collections** / **collection_posts** — the profile's "Keep close" rooms.
`collections` has id, `owner_id` → `people.id` cascade, name, slug, blurb,
`created_at`; `collection_posts` has `(collection_id, post_id)` pk, cascade.

**biography_content** — unchanged, the admin dashboard's section store.

## Request flows

### Reading the feed

```
app/page.tsx (server)
  └─ listFeedPage()  ──▶ db is null? ──▶ return feedPosts        (mock fallback)
       │ db present
       ├─ db.select(posts).where(status='published' && visibility='public')
       │        .orderBy(desc(createdAt)).limit(n)
       ├─ hydrate authors, media, tags
       └─ .map(toFeedPost)
  └─▶ <FeedClient initialPosts initialPeople />   (client, zustand)
```

Server-rendered first paint, so the feed is never a spinner. Zustand only takes
over after hydration, for star/share and for prepending newly created posts.

### Creating a post with an image

```
1.  POST /api/uploads/presign   { filename, contentType, size }      [zod]
2.  axios.put(uploadUrl, file, { onUploadProgress })        ──direct──▶ MinIO
3.  POST /api/uploads/complete  { key, mimeType, size, altText }      [zod]
        └─ inserts the media row, returns mediaId
4.  POST /api/posts   { type, title, body, mediaIds[], ...fields }    [zod]
        ├─ requireSession() → people.id for the signed-in author
        └─ transaction: insert post + post_media + post_tags
5.  router.push('/')  → feed re-renders with the post on top
```

Step 2 is a straight browser-to-MinIO PUT. Bytes never pass through the Next
server, so a 10 MB upload costs one request, not three. The presigned URL is
valid for 30 minutes and embeds `MINIO_ENDPOINT`, which is why that endpoint
must be reachable from wherever the app runs.

### Image delivery

```
<img src="/api/images/posts/2026/<uuid>.png">        (browser)
  └─▶ GET /api/images/[...key]   stream from MinIO
        headers: cache-control: public, max-age=31536000, immutable
```

Keys are content-unique, so immutable caching is safe. This proxy is what lets
the bucket stay private and makes local development and production behave
identically — `localhost:9000` is never handed to the browser.

## The session

Better Auth owns `user` / `session` / `account` / `verification` (CLI-generated
in `lib/auth-schema.ts`). Email/password sign-up creates a linked `people` row
(`people.userId` → Better Auth `user.id`). `lib/session.ts` resolves
`auth.api.getSession` to that `people` row; write paths require a signed-in
author. Stars stay keyed on `people.id`.

The admin path is separate and unchanged in spirit: `biography_admin`, an
httpOnly cookie set by `POST /api/admin/login` against
`process.env.ADMIN_PASSWORD ?? '369456'`, gating `/api/admin/content` and
`/api/admin/upload`.

## Degrading without a database

`lib/db-safe.ts` returns `null` when `DATABASE_URL` is missing, and every reader
in `lib/api.ts` falls back to `lib/people.ts`. This is deliberate: `next build`
runs page rendering, so a hard dependency on Neon would break the build for
anyone who has not configured a database yet. Writes return `503` with a clear
message instead of failing obscurely.

## Environment

| variable | used by | required |
| --- | --- | --- |
| `DATABASE_URL` | `lib/db.ts` | for writes; reads fall back to mocks |
| `BETTER_AUTH_SECRET` | `lib/auth.ts` | required for auth |
| `BETTER_AUTH_URL` | `lib/auth.ts` | app origin, e.g. `http://localhost:3000` |
| `ADMIN_PASSWORD` | `app/api/admin/login` | defaults to `369456` |
| `MINIO_ENDPOINT` | `lib/storage.ts` | for uploads |
| `MINIO_ACCESS_KEY_ID` | `lib/storage.ts` | for uploads |
| `MINIO_SECRET_ACCESS_KEY` | `lib/storage.ts` | for uploads |
| `MINIO_BUCKET` | `lib/storage.ts` | defaults to `aura` |
| `MINIO_REGION` | `lib/storage.ts` | defaults to `us-east-1` |

`.env*.local` stays gitignored; `.env.example` is the documented template.

## Commands

```
pnpm dev              Next dev server
pnpm build / start    production build and serve
npx tsc --noEmit      the only type check — next.config.mjs sets ignoreBuildErrors
docker compose up -d  MinIO on :9000, console on :9001
pnpm db:generate      write drizzle/00xx_*.sql from lib/schema.ts
pnpm db:migrate       apply migrations to DATABASE_URL
pnpm db:push          push schema directly, no migration files
pnpm db:seed          load lib/people.ts into the DB, idempotently
pnpm db:studio        drizzle-kit studio
```

## Conventions

- Next 16 async request APIs: `await params`, `await cookies()`. Keep them.
- Zod schemas are the single validation source. `post_types.fields` mirrors them
  for form rendering, and both are seeded from one TypeScript constant.
- Storage returns view models from `lib/mappers.ts`; components never see rows.
- Small uppercase mono labels: `feed-kicker`, `section-kicker`, `profile-eyebrow`.
  State classes: `is-loaded`, `is-selected`, `is-active`.
- Images live in `public/images/*.png` and are large; reuse rather than add.
- Styling is hand-written CSS in `app/globals.css` in the existing compressed
  one-rule-per-line style. Tailwind is installed but unused.
