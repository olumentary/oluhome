#!/bin/sh
set -e

# When the container starts as root (the default), fix ownership of the
# bind-mounted upload volume and then re-exec ourselves as nextjs.
# Unraid mounts come in owned by 99:100; without this chown the app gets
# EACCES when writing uploads. Idempotent and cheap (chown skips files
# already owned correctly).
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data/uploads
  chown -R nextjs:nodejs /app/data 2>/dev/null || true
  exec su-exec nextjs:nodejs "$0" "$@"
fi

# Single-source-of-truth: when APP_URL is set, default AUTH_URL and
# NEXT_PUBLIC_APP_URL to it. Lets the Unraid CA template (and any other
# single-container deployment) ask the user for one URL instead of three.
if [ -n "$APP_URL" ]; then
  : "${AUTH_URL:=$APP_URL}"
  : "${NEXT_PUBLIC_APP_URL:=$APP_URL}"
  export AUTH_URL NEXT_PUBLIC_APP_URL
fi

# NextAuth and the signed-URL builder both call new URL(AUTH_URL) — without
# a scheme they throw "ERR_INVALID_URL" on the first request, with a stack
# trace pointing at minified Next chunks. Fail loudly here instead.
case "${AUTH_URL:-}" in
  http://*|https://*) ;;
  '')
    echo "[entrypoint] FATAL: APP_URL / AUTH_URL is not set" >&2
    echo "[entrypoint] set APP_URL to the public URL users hit, e.g. https://curiolu.example.com" >&2
    exit 1
    ;;
  *)
    echo "[entrypoint] FATAL: AUTH_URL='${AUTH_URL}' is missing a scheme" >&2
    echo "[entrypoint] add http:// or https:// — e.g. APP_URL=https://${AUTH_URL}" >&2
    exit 1
    ;;
esac

echo "[entrypoint] running database bootstrap (migrations + admin)"
node /app/bootstrap.cjs

echo "[entrypoint] starting Next.js server on :${PORT:-3000}"
exec node /app/server.js
