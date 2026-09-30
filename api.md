# Aura — API reference

All endpoints live under `app/api`. Request and response bodies are JSON unless
stated otherwise.

## Conventions

**Errors** — every failure uses the same envelope from `lib/http.ts`:

```json
{ "error": "Title is required", "issues": [{ "path": ["title"], "message": "Title is required", "code": "too_small" }] }
```

`error` is human-readable and safe to show. `issues` is the raw Zod issue list,
present only on `422`. The axios interceptor in `lib/client-api.ts` folds
`issues` into a `{ field: message }` map for inline form rendering.

| status | meaning |
| --- | --- |
| `400` | malformed request, or a business rule the schema cannot express |
| `401` | no valid `aura_session` cookie |
| `403` | authenticated but not the owner of the resource |
| `404` | not found, or not visible to this caller |
| `422` | Zod validation failed — see `issues` |
| `503` | no `DATABASE_URL`, or MinIO is unreachable |

**Session** — `aura_session` is an httpOnly cookie set by `POST /api/session`.
All requests need `credentials: 'include'` (axios sets this by default for
same-origin). A session is created on first write, so reads work without one.

**View models** — responses return the shapes produced by `lib/mappers.ts`, not
Drizzle rows. See `architecture.md` for the field list.

---

## Session

### `POST /api/session`

Get-or-create the current anonymous author. Idempotent: returns the same user for
the same cookie.

Request: no body.

```json
{ "user": { "id": "3f2a…", "slug": "aura-k3x9", "name": "Aura k3x9", "statement": "…", "image": "/images/portrait.png" } }
```

## Posts

### `GET /api/posts`

The published feed. Cursor-paginated on `createdAt`, newest first.

| query | type | default | notes |
| --- | --- | --- | --- |
| `limit` | `number` | `12` | 1–50 |
| `cursor` | `string` | — | opaque `createdAt` cursor from a previous `nextCursor` |
| `type` | `postType` | — | filter to one type |
| `author` | `string` | — | author slug |

```json
{
  "posts": [ { "id": "…", "slug": "…", "type": "memory", "title": "After the rain", "body": "…", "author": { "slug": "mira-sato", "name": "Mira Sato", "image": "…" }, "images": ["/api/images/…"], "date": "03.2022", "views": "12k", "stars": "4m", "shares": "3.2k", "tags": [] } ],
  "nextCursor": "2026-09-30T12:04:11.000Z",
  "hasMore": true
}
```

`views`, `stars`, and `shares` are compact display strings ("4.8k") so the feed
component stays unchanged; the raw integers live in the row.

### `POST /api/posts`

Create a post. Requires a session — `ensureUser()` runs inside the handler, so
there is no separate registration step.

Request body, validated by the discriminated union in `lib/validation/posts.ts`:

| field | type | required |
| --- | --- | --- |
| `type` | one of the 8 post types | yes |
| `title` | `string`, 1–140 chars | yes |
| `body` | `string`, 1–8000 chars | yes |
| `mediaIds` | `uuid[]` | only for `album` (2–10) |
| `place` | `string` ≤ 120 | no |
| `occurredOn` | `YYYY-MM-DD` | no |
| `moodScore` | `int` 1–10 | no, `mood` and `feeling` only |
| `attribution` | `string` ≤ 120 | no, `quote` only |
| `tags` | `string[]` ≤ 10, each ≤ 32 chars | no |
| `visibility` | `public \| private` | no, defaults to `public` |

Per-type rules: `mood` and `feeling` require `moodScore`; `album` requires
`mediaIds` between 2 and 10; `note` rejects images; `quote` accepts only one
image. A violation is a `422` with the field path in `issues`.

```json
{ "post": { "id": "…", "slug": "after-the-rain-8f2c", "type": "memory", "title": "After the rain", "…": "…" } }
```

The post is inserted with `post_media` and `post_tags` in a single transaction,
so a partial write is not possible.

### `GET /api/posts/[slug]`

One post with its media in `position` order. `404` for drafts and for posts
belonging to a private author.

### `PATCH /api/posts/[slug]`

Partial update. `403` unless the session owns the post. Accepts the same body
as `POST` with everything optional; sends `null` to clear a field.

### `DELETE /api/posts/[slug]`

`403` unless the session owns the post. Cascades to `post_media`, `post_tags`,
and `post_stars`. Returns `{ "ok": true }`.

### `POST /api/posts/[id]/star`

Toggle. Insert or delete the `(post_id, session_id)` row, then recount.

```json
{ "starred": true, "stars": 19 }
```

Requires a session. Repeat calls toggle.

### `POST /api/posts/[id]/share`

Increments the counter. No body.

```json
{ "shares": 3 }
```

## Search

### `GET /api/search`

| query | type | default |
| --- | --- | --- |
| `q` | `string`, 1–120 chars | required |
| `limit` | `number` | `20` |

Matches people by name, role, location, and tags; posts by title, body, and
eyebrow. Case-insensitive substring match.

```json
{ "people": [ { "slug": "…", "name": "…", "role": "…", "image": "…" } ], "posts": [ { "slug": "…", "type": "poem", "title": "…", "author": "…" } ] }
```

Falls back to filtering `lib/people.ts` when `DATABASE_URL` is unset, so search
works before the database is configured.

## Uploads

Three steps: presign, direct PUT, complete. The file body never passes through
the Next server.

### `POST /api/uploads/presign`

| field | rules |
| --- | --- |
| `filename` | `string` 1–180 chars, basename only |
| `contentType` | must start with `image/` |
| `size` | ≤ 10 MB (10 485 760 bytes) |

```json
{
  "key": "posts/2026/1a2b3c4d.png",
  "uploadUrl": "http://localhost:9000/aura/posts/2026/1a2b3c4d.png?X-Amz-…",
  "mediaUrl": "/api/images/posts/2026/1a2b3c4d.png",
  "headers": { "Content-Type": "image/png" },
  "expiresAt": "2026-09-30T12:34:11.000Z"
}
```

The key is server-generated: `posts/<year>/<uuid>.<ext>`, extension derived from
`contentType`, never from user input. Two presigns for the same file produce
different keys, so a cancelled upload leaves an orphan object rather than
overwriting a live one.

### `PUT <uploadUrl>` — direct to MinIO

Not a Next route. The browser PUTs the raw bytes to the presigned URL. The URL
is valid for 30 minutes. Send `Content-Type` so the object records the right
type; the signature covers the host only, so the value is not enforced.
`onUploadProgress` drives the per-file progress bar.

### `POST /api/uploads/complete`

Called after a successful PUT. Creates the `media` row.

| field | rules |
| --- | --- |
| `key` | `string`, must start with `posts/` |
| `contentType` | must start with `image/` |
| `size` | ≤ 10 MB |
| `altText` | `string` ≤ 300 chars, optional |

```json
{ "mediaId": "7d1e…", "url": "/api/images/posts/2026/1a2b3c4d.png", "key": "posts/2026/1a2b3c4d.png" }
```

Returns `409` if the key already has a `media` row, which makes a retried
`complete` safe. Returns `404` if the object is not in the bucket — the client
should re-presign and re-upload.

### `GET /api/images/[...key]`

Streams an object out of MinIO. The catch-all `key` is the path after the
bucket name, for example `/api/images/posts/2026/1a2b3c4d.png`.

- `200` with the object's `content-type` and
  `cache-control: public, max-age=31536000, immutable` — keys are unique, so
  immutable is safe and the images are effectively CDN-cached
- `404` when the object is missing
- `502` when MinIO is unreachable

This is why the browser never sees `localhost:9000`; the bucket can stay private
and local dev behaves exactly like production.

---

## Admin

Unchanged in shape: httpOnly `biography_admin` cookie, password from
`ADMIN_PASSWORD`. Only `upload` is rewritten, onto MinIO presign.

### `POST /api/admin/login`

`{ "password": "…" }` → `{ "ok": true }` and an httpOnly `biography_admin` cookie
(8 h, `sameSite: lax`, `secure` in production). `401` on a wrong password.

### `DELETE /api/admin/login`

Clears the cookie. `{ "ok": true }`.

### `GET /api/admin/content`

All `biography_content` rows as `{ "content": [ { "id", "section", "content", "updatedAt" } ] }`.

### `POST /api/admin/content`

`{ "section": "Memory archive", "content": { … } }` — upserts on `section`.
`400` when `section` is missing or `content` is not an object.

### `POST /api/admin/upload`

Now MinIO-backed. Multipart rather than JSON, since the dashboard shows a
filename.

| part | rules |
| --- | --- |
| `file` | must be a `File` with an `image/` type, ≤ 10 MB |
| `section` | optional label, sanitised to `[a-z0-9-]` |

```json
{ "url": "/api/images/posts/2026/…png", "key": "posts/2026/…png", "section": "memory-archive" }
```

Server-side upload rather than presign, so the dashboard stays a single-form
page with no progress state. The public composer uses the presign flow instead.

---

## Zod error mapping

`issues[].path` is the field path, so the client can attach the message to the
right input:

| path | example message |
| --- | --- |
| `['title']` | `Title is required` |
| `['mediaIds']` | `An album needs at least 2 images` |
| `['moodScore']` | `Mood intensity must be between 1 and 10` |
| `['type']` | `Choose one of the 8 entry types` |

The store keeps the first message per field; the composer renders it under the
input in `.create-error`.
