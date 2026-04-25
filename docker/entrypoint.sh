#!/bin/sh
set -e

echo "[entrypoint] running database bootstrap (migrations + admin)"
node /app/bootstrap.cjs

echo "[entrypoint] starting Next.js server on :${PORT:-3000}"
exec node /app/server.js
