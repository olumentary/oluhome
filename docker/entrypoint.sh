#!/bin/sh
set -e

# Single-source-of-truth: when APP_URL is set, default AUTH_URL and
# NEXT_PUBLIC_APP_URL to it. Lets the Unraid CA template (and any other
# single-container deployment) ask the user for one URL instead of three.
if [ -n "$APP_URL" ]; then
  : "${AUTH_URL:=$APP_URL}"
  : "${NEXT_PUBLIC_APP_URL:=$APP_URL}"
  export AUTH_URL NEXT_PUBLIC_APP_URL
fi

echo "[entrypoint] running database bootstrap (migrations + admin)"
node /app/bootstrap.cjs

echo "[entrypoint] starting Next.js server on :${PORT:-3000}"
exec node /app/server.js
