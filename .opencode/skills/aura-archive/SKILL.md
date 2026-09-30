---
name: aura-archive
description: Use when working in the Aura Next.js repo on posts, profiles, feeds, uploads, MinIO, Neon, or Drizzle — creating or changing a post type, editing app/create, app/profile, app/page.tsx, app/search, app/dashboard, lib/, store/, or the app/api routes. Covers the layer boundaries, the mock fallback, the closed 8-type post union, presigned upload flow, and the hand-written CSS rules that break the obvious approaches.
---

# Working in Aura

A cinematic digital biography. Next.js 16 App Router, one app, no monorepo.
Dark editorial design: grayscale, serif display type, monospace labels, a lot of
negative space. Read `architecture.md`, `plan.md`, `api.md`, and `phase.md` before
making structural changes.

## The rule that breaks things if ignored

**Client components never import `lib/db.ts` or `lib/schema.ts`.**

`lib/db.ts` uses `drizzle-orm/neon-http`, which is fetch-based and pulls in
`@neondatabase/serverless`. Import it into anything under a `'use client'`
directive and the client bundle pulls the driver in and the page breaks at
runtime, not at build time.

The dependency direction is fixed:

```
server component ──▶ lib/api.ts ──▶ lib/db.ts ──▶ Neon
       │                                  ▲
       └──▶ view models             (server only)
client component ──▶ lib/client-api.ts (axios) ──▶ app/api/** ──▶ lib/api.ts
client component ──▶ lib/validation/*  (zod, safe both sides)
```

- `lib/api.ts` is the **only** module that queries. Nothing else calls `db.select`.
- `lib/api.ts` returns view models from `lib/mappers.ts`, never Drizzle rows.
- A server component fetches initial data and passes plain objects as props.

## The closed post-type union

Exactly 8 types, and the set is closed:

| kind | types | CSS |
| --- | --- | --- |
| `image` | `memory`, `achievement`, `mood`, `feeling`, `album` | `feed-post-<type>` |
| `literary` | `quote`, `poem`, `note` | `literary-card-<type>` |

`lib/post-types.ts` is the single source of truth — label, kind, blurb, image
rules, and the per-type zod shape. `post_types` in the database is seeded from
that same constant, so the composer's dynamic form and the validator cannot
drift. If you add a type, you are editing a closed union in three places and you
must also add the CSS rule, or the card renders unstyled.

Per-type validation rules that are easy to forget: `mood` and `feeling` require
`moodScore` (1–10), `album` requires 2–10 media, `note` rejects images, `quote`
allows at most one.

## The no-database fallback is deliberate

`lib/db-safe.ts` returns `null` when `DATABASE_URL` is unset, and every reader in
`lib/api.ts` falls back to `lib/people.ts`. This is not laziness — `next build`
renders pages, so a hard database dependency breaks the build for anyone who has
not configured Neon yet. Writes return `503` with a clear message instead.

`lib/people.ts` is seed data plus the no-database fallback, not the live data
source. Adding content there seeds the database; it does not add content to a
configured deployment on its own.

## Uploads: three steps, and bytes never touch Next

```
POST /api/uploads/presign    → { key, uploadUrl, headers }
PUT  <uploadUrl>             → browser → MinIO directly
POST /api/uploads/complete   → creates the media row, returns mediaId
```

- The presigned key is server-generated as `posts/<year>/<uuid>.<ext>`, with the
  extension derived from `contentType`, never from user input.
- Do not "simplify" this into a multipart form upload for the public composer.
  That is what `/api/admin/upload` is for; the composer needs progress events.
- `POST /api/uploads/complete` must stay idempotent-safe: `409` if the key
  already has a media row, `404` if the object is not in the bucket.
- Images are served back through `GET /api/images/[...key]`, which streams from
  MinIO with `immutable` caching. The browser never sees `localhost:9000`, which
  is what lets the bucket stay private and keeps dev and production identical.
- `mediaUrl()` prefers `media.publicPath` over the MinIO key. That is how the
  seed reuses the existing 2 MB PNGs in `public/images/` instead of re-uploading
  them. Reuse those assets; do not add new images to `public/`.

Routes that touch the `minio` SDK need `export const runtime = 'nodejs'`, and
`next.config.mjs` sets `serverExternalPackages: ['minio']`.

## Auth: two unrelated systems

- Better Auth email/password — `lib/auth.ts`, catch-all `app/api/auth/[...all]`,
  schema from `pnpm dlx auth@latest generate` in `lib/auth-schema.ts`. Sign-up
  creates a linked `people` row (`people.userId`). `lib/session.ts` maps the
  Better Auth session to that profile for compose/star/upload.
- `biography_admin` — the dashboard, gated on `ADMIN_PASSWORD`. Do not merge
  these. Authors sign in at `/login`; the dashboard stays separate.

## Styling is hand-written CSS

Tailwind v4 is installed and `@import 'tailwindcss'` is present, but **no page
uses a single utility class**. `className="flex gap-4 text-sm"` silently matches
nothing.

- Semantic classes in `app/globals.css`, which is written one rule per line with
  no blank lines between rules. Match that format exactly.
- Reuse the `:root` variables: `--ink`, `--paper`, `--muted`, `--line`,
  `--serif`, `--sans`, `--mono`.
- The existing grayscale/serif editorial treatment is the design. Do not add
  colour, do not add rounded corners, do not add shadows the neighbours lack.
- Small uppercase mono labels use `feed-kicker`, `section-kicker`, or
  `profile-eyebrow`. State classes are `is-loaded`, `is-selected`, `is-active`.
- `app/dashboard/dashboard.css` is a separate file imported by the dashboard
  page. `app/dashboard/dashboard.module.css` is dead — nothing imports it.
- `components/ui/button.tsx` is unused by every page. `cn()` in `lib/utils.ts`
  exists only for it. Do not reach for either.

## Verification

```bash
npx tsc --noEmit    # the ONLY type check
pnpm build          # typescript.ignoreBuildErrors is true, so this proves little
```

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so **`next build`
succeeds even when types are broken**. Always run `npx tsc --noEmit` yourself.
There is no lint script, no test framework, and no CI config.

Package manager is pnpm. An untracked `package-lock.json` and an npm-installed
`node_modules` may be present; do not commit them and do not reinstall with npm.

Next 16 async request APIs — keep `await params` and `await cookies()`. Returning
the promise directly no longer works.

## Gotchas

- `components.json` declares a `@/hooks` alias, but no `hooks/` directory exists.
- `next.config.mjs` sets `images.unoptimized: true` and every page uses plain
  `<img>`. Do not introduce `next/image`.
- Images in `public/images/*.png` are roughly 2 MB each.
- `lib/db.ts` resolves the connection lazily. Do not make it throw at import time
  or the mock fallback dies with it.
