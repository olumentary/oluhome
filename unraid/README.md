# Curiolu on Unraid

Self-hostable home-inventory and collection-management app. This folder contains
everything needed to install Curiolu on Unraid, either via the Community
Applications store (single-container) or via Docker Compose Manager (full
bundled stack).

- **App image:** `ghcr.io/olumentary/curiolu` (linux/amd64)
- **License:** see the repo root
- **Source:** https://github.com/olumentary/curiolu
- **Issues / support:** https://github.com/olumentary/curiolu/issues

---

## Two install paths — pick one

### Path A: Community Applications (single container + external Postgres) — recommended for most users

1. **Install Postgres first** if you don't already have one. Any of these from
   CA work — pick whichever you already use, or install the official one:
   - `postgresql` (linuxserver.io)
   - `postgresql14` / `postgresql15` / `postgresql16` (the bare official images)
   - Any other Postgres 14+ container
2. Create a database and user for Curiolu inside that Postgres:
   ```sql
   CREATE USER curiolu WITH ENCRYPTED PASSWORD 'pick-a-strong-password';
   CREATE DATABASE curiolu OWNER curiolu;
   ```
3. Open **Apps** in Unraid → search **Curiolu** → **Install**.
4. Fill in the required fields (see the [Environment variable reference](#environment-variable-reference) below).
5. **Apply.** First boot runs database migrations and creates the admin user.

### Path B: Docker Compose Manager (app + Postgres bundled)

If you don't already have a Postgres on Unraid and want the simplest possible
install, use the Compose Manager plugin instead — it brings up both services
with one stack.

1. Install **Docker Compose Manager** from Community Applications.
2. New Stack → paste `docker-compose.prod.yml` from the repo root.
3. Set the required env vars in the stack's Env tab (same names as below;
   `APP_URL`, `AUTH_SECRET`, `POSTGRES_PASSWORD`, `BOOTSTRAP_ADMIN_*`).
4. Compose Up.

The stack uses `/mnt/user/appdata/curiolu/{db,uploads}` for persistent data
by default. Override with `DB_DATA_DIR` and `UPLOADS_DIR` env vars if you want
a different location.

---

## Environment variable reference

### Required at install

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string. Format: `postgres://USER:PASSWORD@HOST:PORT/DB`. `HOST` is the Postgres container's name on the Docker network or its IP. Append `?sslmode=require` if your Postgres requires TLS. |
| `APP_URL` | Public URL the app is reached at, including scheme (e.g. `https://curiolu.example.com` or `http://192.168.1.10:3000`). NextAuth callbacks and signed file URLs are built from this. `AUTH_URL` and `NEXT_PUBLIC_APP_URL` default to this value automatically. |
| `AUTH_SECRET` | 32+ byte random string. Generate with `openssl rand -base64 32`. Signs session cookies and file-access tokens. **Changing it logs every user out** and invalidates outstanding upload/download links (existing files are fine). |

### First-boot admin (idempotent — set once, safe to clear after)

| Variable | Default | Description |
|---|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` | _(empty)_ | Email for the auto-created admin user. Skipped if a user with this email already exists — bootstrap never rotates passwords. |
| `BOOTSTRAP_ADMIN_PASSWORD` | _(empty)_ | Password for the auto-created admin. Set on first install; clear or rotate via the app afterwards. |
| `BOOTSTRAP_ADMIN_NAME` | `Admin` | Display name for the auto-created admin. |

### Driver / storage selection (advanced — defaults are right for Unraid)

| Variable | Default | Description |
|---|---|---|
| `DB_DRIVER` | `node-postgres` | Postgres driver. Leave as default for self-hosted Postgres. Use `neon-serverless` only if `DATABASE_URL` points at Neon's WebSocket endpoint. |
| `STORAGE_DRIVER` | `local` | File storage backend. `local` writes to the Uploads volume; `s3` switches to S3-compatible storage (Linode Object Storage, AWS S3) and requires the `LINODE_*` vars below. |
| `STORAGE_LOCAL_DIR` | `/app/data/uploads` | Filesystem path inside the container where uploads are written. Must match the container side of the Uploads volume mapping. |

### Feature flags (advanced)

When `FLAGS` is unset (the self-hosted default), these env vars drive the
in-app feature flags. Accept `true` / `false` / `1` / `0`.

| Variable | Default | Description |
|---|---|---|
| `CURIOLU_REGISTRATION_OPEN` | `true` | Enables the public `/register` page. Set to `false` for single-user installs. |
| `CURIOLU_AI_ENABLED` | `false` | Global kill switch for AI item analysis. Requires `ANTHROPIC_API_KEY`. |
| `CURIOLU_AI_BETA_ACCESS` | `false` | Per-user AI access flag. Either this or `CURIOLU_AI_ENABLED` must be true for AI access. |
| `CURIOLU_SUBSCRIPTIONS_ENABLED` | `false` | Enables plan-limit enforcement and billing UI. Self-hosters typically leave this off. |

### Optional integrations

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic API key for AI analysis. Format `sk-ant-…`. Only consulted when `CURIOLU_AI_ENABLED=true`. |
| `LINODE_ENDPOINT` | _(empty)_ | S3-compatible endpoint URL. Required when `STORAGE_DRIVER=s3`. |
| `LINODE_BUCKET` | _(empty)_ | S3 bucket name. Required when `STORAGE_DRIVER=s3`. |
| `LINODE_ACCESS_KEY` | _(empty)_ | S3 access key. Required when `STORAGE_DRIVER=s3`. |
| `LINODE_SECRET_KEY` | _(empty)_ | S3 secret key. Required when `STORAGE_DRIVER=s3`. |
| `FLAGS` | _(empty)_ | Vercel Flags SDK secret. Leave unset on Unraid — the self-hosted code path uses the `CURIOLU_*` vars above. |

### Auto-derived (don't set manually unless you have a reason)

| Variable | Source | Description |
|---|---|---|
| `AUTH_URL` | `APP_URL` | NextAuth callback base URL. Falls back to `APP_URL` when unset. Set explicitly only if NextAuth needs a different value than the public `APP_URL`. |
| `NEXT_PUBLIC_APP_URL` | `APP_URL` | Same — defaults from `APP_URL`. |
| `PORT` | `3000` | Container listen port. Don't change unless you also remap the WebUI Port. |
| `HOSTNAME` | `0.0.0.0` | Container bind address. Don't change. |

---

## Volumes

| Container path | Default host path | Notes |
|---|---|---|
| `/app/data/uploads` | `/mnt/user/appdata/curiolu/uploads` | Item photos, receipts, document attachments. Back this up alongside the database. |

---

## Reverse proxy and HTTPS

Curiolu speaks plain HTTP from the container. Put it behind a reverse proxy
(SWAG, NPM, Nginx Proxy Manager, Traefik) for HTTPS:

1. Reverse proxy → forward `curiolu.your-domain` → `curiolu:3000` on the
   Docker network.
2. Set `APP_URL=https://curiolu.your-domain` in the Curiolu container env.
3. Restart Curiolu so signed file URLs use the correct base.

NextAuth rejects logins when the host header doesn't match `AUTH_URL` — keep
`APP_URL` aligned with whatever URL users actually hit.

---

## Backups

Two things to snapshot together:

1. **Database** — `pg_dump` from the Postgres container.
2. **Uploads** — the `/mnt/user/appdata/curiolu/uploads` directory (or wherever
   you mapped it).

A nightly User Scripts entry like:

```sh
docker exec curiolu-db pg_dump -U curiolu curiolu \
  > /mnt/user/backups/curiolu/db-$(date +%F).sql
tar czf /mnt/user/backups/curiolu/uploads-$(date +%F).tar.gz \
  /mnt/user/appdata/curiolu/uploads
```

…covers it.

---

## Updating

- **CA single-container:** Unraid's Docker page shows an "update available"
  badge when a newer image tag is published. Click **Update** — migrations run
  automatically on the next start.
- **Compose Manager:** `Pull → Up` from the stack's actions menu.
- **Pin a version** instead of `latest` to avoid surprise upgrades. Edit the
  template's Repository field to `ghcr.io/olumentary/curiolu:v1.0.0`.

---

## Troubleshooting

- **`[bootstrap] failed: connect ECONNREFUSED`** — `DATABASE_URL` host/port is
  wrong. From the Curiolu container's perspective, the Postgres host is the
  other container's name on the Docker network (e.g. `postgresql14`), not
  `localhost`.
- **403 on uploaded images** — `AUTH_SECRET` was changed. Fresh signed URLs
  are issued automatically; existing browser tabs may still hold stale ones.
  Refresh.
- **Login redirects loop** — `APP_URL` doesn't match the URL in your browser's
  address bar. Update `APP_URL` and restart.
- **Admin login fails on first install** — check the container logs for
  `[bootstrap] admin created: ...` or `[bootstrap] BOOTSTRAP_ADMIN_*  not set`.
  If the latter, set both env vars and restart.
