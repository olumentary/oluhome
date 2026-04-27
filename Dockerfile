## syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# deps — install all dependencies (including dev) for the build
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# builder — next build + esbuild bundle of the bootstrap script
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js standalone server bundle
RUN pnpm build

# Bundle the DB bootstrap script into a single self-contained CJS file.
# Uses esbuild from the tsx dependency tree; marks pg-native as external since
# we never require it (pg ships a pure-JS fallback).
RUN pnpm exec esbuild src/db/bootstrap.ts \
      --bundle \
      --platform=node \
      --target=node24 \
      --format=cjs \
      --outfile=bootstrap.cjs \
      --external:pg-native

# ---------------------------------------------------------------------------
# runner — minimal runtime image
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# su-exec lets the entrypoint drop privileges from root → nextjs after fixing
# bind-mount ownership at boot (Unraid mounts come in as 99:100, not 1001).
RUN apk add --no-cache su-exec \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone output: server.js + the traced subset of node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Bootstrap bundle and the SQL migration files it applies at boot
COPY --from=builder --chown=nextjs:nodejs /app/bootstrap.cjs ./bootstrap.cjs
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations

# Entrypoint
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Default upload volume target (bind-mounted by docker-compose)
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data

# Container starts as root so the entrypoint can chown the bind-mounted
# /app/data volume; entrypoint then drops to nextjs via su-exec before
# running bootstrap.cjs and the Next.js server.

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
