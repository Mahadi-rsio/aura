# Aura — agent notes

## Commands

- `pnpm dev` — Next 16 dev server (Turbopack), http://localhost:3000
- `pnpm build` / `pnpm start`
- `npx tsc --noEmit` — **the only type check.** `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `next build` succeeds even when types are broken. Always run tsc yourself.
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:studio` — drizzle-kit. `pnpm db:seed` runs `lib/seed.ts`.
- `drizzle.config.ts` loads `.env.local` then `.env` via `dotenv`, so db scripts pick up `DATABASE_URL` without exporting it.
- No lint script, no test framework, no CI config. `next build` is the only other verification available.
- Package manager is pnpm (`packageManager: pnpm@12.3.4`, `pnpm-lock.yaml` is the committed lockfile). Some checkouts also contain an untracked `package-lock.json` and an npm-installed `node_modules` — don't commit it or reinstall with npm.
- `pnpm-workspace.yaml` is **not** a monorepo — it only holds pnpm policy (`allowBuilds: esbuild: true` is required or esbuild's postinstall is skipped).

## Architecture

Single Next.js 16 App Router app. Data layer is Drizzle over **Neon** (`DATABASE_URL`) and **MinIO / S3-compatible storage** (`MINIO_*`). Vercel Blob is gone.

- `lib/schema.ts` — every table. `lib/db.ts` exports `getDb()`/`requireDb()`; **`lib/db.ts` imports `ws` and uses `drizzle-orm/neon-serverless` (WebSocket `Pool`), not `neon-http`**, because `createPost` runs `db.transaction(...)` and HTTP has no transactions. `neonConfig.webSocketConstructor = ws` keeps it working on Node 20 runtimes.
- `lib/db-safe.ts` — `requireDb()` throws `DatabaseUnavailableError` (`503`) when `DATABASE_URL` is unset. Reads fall back to `lib/people.ts`.
- `lib/api.ts` — the only module that queries. Feed/profile/search/collections readers fall back to the `lib/people.ts` mock arrays when there is no database; writes never do.
- `lib/post-types.ts` — the closed 8-type catalog (`feeling`, `memory`, `achievement`, `mood`, `album`, `quote`, `poem`, `note`) with per-type image rules. `lib/validation/posts.ts` builds the Zod schemas from it.
- `app/api/` — the whole backend: `session`, `posts`, `posts/[slug]` (+ `/star`, `/share`), `search`, `uploads/{presign,complete}`, `images/[...key]`, `admin/*`. The `[slug]` and `[id]` sibling segments must share one param name — **all are `[slug]`**; star/share receive the post **UUID** under that param.
- `lib/session.ts` — stateless `aura_session` cookie (`userId.expiry.hmac`, `node:crypto` + `SESSION_SECRET`). `ensureUser()` get-or-creates a `people` row with an `aura-<base36>` slug.
- `lib/storage.ts` / `lib/storage-config.ts` — lazy MinIO client. `MINIO_ENDPOINT` starting with `https://` sets `useSSL` on port 443. `mediaUrl(media)` = `publicPath ?? /api/images/<objectKey>`.
- `lib/seed.ts` — idempotent seed (`runSeed()`), auto-runs only when invoked directly. Re-runnable because media dedup keys on `media.sourcePath` (unique), not `publicPath` (nulled after upload), and `post_media` links are re-ensured on every run.
- `drizzle/` — `0000_initial_aura.sql` + `0001_wide_nightcrawler.sql` (adds `media.source_path`). `meta/_journal.json` tags must match the SQL filenames.
- Deploy target is Vercel + Analytics (`.vercel/` ignored).

## Env vars

`.env.example` documents these; `.env*.local` is gitignored (**never commit live keys**).

- `DATABASE_URL` — Neon pooled URL. Required for all writes; without it the app serves the `lib/people.ts` fallback.
- `SESSION_SECRET` — HMAC key for the session cookie. Required for every write path.
- `ADMIN_PASSWORD` — dashboard login (`app/api/admin/login/route.ts`).
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY_ID`, `MINIO_SECRET_ACCESS_KEY`, `MINIO_BUCKET`, `MINIO_REGION` — S3-compatible storage. `MINIO_ENDPOINT=https://host` implies TLS/443.

## Styling is hand-written CSS, not Tailwind

The UI is semantic class names in `app/globals.css` (written one rule per line, no blank lines between rules) plus a separate plain `app/dashboard/dashboard.css` imported by the dashboard page. Tailwind v4 is installed and `@import 'tailwindcss'` is present, but **no page uses Tailwind utility classes** — `className="flex gap-4 text-sm"` will not match the design. Add rules in the existing compressed style, reusing the `:root` variables (`--ink`, `--paper`, `--muted`, `--line`, `--serif`, `--sans`, `--mono`) and the grayscale/serif editorial treatment.

- `app/dashboard/dashboard.module.css` was dead and has been deleted. CSS modules are not the pattern here.
- `components/ui/button.tsx` is shadcn on `@base-ui/react` (not Radix) and is unused by every page. `cn()` in `lib/utils.ts` exists solely for it.
- `next.config.mjs` sets `images.unoptimized: true` and `serverExternalPackages: ['minio']`; pages use plain `<img>`, never `next/image`.
- The CSS branches on `feed-post-<type>` / `literary-card-<type>`; a new type needs a matching rule or it renders unstyled.

## Adding content

At runtime the database is the source of truth. `lib/people.ts` is only the **seed input and the no-database fallback** — edit it (plus run `pnpm db:seed`) to add people/posts, and edit `lib/post-types.ts` to change the type catalog. A new `type` is a closed-union change that also needs `feed-post-<type>` CSS.

## Conventions to match

- Next 16 async request APIs: `await params`, `await cookies()`. Keep it.
- Small uppercase mono labels use `feed-kicker`, `section-kicker`, or `profile-eyebrow`; state classes are `is-loaded` / `is-selected`.
- Bundled images live in `public/images/*.png` (~2MB each); prefer reusing them.
- `.gitignore` and `metadata.generator: 'v0.app'` in `app/layout.tsx` show this was scaffolded with v0.app, which expects `__v0_*` runtime files that are intentionally gitignored.
