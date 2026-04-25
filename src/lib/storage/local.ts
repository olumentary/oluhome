import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import type { StorageDriver } from './types';
import { sign } from './signing';

const ROOT = process.env.STORAGE_LOCAL_DIR || '/app/data/uploads';
const PUBLIC_BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || '';

export function localStorageRoot(): string {
  return ROOT;
}

function resolveKeyToPath(key: string): string {
  const normalized = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = join(ROOT, normalized);
  const rootWithSep = ROOT.endsWith(sep) ? ROOT : ROOT + sep;
  if (full !== ROOT && !full.startsWith(rootWithSep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return full;
}

function buildSignedUrl(op: 'get' | 'put', key: string, contentType = ''): string {
  const { exp, sig } = sign(op, key, contentType);
  const params = new URLSearchParams({ op, exp: String(exp), sig });
  if (contentType) params.set('ct', contentType);
  const path = `/api/files/${key.split('/').map(encodeURIComponent).join('/')}?${params.toString()}`;
  return PUBLIC_BASE ? `${PUBLIC_BASE.replace(/\/$/, '')}${path}` : path;
}

export const localDriver: StorageDriver = {
  async generatePresignedUploadUrl(key, contentType) {
    return buildSignedUrl('put', key, contentType);
  },

  async generatePresignedDownloadUrl(key) {
    return buildSignedUrl('get', key);
  },

  async getObject(key) {
    const path = resolveKeyToPath(key);
    return readFile(path);
  },

  async putObject(key, body, _contentType) {
    const path = resolveKeyToPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  },

  async deleteObject(key) {
    const path = resolveKeyToPath(key);
    try {
      await unlink(path);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  },

  async deleteObjects(keys) {
    await Promise.all(keys.map((k) => this.deleteObject(k)));
  },
};

export async function resolveKeyForRouteHandler(key: string): Promise<{
  path: string;
  exists: boolean;
}> {
  const path = resolveKeyToPath(key);
  try {
    await access(path);
    return { path, exists: true };
  } catch {
    return { path, exists: false };
  }
}
