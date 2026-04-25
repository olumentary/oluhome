import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import pg from 'pg';
import { join } from 'node:path';
import {
  users,
  planLimits,
  collectionItemTypes,
  usageTracking,
} from './schema';
import { DEFAULT_ITEM_TYPES } from './default-types';

// ---------------------------------------------------------------------------
// Plan-limits seed data (mirrors src/db/seed.ts)
// ---------------------------------------------------------------------------

const PLAN_LIMITS = [
  { plan: 'free' as const, maxItems: 25, maxPhotosPerItem: 3, maxStorageMb: 500, maxCustomTypes: 2, aiAnalysesPerMonth: 5, pdfExportsPerMonth: 10, shareLinksEnabled: false, batchPdfEnabled: false, analyticsEnabled: false, prioritySupport: false },
  { plan: 'pro' as const, maxItems: 250, maxPhotosPerItem: 10, maxStorageMb: 5120, maxCustomTypes: 10, aiAnalysesPerMonth: 50, pdfExportsPerMonth: -1, shareLinksEnabled: true, batchPdfEnabled: true, analyticsEnabled: true, prioritySupport: false },
  { plan: 'premium' as const, maxItems: -1, maxPhotosPerItem: 25, maxStorageMb: 25600, maxCustomTypes: -1, aiAnalysesPerMonth: 200, pdfExportsPerMonth: -1, shareLinksEnabled: true, batchPdfEnabled: true, analyticsEnabled: true, prioritySupport: true },
  { plan: 'admin' as const, maxItems: -1, maxPhotosPerItem: -1, maxStorageMb: -1, maxCustomTypes: -1, aiAnalysesPerMonth: -1, pdfExportsPerMonth: -1, shareLinksEnabled: true, batchPdfEnabled: true, analyticsEnabled: true, prioritySupport: true },
];

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[bootstrap] DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema: { users, planLimits, collectionItemTypes, usageTracking } });

  try {
    // 1. Migrations — idempotent via drizzle's __drizzle_migrations tracking
    const migrationsFolder = process.env.MIGRATIONS_DIR || join(process.cwd(), 'src/db/migrations');
    console.log(`[bootstrap] applying migrations from ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });

    // 2. Plan limits — upsert on conflict
    console.log('[bootstrap] seeding plan limits');
    for (const row of PLAN_LIMITS) {
      await db
        .insert(planLimits)
        .values(row)
        .onConflictDoUpdate({
          target: planLimits.plan,
          set: {
            maxItems: row.maxItems,
            maxPhotosPerItem: row.maxPhotosPerItem,
            maxStorageMb: row.maxStorageMb,
            maxCustomTypes: row.maxCustomTypes,
            aiAnalysesPerMonth: row.aiAnalysesPerMonth,
            pdfExportsPerMonth: row.pdfExportsPerMonth,
            shareLinksEnabled: row.shareLinksEnabled,
            batchPdfEnabled: row.batchPdfEnabled,
            analyticsEnabled: row.analyticsEnabled,
            prioritySupport: row.prioritySupport,
          },
        });
    }

    // 3. Bootstrap admin — only when env vars are set and user doesn't exist.
    //    Idempotent: existing user with the same email is left untouched
    //    (we never overwrite a password).
    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const adminName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Admin';

    if (adminEmail && adminPassword) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, adminEmail))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[bootstrap] admin ${adminEmail} already exists — skipping creation`);
      } else {
        console.log(`[bootstrap] creating admin user ${adminEmail}`);
        const passwordHash = await hash(adminPassword, 12);
        const [admin] = await db
          .insert(users)
          .values({
            email: adminEmail,
            name: adminName,
            passwordHash,
            role: 'admin',
            plan: 'admin',
          })
          .returning({ id: users.id });

        await db.insert(collectionItemTypes).values(
          DEFAULT_ITEM_TYPES.map((t) => ({
            userId: admin.id,
            name: t.name,
            slug: t.slug,
            description: t.description,
            icon: t.icon,
            fieldSchema: t.fieldSchema,
            displayOrder: t.displayOrder,
          })),
        );

        const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await db.insert(usageTracking).values({ userId: admin.id, period });

        console.log(`[bootstrap] admin created: ${adminEmail}`);
      }
    } else {
      console.log('[bootstrap] BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set — skipping admin bootstrap');
    }

    console.log('[bootstrap] done');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[bootstrap] failed:', err);
  process.exit(1);
});
