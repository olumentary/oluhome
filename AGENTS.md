# OluHome

Multi-tenant SaaS for antique and decorative arts collection management. Next.js 15 (App Router), TypeScript strict, Tailwind CSS 4, Vercel Postgres (Neon) via Drizzle ORM, Linode Object Storage (S3-compatible), Vercel Flags SDK.

## Setup

```bash
pnpm install
cp .env.example .env.local          # then fill in credentials
pnpm tsx src/db/migrate.ts          # apply migrations to a fresh DB
pnpm tsx src/db/seed.ts              # seed plan_limits + default item types
pnpm tsx src/db/create-admin.ts --email=admin@example.com --password=changeme
pnpm dev                             # http://localhost:3000
```

(For first-time onboarding against a throwaway local DB you can substitute `pnpm drizzle-kit push` for the migrate step — but see "Database schema changes" below: never use `push` after that point.)

## Commands

```bash
pnpm dev                             # Next.js dev server, port 3000
pnpm build                           # production build — catches all type errors
pnpm lint                            # ESLint
pnpm drizzle-kit generate            # REQUIRED for every schema change — writes SQL + journal
pnpm drizzle-kit push                # local-only experimentation; never use after a schema change
pnpm drizzle-kit studio              # visual DB browser at local.drizzle.studio
pnpm tsx src/db/seed.ts              # re-seed reference data
pnpm tsx src/db/migrate.ts           # apply pending migrations against DATABASE_URL
```

## Architecture

- `src/app/(auth)/` — login, register (public)
- `src/app/(dashboard)/` — authenticated app (sidebar layout)
- `src/app/(marketing)/` — landing page, pricing (public, future)
- `src/app/share/[token]/` — public shared views, no auth
- `src/app/.well-known/vercel/flags/` — Vercel Flags SDK discovery endpoint
- `src/app/api/` — API routes (upload, AI, PDF, Stripe webhooks)
- `src/components/ui/` — shadcn/ui primitives
- `src/components/{domain}/` — domain components (items, vendors, analytics, pdf, ai, subscription)
- `src/db/schema.ts` — all Drizzle tables, enums, relations in one file
- `src/db/index.ts` — singleton Drizzle client via Neon serverless Pool
- `src/lib/` — shared utilities (storage, ai, pdf, plans, usage, validators, share, stripe)
- `src/flags.ts` — Vercel Flags SDK flag definitions
- `src/types/index.ts` — shared types, Drizzle inferred types

Full architecture doc: `docs/oluhome-architecture.md`

## Coding Conventions

- TypeScript strict mode. No `any`. Infer types from Drizzle schema.
- Server Components by default. Add `"use client"` only when React hooks or event handlers are needed.
- All database access via Drizzle ORM in Server Components or Server Actions. Never query from client components.
- Every data query must include a `WHERE user_id = ?` clause scoped to the authenticated user. This is the multi-tenancy contract. Use `requireAuth()` from `src/lib/auth-helpers.ts` to get the session user, then pass `userId` to all query functions. No exceptions.
- Forms: React Hook Form + Zod. Base item schema is static; custom fields generate a dynamic Zod schema at runtime via `generateDynamicSchema()` in `src/lib/validators.ts`.
- Custom item fields: `collection_item_types.field_schema` (JSONB) defines the schema; `collection_items.custom_fields` (JSONB) stores values.

### Database schema changes

**Every schema change in `src/db/schema.ts` must be accompanied by a generated migration.** Self-hosted (Docker) installs apply schema strictly through Drizzle's migrator at container boot — anything missing from `src/db/migrations/` (and `meta/_journal.json`) is invisible to those installs and produces "column does not exist" errors at runtime.

Workflow:

1. Edit `src/db/schema.ts`.
2. Run `pnpm drizzle-kit generate --name=<short_descriptor>`. This writes a new `NNNN_<name>.sql`, a matching `meta/NNNN_snapshot.json`, and appends an entry to `meta/_journal.json` — all three must be committed together.
3. Verify locally: `pnpm tsx src/db/migrate.ts` against a fresh DB. Then check the schema: `pnpm drizzle-kit studio`.
4. Commit schema + migration + journal in the same commit.

`drizzle-kit push` is reserved for local-only experimentation against a throwaway DB. **Never run `push` against a database whose schema other people or the production migrator depend on** — it sync-applies schema directly, bypassing the journal, and produces drift that surfaces as runtime errors on every fresh install.

Hand-written migrations (triggers, functions, custom SQL drizzle can't generate) must still be created via `pnpm drizzle-kit generate --custom --name=<name>` so the journal entry and snapshot are produced. Add `--> statement-breakpoint` between top-level statements; the migrator splits on those markers.

To detect drift at any point: `pnpm drizzle-kit generate --name=check` against the current schema. An empty (or skipped) migration means the migration files match the schema. Any SQL produced is the gap — keep it (rename to `--name=<descriptive>`) and commit, or revert the schema change if unintended.
- S3 keys namespaced by user: `{userId}/items/{itemId}/photos/{photoId}/{filename}`
- Feature flags: Vercel Flags SDK (`flags/next`). All flags in `src/flags.ts`. Evaluate server-side only. Pass resolved booleans to client components as props, never the flag function.
- shadcn/ui components in `src/components/ui/`. Never modify these directly — extend via wrapper components.
- Prefer named exports over default exports, except for Next.js page/layout/route files which require default exports.
- Commit messages: imperative mood, under 72 chars. Example: `Add vendor detail page with purchase history`

## Testing

- `pnpm build` is the primary verification — it catches all TypeScript errors and build failures.
- `pnpm lint` for ESLint violations.
- `pnpm drizzle-kit studio` to visually verify database state after schema or seed changes.
- No test framework is configured in the initial build. When adding tests, use Vitest + React Testing Library.

## Styling

- Design system: "Refined Catalog" — clean, structured, professional
- Supports light mode + dark mode. Default follows OS. Manual choice persists in localStorage.
- Theme management: `next-themes` with `attribute="class"` and `defaultTheme="system"`
- All colors via CSS custom properties — never hardcode hex in components
- Primary: `#2E3D6B` (both modes). Primary-light: `#818AA6`
- Background: `#FDF9F2` (light) / `#181A21` (dark)
- Surface (cards): `#FFFFFF` (light) / `#20232C` (dark)
- Text: `#1C1E26` (light) / `#E8E6E1` (dark). Muted: `#6B6E7B` / `#9B9DA6`
- Border: `#E0DDD6` (light) / `#353845` (dark)
- Status: success `#4B8C5A`, warning `#BEA03C`, danger `#AF504B`
- Font: Inter (variable) — sole typeface. Weight variation for hierarchy, not multiple fonts.
- Sidebar: `--primary` (#2E3D6B) background, white text (both modes)
- Buttons: primary = `--primary` bg + white text. Secondary = transparent + border. Danger = `--danger`

## Feature Flags

Flags are defined in `src/flags.ts` using the Vercel Flags SDK. They evaluate server-side only.

| Flag | Default | Purpose |
|------|---------|---------|
| `ai-enabled` | `false` | Global kill switch for AI analysis features |
| `ai-beta-access` | per-user | User-targeted AI access (admin always true) |
| `registration-open` | `false` | Controls public registration |
| `subscriptions-enabled` | `false` | Enables plan limit enforcement + billing UI |

When `ai-enabled` is false: hide AI Analysis tab, return 403 from `/api/ai/analyze`, hide bulk analyze actions. All AI code is built and functional but invisible.

## Important Constraints

- Never expose `ANTHROPIC_API_KEY`, `FLAGS_SECRET`, or any secret in client-side code or `NEXT_PUBLIC_*` variables.
- Never commit `.env.local` or any file containing credentials.
- `@react-pdf/renderer` only works server-side (API routes / Server Actions). Do not import it in client components.
- Linode Object Storage presigned URLs require CORS on the bucket. If browser uploads fail, check CORS config.
- Add Linode hostname to `next.config.ts` `images.remotePatterns` for `next/image`.
- The `plan_limits` table is a reference table seeded once. Do not insert rows from application code.
- Default item types have `user_id = null` (system defaults). They are cloned per-user on registration. Never modify system defaults at runtime.
- Tailwind CSS 4 uses `@import "tailwindcss"` syntax, not the v3 `@tailwind` directives.
