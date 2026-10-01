# Aura — agent notes

## Commands

- `pnpm dev` — Next 16 dev server (Turbopack), http://localhost:3000
- `pnpm build` / `pnpm start`
- `npx tsc --noEmit` — **the only type check.** `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `next build` succeeds even when types are broken. Always run tsc yourself.
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:studio` — drizzle-kit. `pnpm db:seed` runs `lib/seed.ts`.
- `pnpm preview` / `pnpm deploy` / `pnpm upload` — `@opennextjs/cloudflare` build + local workerd preview / deploy to Cloudflare Workers / upload a version. `pnpm cf-typegen` regenerates `cloudflare-env.d.ts`.
- Workers limit is **64 MiB uncompressed, no gzip limit**; `wrangler deploy --dry-run` reports `Total Upload` (uncompressed, ~14 MiB here) and gzip only for reference. The binding constraints are 1 s startup and 128 MB memory, not bundle size.
- `drizzle.config.ts` loads `.env.local` then `.env` via `dotenv`, so db scripts pick up `DATABASE_URL` without exporting it.
- No lint script, no test framework, no CI config. `next build` is the only other verification available.
- Package manager is pnpm (`packageManager: pnpm@12.3.4`, `pnpm-lock.yaml` is the committed lockfile). Some checkouts also contain an untracked `package-lock.json` and an npm-installed `node_modules` — don't commit it or reinstall with npm.
- `pnpm-workspace.yaml` is **not** a monorepo — it only holds pnpm policy (`allowBuilds` allows `esbuild` and `workerd`; without them the postinstall/binary fetch is skipped and install fails).

## Architecture

Single Next.js 16 App Router app. Data layer is Drizzle over **Neon** (`DATABASE_URL`) and **S3-compatible storage** (`MINIO_*`; MinIO locally, Cloudflare R2 or AWS S3 in production). Vercel Blob is gone.

- `lib/schema.ts` — every table. `lib/db.ts` exports `getDb()`/`requireDb()`; it uses `drizzle-orm/neon-serverless` (WebSocket `Pool`), not `neon-http`, because `createPost` runs `db.transaction(...)` and HTTP has no transactions. The pool is created per request via React `cache()` when `NEXT_RUNTIME` is set (Workers must not share a pool across requests); outside Next (`pnpm db:seed`) it falls back to a fresh client. It relies on the native global `WebSocket` — `ws` was removed because it cannot run in workerd.
- `lib/db-safe.ts` — `requireDb()` throws `DatabaseUnavailableError` (`503`) when `DATABASE_URL` is unset. Reads fall back to `lib/people.ts`.
- `lib/api.ts` — the only module that queries. Feed/profile/search/collections readers fall back to the `lib/people.ts` mock arrays when there is no database; writes never do.
- `lib/post-types.ts` — the closed 8-type catalog (`feeling`, `memory`, `achievement`, `mood`, `album`, `quote`, `poem`, `note`) with per-type image rules. `lib/validation/posts.ts` builds the Zod schemas from it.
- `app/api/` — the whole backend: `session`, `posts`, `posts/[slug]` (+ `/star`, `/share`), `search`, `uploads/{presign,complete}`, `images/[...key]`, `admin/*`. The `[slug]` and `[id]` sibling segments must share one param name — **all are `[slug]`**; star/share receive the post **UUID** under that param.
- `lib/auth.ts` / `lib/auth-schema.ts` — Better Auth email/password (CLI-generated schema). `lib/session.ts` resolves the Better Auth session to a `people` row via `people.userId`.
- `lib/storage.ts` / `lib/storage-config.ts` — S3 client built on `aws4fetch` (edge-native; the `minio` SDK and `node:stream` were removed). `storageConfig()` infers path-style for MinIO/AWS and virtual-hosted style for `*.r2.cloudflarestorage.com`; override with `MINIO_FORCE_PATH_STYLE`. `ensureBucket()` HEADs the bucket and only PUTs when missing (R2 buckets are pre-created). `mediaUrl(media)` = `publicPath ?? /api/images/<objectKey>`.
- `lib/seed.ts` — idempotent seed (`runSeed()`), auto-runs only when invoked directly. Re-runnable because media dedup keys on `media.sourcePath` (unique), not `publicPath` (nulled after upload), and `post_media` links are re-ensured on every run.
- `drizzle/` — `0000_initial_aura.sql` + `0001_wide_nightcrawler.sql` (adds `media.source_path`). `meta/_journal.json` tags must match the SQL filenames.
- Deploy target is **Cloudflare Workers** via `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`, `.open-next/`); Vercel Analytics is still used in `app/layout.tsx`.

## Env vars

`.env.example` documents these; `.env*.local` is gitignored (**never commit live keys**).

- `DATABASE_URL` — Neon pooled URL. Required for all writes; without it the app serves the `lib/people.ts` fallback.
- `BETTER_AUTH_SECRET` — Better Auth signing secret. Required for sign-in/sign-up and write paths.
- `BETTER_AUTH_URL` — public app origin (e.g. `http://localhost:3000`).
- `ADMIN_PASSWORD` — dashboard login (`app/api/admin/login/route.ts`).
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY_ID`, `MINIO_SECRET_ACCESS_KEY`, `MINIO_BUCKET`, `MINIO_REGION` — S3-compatible storage. `MINIO_ENDPOINT=https://host` implies TLS/443. On Cloudflare use the R2 S3 endpoint (`https://<account>.r2.cloudflarestorage.com`, `MINIO_REGION=auto`); `MINIO_FORCE_PATH_STYLE` overrides the inferred URL style.
- Cloudflare runtime vars/secrets live in the dashboard (or `.dev.vars` for `pnpm preview`; gitignored). `wrangler.jsonc` enables `nodejs_compat`.

## Styling is hand-written CSS, not Tailwind

The UI is semantic class names in `app/globals.css` (written one rule per line, no blank lines between rules) plus a separate plain `app/dashboard/dashboard.css` imported by the dashboard page. Tailwind v4 is installed and `@import 'tailwindcss'` is present, but **no page uses Tailwind utility classes** — `className="flex gap-4 text-sm"` will not match the design. Add rules in the existing compressed style, reusing the `:root` variables (`--ink`, `--paper`, `--muted`, `--line`, `--serif`, `--sans`, `--mono`) and the grayscale/serif editorial treatment.

- `app/dashboard/dashboard.module.css` was dead and has been deleted. CSS modules are not the pattern here.
- The shadcn UI scaffolding was deleted: `components/ui/button.tsx`, `lib/utils.ts` (`cn()`), and `components.json` were unused by every page, and the `@base-ui/react`/`class-variance-authority`/`clsx`/`tailwind-merge`/`shadcn`/`tw-animate-css` deps were removed to keep the Worker bundle small. `app/globals.css` no longer imports `tw-animate-css` or `shadcn/tailwind.css` (no utility classes are used). Don't reintroduce them without checking the bundle size.
- `next.config.mjs` sets `images.unoptimized: true` and calls `initOpenNextCloudflareForDev()`; pages use plain `<img>`, never `next/image`.
- The CSS branches on `feed-post-<type>` / `literary-card-<type>`; a new type needs a matching rule or it renders unstyled.

## Adding content

At runtime the database is the source of truth. `lib/people.ts` is only the **seed input and the no-database fallback** — edit it (plus run `pnpm db:seed`) to add people/posts, and edit `lib/post-types.ts` to change the type catalog. A new `type` is a closed-union change that also needs `feed-post-<type>` CSS.

## Conventions to match

- Next 16 async request APIs: `await params`, `await cookies()`. Keep it.
- Small uppercase mono labels use `feed-kicker`, `section-kicker`, or `profile-eyebrow`; state classes are `is-loaded` / `is-selected`.
- Bundled images live in `public/images/*.png` (~2MB each); prefer reusing them.
- `.gitignore` and `metadata.generator: 'v0.app'` in `app/layout.tsx` show this was scaffolded with v0.app, which expects `__v0_*` runtime files that are intentionally gitignored.
