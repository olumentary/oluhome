# OluHome

Also read `AGENTS.md` in this directory for setup, architecture, conventions, styling, and constraints. This file contains Claude Code-specific additions only.

## Commands

- `pnpm dev` — dev server (port 3000)
- `pnpm build` — production build, catches type errors
- `pnpm lint` — ESLint
- `pnpm drizzle-kit generate` — **REQUIRED for every schema change** (writes SQL + journal + snapshot)
- `pnpm drizzle-kit push` — local-only experimentation; never use after a schema change
- `pnpm drizzle-kit studio` — visual DB browser
- `pnpm tsx src/db/migrate.ts` — apply pending migrations against `DATABASE_URL`
- `pnpm tsx src/db/seed.ts` — seed reference data
- `pnpm tsx src/db/create-admin.ts --email=... --password=...` — create admin user

## Schema changes — non-negotiable

Every edit to `src/db/schema.ts` must be paired with `pnpm drizzle-kit generate --name=<descriptor>` in the same commit. That writes the SQL file, the snapshot, and the journal entry — all three must be committed together. Self-hosted Docker installs apply schema strictly through the migrator; anything missing from the migration files is invisible to them and produces `column does not exist` errors at runtime. `drizzle-kit push` is fine for throwaway local experimentation, never after that point. To detect drift: `pnpm drizzle-kit generate --name=check` — empty result means schema matches migrations. See AGENTS.md "Database schema changes" for the full workflow.

## Key Patterns

- `requireAuth()` → returns `{ id, email, name, role, plan }` or redirects. Use at the top of every server action and page.
- `fetchItemForPdf(itemId, userId)` → item with all relations for PDF. Always pass userId.
- Default item types: `user_id = null` in DB. Cloned per-user on registration.
- `plan_limits` is seeded once. `usage_tracking` has one row per user per month.
- Share tokens: nanoid(21), scoped to item/room/collection. Validation returns owner's userId for scoped queries.
- PDF templates are `@react-pdf/renderer` React components, server-side only.
- AI analysis: structured JSON in `ai_analyses.response` (JSONB). Never auto-applied — user confirms.
- Feature flags: `src/flags.ts` via Vercel Flags SDK. Evaluate server-side. Pass resolved booleans as props to client components.

## Deployment targets

Two supported: Vercel (default) and self-hosted Docker (`docker compose up`).
Selection is runtime-only — the same codebase runs either. See `README.docker.md`.

- **DB driver**: `src/db/index.ts` picks `neon-serverless` (Vercel) or `node-postgres` (Docker) via `DB_DRIVER` env var or hostname sniff (`.neon.tech`).
- **Storage driver**: `src/lib/storage/index.ts` picks `s3` (Linode, default) or `local` (filesystem + signed `/api/files/...` route) via `STORAGE_DRIVER`.
- **Flags**: when `FLAGS` env absent, `src/flags.ts` reads `OLUHOME_*` env vars instead of calling the Vercel adapter. Defaults match Vercel behavior.
- **Boot-time bootstrap**: `src/db/bootstrap.ts` (compiled to `bootstrap.cjs` in the Docker image) runs migrations, seeds `plan_limits`, and optionally creates an admin from `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` — all idempotent.

## Gotchas

- Drizzle + Neon: use `@neondatabase/serverless` Pool, not `pg`. Connection string needs `?sslmode=require`.
- `@react-pdf/renderer` fails in client components. Keep it in API routes / Server Actions.
- Linode presigned uploads fail silently without CORS. Check bucket CORS config first.
- Add Linode hostname to `next.config.ts` `images.remotePatterns` for `next/image`.
- shadcn/ui `Select` needs explicit `value` prop for controlled usage.
- Tailwind v4: `@import "tailwindcss"` not `@tailwind base/components/utilities`.

## When Compacting

Always preserve: the complete list of modified files, current database schema state, any failing test output, and the active feature branch name.
