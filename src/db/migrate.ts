import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
  }

  const migrationsFolder = process.env.MIGRATIONS_DIR || join(process.cwd(), 'src/db/migrations');
  console.log(`[migrate] applying migrations from ${migrationsFolder}`);

  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder });
    console.log('[migrate] done');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
