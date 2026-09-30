# Aura — phase tracker

Ten phases, in dependency order. Each phase lists the files it creates, the
files it modifies, the work items, and what "done" means. Do not start a phase
until the one above it is done — later phases read the modules earlier phases
introduce.

Context: `plan.md` (intent), `architecture.md` (modules, schema, flows),
`api.md` (endpoint contract), `AGENTS.md` (repo conventions).

Status legend: `[ ]` open · `[~]` in progress · `[x]` done

---

## Phase 0 — Dependencies and infrastructure

Deps and config. Nothing depends on the app code, so this can start first.

- [x] `pnpm add minio @neondatabase/serverless zod zustand axios`
- [x] `pnpm add -D drizzle-kit dotenv`
- [x] `pnpm remove @vercel/blob` — `pg` / `@types/pg` stayed as **devDependencies** (drizzle-kit's `migrate` needs a pg driver); `ws` added as a dependency for the Neon WebSocket driver on Node < 22
- [x] `docker-compose.yml` — MinIO only, no Postgres
  - [x] `minio` service, image `minio/minio`, ports `9000` / `9001`
  - [x] `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` with `${VAR:-default}` defaults
  - [x] named volume `aura-minio-data`
  - [x] healthcheck against `/minio/health/live`
- [x] `.env.example` — `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`,
      `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY_ID`, `MINIO_SECRET_ACCESS_KEY`,
      `MINIO_BUCKET`, `MINIO_REGION`
- [x] `next.config.mjs` — add `serverExternalPackages: ['minio']`
- [x] `package.json` scripts — `db:generate`, `db:migrate`, `db:push`, `db:seed`,
      `db:studio`

**Done when** `docker compose up -d` passes its healthcheck,
`curl localhost:9000/minio/health/live` returns `200`, and `pnpm install` is clean.

---

## Phase 1 — Schema, connection, seed

The largest phase. Everything downstream reads from it.

- [x] `lib/schema.ts` (new) — move every table out of `lib/db.ts`
  - [x] `postTypeEnum`, `postVisibilityEnum`, `postStatusEnum`
  - [x] `people` — slug unique, `tags text[]`, `links jsonb`, `isSessionOwner`
  - [x] `posts` — slug unique, `authorId` → `people.id` cascade, `moodScore`,
        `attribution`, `place`, `occurredOn`, `views`/`stars`/`shares` integers
  - [x] indexes — `(createdAt desc)`, `(authorId, createdAt desc)`, `type`
  - [x] `media` — `objectKey` unique, `publicPath` nullable, mime, size, dims, alt
  - [x] `postMedia` — unique `(postId, mediaId)`, `position`, `caption`
  - [x] `postTags` — composite pk `(postId, tag)`
  - [x] `postTypes` — the composer catalog: `label`, `blurb`, `icon`, `kind`,
        `allowsImages`, `minImages`/`maxImages`, `requiredFields` jsonb,
        `fields` jsonb, `sortOrder`
  - [x] `postStars` — composite pk `(postId, sessionId)`
  - [x] `collections` + `collectionPosts`
  - [x] `biographyContent` — carried over unchanged
- [x] `lib/post-types.ts` (new) — the single TypeScript constant for the 8 types:
      label, kind, blurb, allowed images, per-type zod shape
- [x] `lib/db.ts` — replaced `node-postgres` + `pg` with **`drizzle-orm/neon-serverless`** (`Pool` + `ws`), not `neon-http`: `createPost` uses `db.transaction(...)`, which the HTTP driver does not support. Resolve lazily, never throw at import
- [x] `lib/db-safe.ts` — returns `null` when `DATABASE_URL` is unset
- [x] `drizzle.config.ts` + `drizzle/0000_*.sql` via `pnpm db:generate`
- [x] `lib/mappers.ts` — `toFeedPost(row)`, `toPerson(row)`, `toMediaUrl(media)`
- [x] `lib/people.ts` — keep the mock arrays, add a comment that this is now
      seed data plus the no-database fallback
- [x] `lib/seed.ts` + `pnpm db:seed`
  - [x] 5 people, 8 posts, 8 `post_types` rows, idempotent
  - [x] `profileMemories` / `profileGallery` become memory and album posts
  - [x] upload the 5 existing `public/images/*.png` into MinIO
  - [x] on MinIO failure, fall back to `media.publicPath` so seeding still works

**Done when** `pnpm db:generate` produces a migration, `pnpm db:migrate` applies
it to Neon, `pnpm db:seed` is safely re-runnable, and `npx tsc --noEmit` is clean.

---

## Phase 2 — Session

- [x] `lib/session.ts` (new)
  - [x] `aura_session` = `userId.expiry.hmac`, `node:crypto`, `SESSION_SECRET`
  - [x] `getSession()` → `userId | null`
  - [x] `requireSession()` → throws a `401`-shaped error
  - [x] `ensureUser()` → get-or-create the `people` row, handle `aura-<base36>`,
        `isSessionOwner: true`
- [x] `app/api/session/route.ts` (new) — `POST`, returns the user
- [x] `app/api/admin/login/route.ts` — read `process.env.ADMIN_PASSWORD ?? '369456'`

**Done when** two `POST /api/session` calls with the same cookie return the same
user id, and a second call without the cookie creates a different one.

---

## Phase 3 — MinIO storage and uploads

- [x] `lib/storage.ts` (new)
  - [x] lazy `Minio` client from env
  - [x] `ensureBucket()` — `bucketExists` then `makeBucket`, memoised per process
  - [x] `presignPut(key, contentType)` → `{ uploadUrl, expiresAt }`, 30 min
  - [x] `getObjectStream(key)` for the proxy
  - [x] `buildKey(filename, contentType)` → `posts/<year>/<uuid>.<ext>`
  - [x] `mediaUrl(media)` → `publicPath ?? /api/images/<objectKey>`
- [x] `lib/validation/uploads.ts` (new) — zod for presign and complete
- [x] `app/api/uploads/presign/route.ts` (new) — `POST`, `runtime = 'nodejs'`
- [x] `app/api/uploads/complete/route.ts` (new) — `POST`, inserts the `media` row,
      `409` if the key already has a row, `404` if the object is not in the bucket
- [x] `app/api/images/[...key]/route.ts` (new) — `GET`, streams from MinIO with
      `cache-control: public, max-age=31536000, immutable`

**Done when** a presign + browser `PUT` + complete round-trip produces a
`media` row, and `GET /api/images/<key>` streams the object back.

---

## Phase 4 — Post API

- [x] `lib/validation/posts.ts` (new) — zod discriminated union on `type`,
      per-type rules: mood and feeling need `moodScore`, album needs 2–10 media,
      note rejects images, quote allows one
- [x] `lib/http.ts` (new) — `jsonError(status, message, zodError?)` producing
      `{ error, issues }`
- [x] `lib/api.ts` (new) — the only module that queries
  - [x] `listFeedPage`, `getPostBySlug`, `getAuthoredPosts`, `getProfileStats`,
        `getCollections`, `searchAll` — each with a `lib/people.ts` fallback
  - [x] `createPost` — transaction over `posts` + `post_media` + `post_tags`
  - [x] `updatePost`, `deletePost` — owner check
  - [x] `toggleStar`, `incrementShare`
- [x] `app/api/posts/route.ts` — `GET` (cursor, `type`, `author`, `limit`) and
      `POST`
- [x] `app/api/posts/[slug]/route.ts` — `GET`, `PATCH`, `DELETE`
- [x] `app/api/posts/[slug]/star/route.ts` — `POST` (sibling param must match `[slug]`; the value is the post UUID the client sends)
- [x] `app/api/posts/[slug]/share/route.ts` — `POST`
- [x] `app/api/search/route.ts` — `GET ?q=`
- [x] `lib/client-api.ts` (new) — axios instance, `withCredentials`, interceptor
      folding `{ issues }` into a field-error map
- [x] `store/feed.ts` (new) — zustand: post list, prepend, optimistic star and
      share with rollback

**Done when** a validated `POST /api/posts` returns the new post, an invalid
body returns `422` with a per-field `issues` array, and a star survives a reload.

---

## Phase 5 — The composer

- [x] `store/composer.ts` (new) — zustand: draft, per-type field values, media
      array with per-file progress, `localStorage` autosave, async `submit`
- [x] `app/create/page.tsx` (rewrite, stays `'use client'`)
  - [x] type grid keeps `.type-grid` / `.is-selected`, now sourced from
        `post_types`
  - [x] conditional fields — mood and feeling intensity slider, quote
        attribution, memory and achievement place and date, album 2–10 images,
        poem line-preserving textarea, note with no image
  - [x] image flow — `presignUpload` → `axios.put` with `onUploadProgress` →
        `completeUpload`; per-thumb progress, retry, remove
  - [x] submit → `createPost` → `router.push('/')`
  - [x] zod issues rendered inline in `.create-error`
  - [x] draft restored on reload, cleared after success
- [x] `app/globals.css` — `.create-fields`, `.create-slider`,
      `.composer-dropzone`, `.composer-thumbs`, `.upload-bar`, `.create-error`,
      `.create-status`

**Done when** each of the 8 types can be created, an album refuses fewer than 2
images, a failed upload retries, and a successful publish lands on `/` with the
post at the top.

---

## Phase 6 — The feed

- [x] `app/page.tsx` — becomes a server component: `listFeedPage()` from the DB
      with the mock fallback, then `<FeedClient initialPosts initialPeople />`
- [x] `components/feed/feed-client.tsx` (new) — moves `PixelImage`, `PostSkeleton`,
      and the existing card markup verbatim
- [x] `store/feed.ts` — wire star and share to the API
- [x] `app/globals.css` — `.feed-error`, `.feed-end`

**Done when** the feed is server-rendered on first paint, a new post appears
without a manual reload, and star/share persist across reloads. No change to
`feed-post-*` or `literary-card-*` styling.

---

## Phase 7 — Profile and post detail

- [x] `app/profile/[slug]/page.tsx` — server component, `force-dynamic`, drops
      `generateStaticParams`, keeps `.profile-hero`
  - [x] stat row — posts, stars, media
  - [x] post grid reusing the feed card renderer
  - [x] memories timeline from `type = 'memory'`
  - [x] gallery from that person's `media` rows
  - [x] collections list
  - [x] `.profile-tabs` with `is-active`
- [x] `app/profile/page.tsx` — server component reading the session user, real
      counts, recent posts, collections. Drops the hardcoded `24 / 128 / 3.2k`
- [x] `app/post/[slug]/page.tsx` (new) — full post, media carousel for albums,
      star and share wired to the API, author link
- [x] `app/globals.css` — `.profile-tabs`, `.profile-stat`,
      `.profile-post-card`, `.post-detail-*`

**Done when** a slug not in the database `404`s, a real profile shows real
counts, and a post links through to `/post/[slug]`.

---

## Phase 8 — Search and dashboard

- [x] `app/search/page.tsx` — debounced 250 ms axios to `GET /api/search`,
      keeps `.search-person` and `.search-post-<type>`, reuses `.search-empty`
      and `.post-skeleton` for states
- [x] `app/api/admin/upload/route.ts` — multipart, `buildKey` + `putObject` (server-side stream rather than browser `presignPut`), inserts the `media` row
- [x] `app/dashboard/page.tsx` — swap the Blob wordmark for
      "MinIO + Neon connected", upload through the new route
- [x] `app/dashboard/dashboard.css` — only if the new copy needs it

**Done when** a newly created post is findable in `/search`, and the dashboard
uploads a file to MinIO and shows the proxied URL.

---

## Phase 9 — Styling and verification

- [x] `app/globals.css` — all new rules in the existing compressed one-rule-per-line
      style, reusing `--ink / --paper / --muted / --line / --serif / --sans / --mono`.
      No new post-type variants; the 8 kinds already have CSS
- [x] `npx tsc --noEmit` — the real type check, `next build` has
      `ignoreBuildErrors: true`
- [x] `pnpm build`
- [x] `docker compose up -d` → `pnpm db:migrate` → `pnpm db:seed`
- [x] Manual pass — create each of the 8 types, confirm redirect to `/`, post at
      the top of the feed, image served via `/api/images/...`, star and share
      survive reload, visible on `/profile` and `/post/[slug]`, searchable
- [x] `AGENTS.md` — update to describe the new architecture
- [x] Delete the dead `app/dashboard/dashboard.module.css` if nothing imports it

---

## Blockers

- [x] **Neon `DATABASE_URL`** — resolved. Migration `0000` + `0001` applied to a
      real Neon database, seed idempotent, full HTTP flow verified. Without the
      URL, reads still fall back to `lib/people.ts` and writes return `503`.
- [x] `SESSION_SECRET` — set in `.env.local` (gitignored) and exercised by
      session / create / star / share.

## Notes from verification

- `lib/seed.ts` media dedup keys on `media.sourcePath` (added in migration
  `0001`), not `publicPath` — the latter is nulled on a successful upload, which
  made re-seeding duplicate rows.
- The Neon driver split: `lib/db.ts` uses the **WebSocket** driver for
  transactions; `ws` is wired through `neonConfig.webSocketConstructor` so the
  Pool also works on Node 20 runtimes.

