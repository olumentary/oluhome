import { createHmac, timingSafeEqual } from 'node:crypto';

const UPLOAD_TTL_SECONDS = 900;   // 15 min
const DOWNLOAD_TTL_SECONDS = 3600; // 1 hour

type Op = 'get' | 'put';

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is required for local storage signing');
  return s;
}

function payload(op: Op, key: string, exp: number, contentType: string): string {
  return `${op}:${key}:${exp}:${contentType}`;
}

export function sign(op: Op, key: string, contentType = ''): { exp: number; sig: string } {
  const ttl = op === 'put' ? UPLOAD_TTL_SECONDS : DOWNLOAD_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const sig = createHmac('sha256', secret())
    .update(payload(op, key, exp, contentType))
    .digest('hex');
  return { exp, sig };
}

export function verify(
  op: Op,
  key: string,
  exp: number,
  sig: string,
  contentType = '',
): boolean {
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac('sha256', secret())
    .update(payload(op, key, exp, contentType))
    .digest('hex');
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}
