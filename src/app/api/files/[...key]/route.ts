import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { verify } from '@/lib/storage/signing';
import { resolveKeyForRouteHandler, localStorageRoot } from '@/lib/storage/local';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isLocalDriver() {
  return (process.env.STORAGE_DRIVER || 's3').toLowerCase() === 'local';
}

function decodeKey(segments: string[]): string {
  return segments.map(decodeURIComponent).join('/');
}

type RouteContext = { params: Promise<{ key: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  if (!isLocalDriver()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { key: segments } = await ctx.params;
  const key = decodeKey(segments);
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig') ?? '';
  if (url.searchParams.get('op') !== 'get' || !verify('get', key, exp, sig)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let resolved;
  try {
    resolved = await resolveKeyForRouteHandler(key);
  } catch {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }
  if (!resolved.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { size } = await stat(resolved.path);
  const nodeStream = createReadStream(resolved.path);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    headers: {
      'Content-Length': String(size),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  if (!isLocalDriver()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { key: segments } = await ctx.params;
  const key = decodeKey(segments);
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig') ?? '';
  const contentType = url.searchParams.get('ct') ?? req.headers.get('content-type') ?? '';
  if (url.searchParams.get('op') !== 'put' || !verify('put', key, exp, sig, contentType)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let resolved;
  try {
    resolved = await resolveKeyForRouteHandler(key);
  } catch {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  await mkdir(dirname(resolved.path), { recursive: true });
  await writeFile(resolved.path, buffer);

  // Suppress unused-var warning — localStorageRoot is re-exported for other callers.
  void localStorageRoot;

  return NextResponse.json({ ok: true, size: buffer.length });
}
