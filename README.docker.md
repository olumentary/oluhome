# Self-hosting Curiolu with Docker

Curiolu ships with a Docker setup that runs the whole app — Next.js, Postgres,
and local file storage — with `docker compose up`. No cloud services required.

## Prerequisites

- Docker Engine 24+ with the Compose plugin
- ~1 GB disk for the built image
- Port 3000 free on the host (configurable via `APP_PORT`)

## First-time setup

```sh
cp .env.docker.example .env
# edit .env — at minimum set POSTGRES_PASSWORD, AUTH_SECRET, and the admin creds
openssl rand -base64 32     # paste the result as AUTH_SECRET

docker compose up -d --build
docker compose logs -f app  # watch boot: migrations + admin bootstrap
```

The first run:
1. Starts Postgres and waits for healthcheck.
2. Runs `bootstrap.cjs` inside the app container — applies Drizzle migrations
   (idempotent), seeds `plan_limits`, and creates the admin user if
   `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` are set.
3. Starts `next start` on port 3000.

Open `http://localhost:3000` and sign in with the admin credentials from `.env`.

## What's different from the Vercel deployment

| Concern        | Vercel path                       | Docker path                       |
| -------------- | --------------------------------- | --------------------------------- |
| Database       | Neon (`@neondatabase/serverless`) | Postgres 16 in a sibling service  |
| File storage   | Linode Object Storage (S3)        | Local filesystem volume           |
| File URLs      | S3 presigned                      | HMAC-signed `/api/files/...` URLs |
| Feature flags  | Vercel Flags dashboard            | `CURIOLU_*` env vars              |
| Admin creation | Manual CLI command                | Auto on first boot (env-driven)   |

The same codebase supports both. Driver selection happens at process start:
- `DB_DRIVER=node-postgres` picks the `pg` driver; otherwise the URL hostname
  is sniffed (`.neon.tech` → `neon-serverless`).
- `STORAGE_DRIVER=local` picks the filesystem adapter; default is `s3`.

## Data persistence

- **Database:** named volume `db-data` (managed by Docker).
- **Uploads:** bind mount `./data/uploads` on the host. Back both up together.

```sh
# Back up the DB
docker compose exec db pg_dump -U curiolu curiolu > backup.sql

# Back up uploads
tar czf uploads.tar.gz ./data/uploads
```

## Common operations

```sh
# Follow app logs
docker compose logs -f app

# Re-seed plan_limits / re-run bootstrap (safe to run anytime)
docker compose exec app node bootstrap.cjs

# Rebuild after code changes
docker compose build app && docker compose up -d app

# Stop everything (data survives)
docker compose down

# Nuke everything including the database volume
docker compose down -v
```

## Updating

```sh
git pull
docker compose build app
docker compose up -d app
```

Migrations run automatically on container start.

## Notes

- `BOOTSTRAP_ADMIN_PASSWORD` sits in `.env`. After the first boot, the user
  exists in the DB and the env value is no longer consulted — feel free to
  clear it. Leaving it set is also fine; bootstrap skips creation when the
  email is already taken.
- The signed-URL file route uses `AUTH_SECRET`. Changing `AUTH_SECRET`
  invalidates every outstanding upload/download URL (existing files are
  unaffected — only in-flight links break).
- To run against a remote Postgres instead of the bundled one, set
  `DATABASE_URL` in `.env` and remove the `db` service dependency from
  `docker-compose.yml` (or leave it unused).

## Publishing an image

`.github/workflows/docker-publish.yml` builds and pushes to GHCR
(`ghcr.io/<owner>/<repo>`) on:

- every push to `main` (→ tagged `latest` and `sha-<short>`)
- every pushed git tag matching `v*` (→ tagged `1.2.3`, `1.2`, `1`)
- manual dispatch from the Actions tab

No secrets needed — it uses the built-in `GITHUB_TOKEN` with `packages: write`.
First run: after the first successful push, visit the repo's **Packages**
page and set the image's visibility to public if you want it pullable without
auth. linux/amd64 only by default; add `linux/arm64` to the `platforms:` line
in the workflow if you need ARM.

## Running on Unraid

The two-service setup (app + Postgres) runs cleanly under the **Docker
Compose Manager** plugin (install from Community Applications).

1. Publish the image (see above), or push to `main` and wait for Actions.
2. In Compose Manager → Add New Stack → paste the contents of
   `docker-compose.prod.yml`. It references the GHCR image instead of
   building locally.
3. Add stack env vars (Compose Manager UI → Edit → Env) — at minimum:
   - `POSTGRES_PASSWORD`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `APP_URL` — **the public URL users hit** (e.g. `https://curiolu.example.com`),
     not the LAN IP. Signed file URLs embed this value.
   - `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (first boot only)
4. Compose Up.

Data persistence:

- DB volume defaults to `/mnt/user/appdata/curiolu/db`
- Uploads default to `/mnt/user/appdata/curiolu/uploads`

Override either with `DB_DATA_DIR` / `UPLOADS_DIR` env vars. These land on
the Unraid array and are included in standard appdata backups.

Reverse proxy (HTTPS):

Put Unraid's reverse-proxy plugin (SWAG, NPM, or Nginx Proxy Manager) in
front and forward `curiolu.your-domain` → `curiolu-app:3000` on the
Docker network. Make sure `APP_URL` matches the public HTTPS URL — NextAuth
rejects logins when the host header doesn't match.

Updating:

```sh
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Migrations run automatically on the new container's first boot. Pin a
version tag (e.g. `IMAGE_TAG=v1.0.0`) in your stack env instead of `latest`
if you don't want Unraid's nightly update checker to surprise you.
