# Aura — implementation plan

Real posts, real uploads, real profile.

## Decisions locked in

| Question | Decision |
| --- | --- |
| Post types | The existing 8: `feeling`, `memory`, `achievement`, `mood`, `album`, `quote`, `poem`, `note` |
| Author identity | Anonymous signed `aura_session` cookie that owns a real `people` row |
| Mock posts | Seeded into Neon from `lib/people.ts`; feed reads only the DB, falls back to mocks when `DATABASE_URL` is unset |
| Image delivery | Proxied through `GET /api/images/[...key]`; DB stores only the object key |
| MinIO bucket | Auto-created on the first API call via `bucketExists` → `makeBucket` |
| New routes | `/post/[slug]`, `GET /api/posts`, persistent star/share, DB-backed `/search` |
| Dashboard | Ported to MinIO presign; `@vercel/blob` removed |
| Neon access | Migrations shipped as SQL; `DATABASE_URL` supplied later, app degrades to mocks until then |
| Package manager | pnpm; install allowed |

See `architecture.md` for the module map and schema, `api.md` for the endpoint reference.

---

## Phase 0 — deps & infrastructure

```
pnpm add minio @neondatabase/serverless zod zustand axios
pnpm add -D drizzle-kit dotenv
pnpm remove @vercel/blob pg @types/pg
```

New `docker-compose.yml` — **MinIO only**, no Postgres:

- `minio` service, image `minio/minio`, ports `9000` (S3 API) / `9001` (console)
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from env
- named volume `aura-minio-data`
- healthcheck on `/minio/health/live`

New `.env.example` (the repo has none today):

```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx.neon.tech/aura?sslmode=require
SESSION_SECRET=change-me
ADMIN_PASSWORD=369456
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY_ID=auraadmin
MINIO_SECRET_ACCESS_KEY=change-me
MINIO_BUCKET=aura
MINIO_REGION=us-east-1
```

`next.config.mjs`: add `serverExternalPackages: ['minio']` so the SDK is not bundled.

`.gitignore` already covers `.env*.local`; keep that and do not commit `.env.example` secrets.

## Phase 1 — DB layer

- **`lib/schema.ts`** (new) — every table moved out of `lib/db.ts`:
  - `postTypeEnum` = `feeling | memory | achievement | mood | album | quote | poem | note`
  - `people` — id, slug, name, role, location, statement, bio, imageKey, accent, `tags text[]`, `links jsonb`, isSessionOwner, timestamps
  - `posts` — id, slug, authorId→people, type, title, body, eyebrow, place, occurredOn, moodScore, attribution, visibility, status, `views/stars/shares integer`, timestamps; indexes on `(createdAt desc)`, `(authorId, createdAt desc)`, `type`
  - `media` — id, bucket, objectKey, `publicPath` (nullable, for bundled `/images/*.png`), mimeType, sizeBytes, width, height, altText
  - `post_media` — postId, mediaId, position, caption; unique(postId, mediaId)
  - `post_tags` — composite PK (postId, tag)
  - `post_types` — catalog that drives the composer: type pk, label, blurb, icon, kind (`image|literary`), allowsImages, minImages/maxImages, `requiredFields jsonb`, `fields jsonb`
  - `post_stars` — (postId, sessionId) PK for real star toggles
  - `collections` + `collection_posts` — makes the profile's "Keep close" rooms real
  - `biography_content` — kept, re-pointed at the new driver
- **`lib/db.ts`** — swap `node-postgres` + `pg` for `drizzle-orm/neon-http` + `neon(process.env.DATABASE_URL)`. Resolve lazily so the mock fallback works; `lib/db-safe.ts` returns `null` when unconfigured.
- **`drizzle.config.ts`** + scripts `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:seed`.
- **`lib/seed.ts`** — reads `lib/people.ts` as source of truth: 5 people, 8 posts, the 8 `post_types` catalog rows, `profileMemories` / `profileGallery` as memory/album posts, and uploads the 5 existing `public/images/*.png` into MinIO. Falls back to `media.publicPath` when MinIO is down. Idempotent via `onConflictDoNothing`.
- `lib/people.ts` keeps the mock arrays but becomes **seed data + fallback only**. `lib/mappers.ts` (`toFeedPost`, `toPerson`) maps DB rows to view models so components never touch rows directly.

## Phase 2 — anonymous session (the author)

**`lib/session.ts`** — `aura_session` = `userId.expiry.hmac(SESSION_SECRET)` via `node:crypto`. Exports `getSession()`, `requireSession()`, `ensureUser()` which get-or-creates a `people` row with a generated handle (`aura-<base36>`), placeholder portrait, `isSessionOwner: true`. The admin login route reads `process.env.ADMIN_PASSWORD ?? '369456'`.

## Phase 3 — MinIO storage + presigned uploads

**`lib/storage.ts`**

- lazy `Minio` client; `ensureBucket()` (`bucketExists` → `makeBucket`) memoised per process — the auto-create path
- `presignPut(key, mimeType)` → `{ uploadUrl, expiresAt }`, 30 min expiry
- `getObjectStream(key)` for the proxy
- `mediaUrl(media)` → `publicPath ?? /api/images/${objectKey}`

Routes:

- `POST /api/uploads/presign` — zod `{ filename, contentType, size }` → sanitised key `posts/<y>/<uuid>.<ext>`, returns `{ key, uploadUrl, mediaUrl, headers }`
- `POST /api/uploads/complete` — zod `{ key, contentType, size, altText }` → inserts the `media` row, returns `mediaId`
- `GET /api/images/[...key]` — streams from MinIO with `cache-control: public, max-age=31536000, immutable`

## Phase 4 — API layer with zod

**`lib/validation/`** — `posts.ts` (discriminated union on `type`, per-type required fields mirroring `post_types.fields`), `uploads.ts`, `session.ts`. **`lib/http.ts`** — `jsonError(status, zodError?)` so every failure returns `{ error, issues }`.

- `POST /api/session` — ensure session, return `{ user }`
- `GET /api/posts?cursor&type&author&limit` — published feed, keyset pagination on `createdAt`
- `POST /api/posts` — zod parse → `lib/api.ts#createPost` (post + `post_media` + `post_tags` in a transaction) → created post
- `GET|PATCH|DELETE /api/posts/[slug]` — own posts only for writes
- `POST /api/posts/[id]/star` — toggle a `post_stars` row, return the new count
- `POST /api/posts/[id]/share` — increment, return the new count
- `GET /api/search?q=` — `ilike` across people and posts

`lib/client-api.ts` — axios instance (`withCredentials`, interceptor that folds `{ issues }` into a field-error map) exposing `createPost`, `listPosts`, `toggleStar`, `presignUpload`, `completeUpload`, `search`.

## Phase 5 — rewrite `/create`

`app/create/page.tsx` becomes `'use client'`, driven by **`store/composer.ts`** (zustand: draft, per-type field values, media array with per-file upload progress, `localStorage` autosave, async `submit` action).

- Type grid keeps `.type-grid` / `.is-selected`, now sourced from `post_types`
- **Conditional fields per type**: mood + feeling → intensity slider (1–10) → `moodScore`; quote → attribution; memory + achievement → place and occurredOn; album → 2–10 images; poem → line-preserving textarea; note → no image
- Image flow: file input → `presignUpload` → `axios.put(uploadUrl, file, { onUploadProgress })` → `completeUpload`; per-thumb progress, retry, remove
- Submit → `createPost` → `router.push('/')`. On failure, zod issues render inline per field (`.create-error`)
- Draft restored on reload, cleared after success

## Phase 6 — feed reads the DB

`app/page.tsx` becomes a **server component**: `listFeedPage()` from the DB (falling back to `feedPosts`), plus people, then renders `<FeedClient initialPosts initialPeople />` in `components/feed/feed-client.tsx`.

`store/feed.ts` (zustand) holds the list, prepends optimistically created posts, and drives star/share with optimistic counts plus rollback. `PixelImage` and every `feed-post-*` / `literary-card-*` class stay untouched — the visual output is unchanged.

## Phase 7 — profile + post detail

- **`app/profile/[slug]/page.tsx`** → server component. Drops `generateStaticParams` (DB-backed, force-dynamic), keeps `.profile-hero`, and replaces hardcoded `profileMemories` / `profileGallery` with real queries: stat row (posts · stars · media), post grid reusing the feed card renderer, a memories timeline from `type='memory'`, a gallery built from that person's `media` rows, and their `collections`. Tabs switch Posts / Memories / Gallery with a `.profile-tab.is-active` style.
- **`app/profile/page.tsx`** ("your story") → server component reading the session user, their real counts, recent posts, and collections. Keeps `.personal-profile-*`, drops the hardcoded `24 / 128 / 3.2k`.
- **`app/post/[slug]/page.tsx`** (new) → full post view, media carousel for albums, star/share wired to the API, author link.

## Phase 8 — search + dashboard

- `app/search/page.tsx` → debounced 250 ms axios → `GET /api/search`, still rendering `.search-person` / `.search-post-<type>`; empty and loading states reuse `.search-empty` and `.post-skeleton`.
- `app/api/admin/upload/route.ts` → rewritten on `presignPut`; the dashboard swaps the Blob wordmark for "MinIO + Neon connected" and uploads through the same presign path. `@vercel/blob` removed.

## Phase 9 — CSS

All new rules appended to `app/globals.css` in the existing one-rule-per-line compressed style, reusing `--ink / --paper / --muted / --line / --serif / --sans / --mono`. New blocks: `.create-fields`, `.create-slider`, `.composer-dropzone`, `.composer-thumbs`, `.upload-bar`, `.create-error`, `.create-status`, `.profile-tabs`, `.profile-stat`, `.profile-post-card`, `.post-detail-*`, `.feed-error`, `.feed-end`. **No new post-type variants** — the 8 existing kinds already have CSS.

## Verification

1. `pnpm install`
2. `docker compose up -d` → `curl localhost:9000/minio/health/live`
3. `pnpm db:generate && pnpm db:migrate` against the Neon URL
4. `pnpm db:seed`
5. `npx tsc --noEmit` — **the real type check**, since `next build` sets `ignoreBuildErrors: true`
6. `pnpm build`
7. Manual: create each of the 8 types → confirm redirect to `/`, post at the top of the feed, image served via `/api/images/...`, star/share survive reload, visible on `/profile` and `/post/[slug]`, searchable

## Risks

- `drizzle-orm/neon-http` is fetch-based, so `lib/db.ts` must never be imported into client code — all DB access stays in `lib/api.ts` and route handlers.
- `minio@8` `presignedPutObject` signs the host only, so a browser PUT is not blocked by a Content-Type mismatch; the mimeType is persisted on the `media` row regardless.
- MinIO presigned URLs embed the endpoint host, so uploads issued from a deployed Vercel instance need a reachable `MINIO_ENDPOINT`.
