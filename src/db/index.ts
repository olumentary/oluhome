import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as pgDrizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

function shouldUseNeon(url: string): boolean {
  const explicit = process.env.DB_DRIVER?.toLowerCase();
  if (explicit === 'neon-serverless') return true;
  if (explicit === 'node-postgres') return false;
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

const useNeon = shouldUseNeon(connectionString);

if (process.env.NODE_ENV !== 'test') {
  console.log(`[db] driver=${useNeon ? 'neon-serverless' : 'node-postgres'}`);
}

// Both instances extend PgDatabase with identical query APIs. The Neon HKT
// differs from NodePg only for raw `.execute()` return shapes, which we don't
// depend on. Cast keeps a single unified type at call sites.
export const db = (
  useNeon
    ? neonDrizzle(new NeonPool({ connectionString }), { schema })
    : pgDrizzle(new pg.Pool({ connectionString }), { schema })
) as unknown as NodePgDatabase<typeof schema>;
