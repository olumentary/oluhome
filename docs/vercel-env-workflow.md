# Vercel Environment Variable Workflow

How to keep environment variables in sync across local development, preview deployments, and production on Vercel.

## Mental model

**Vercel is the source of truth.** `.env.local` is a cached pull from Vercel, not something you edit directly for shared values. The repo's `.env.sample` is the human-readable manifest of what variables exist and where to obtain them.

Vercel keeps three separate environments, each with its own values:

- **Production** — used on `main`/production deployments
- **Preview** — used on every PR/branch deployment
- **Development** — pulled to your laptop via `vercel env pull`

A single variable can have different values per environment, or the same value across all three.

## The commands you'll actually use

```bash
# Pull dev env to .env.local (default behavior)
vercel env pull

# Pull a different environment
vercel env pull .env.production.local --environment=production
vercel env pull .env.preview.local --environment=preview

# Add a new variable (interactive — prompts for value + environments)
vercel env add MY_VAR

# Remove a variable
vercel env rm MY_VAR

# List all variables across environments
vercel env ls
```

## Recommended workflow

1. **First-time setup on a machine**
   - Run `vercel link` once to associate the local repo with the Vercel project.
   - Run `vercel env pull` to seed `.env.local` with development values.

2. **Adding a new variable**
   - `vercel env add FOO`
   - When prompted, select which environments it applies to (Production / Preview / Development — any combination).
   - Enter the value per environment when prompted.
   - Run `vercel env pull` locally to refresh `.env.local`.
   - Add the variable name (with a comment, no value) to `.env.sample` so other developers know it exists.

3. **Changing an existing variable**
   - Edit it in the Vercel dashboard (easier for multi-environment edits), or `vercel env rm` followed by `vercel env add`.
   - Re-pull locally with `vercel env pull`.

4. **Marketplace integrations** (Neon, Anthropic, Linode if installed via Marketplace, etc.)
   - Variables are auto-provisioned per environment by the integration.
   - Do **not** add them manually — just `vercel env pull` to retrieve them locally.
   - These often include redundant aliases (e.g. `POSTGRES_URL`, `PGHOST`, `PGUSER` alongside `DATABASE_URL`). They're harmless; don't delete them manually or they'll come right back on the next pull.

5. **OIDC token expiry**
   - `VERCEL_OIDC_TOKEN` is short-lived (~12 hours).
   - If you see auth errors against Vercel-linked services after a long break, run `vercel env pull` to refresh it.

6. **Never commit `.env.local`**
   - It's already in `.gitignore`. Confirm before adding anything new to that file.
   - Use `.env.sample` as the documented list of what variables the project expects.

7. **Diff before deploys when in doubt**
   - The `vercel:env` skill in this repo wraps `pull`, `add`, `remove`, and `diff` — useful for spotting drift between local and remote.

## Special cases in this project

- `DATABASE_URL` is the only DB variable the app reads. The many `POSTGRES_*` and `PG*` aliases in `.env.local` are auto-injected by the Neon Marketplace integration for tool compatibility — ignore them.
- `ANTHROPIC_API_KEY` is read implicitly by `@ai-sdk/anthropic`; it never appears in `process.env.*` calls in code.
- `FLAGS_SECRET` is read implicitly by the Vercel Flags SDK for the Flags Explorer toolbar.
- `VERCEL_OIDC_TOKEN`, `FLAGS`, and `NEON_*` variables are managed by Vercel/Neon — don't edit by hand.
- Self-hosted Docker deployments use a different set of variables entirely (`DB_DRIVER`, `STORAGE_DRIVER`, `BOOTSTRAP_ADMIN_*`, etc.) — see `README.docker.md`.

## CLI version

Keep the Vercel CLI current:

```bash
pnpm add -g vercel@latest
# or
npm i -g vercel@latest
```

Outdated CLI versions can miss newer features and integrations.
