import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { users, collectionItemTypes, planLimits } from './schema';
import { DEFAULT_ITEM_TYPES } from './default-types';

// ---------------------------------------------------------------------------
// DB connection (standalone script — not the singleton from index.ts)
// ---------------------------------------------------------------------------

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

// ---------------------------------------------------------------------------
// Plan limits data
// ---------------------------------------------------------------------------

const planLimitsData = [
  {
    plan: 'free' as const,
    maxItems: 25,
    maxPhotosPerItem: 3,
    maxStorageMb: 500,
    maxCustomTypes: 2,
    aiAnalysesPerMonth: 5,
    pdfExportsPerMonth: 10,
    shareLinksEnabled: false,
    batchPdfEnabled: false,
    analyticsEnabled: false,
    prioritySupport: false,
  },
  {
    plan: 'pro' as const,
    maxItems: 250,
    maxPhotosPerItem: 10,
    maxStorageMb: 5120,
    maxCustomTypes: 10,
    aiAnalysesPerMonth: 50,
    pdfExportsPerMonth: -1, // unlimited
    shareLinksEnabled: true,
    batchPdfEnabled: true,
    analyticsEnabled: true,
    prioritySupport: false,
  },
  {
    plan: 'premium' as const,
    maxItems: -1, // unlimited
    maxPhotosPerItem: 25,
    maxStorageMb: 25600,
    maxCustomTypes: -1, // unlimited
    aiAnalysesPerMonth: 200,
    pdfExportsPerMonth: -1, // unlimited
    shareLinksEnabled: true,
    batchPdfEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
  },
  {
    plan: 'admin' as const,
    maxItems: -1,
    maxPhotosPerItem: -1,
    maxStorageMb: -1,
    maxCustomTypes: -1,
    aiAnalysesPerMonth: -1,
    pdfExportsPerMonth: -1,
    shareLinksEnabled: true,
    batchPdfEnabled: true,
    analyticsEnabled: true,
    prioritySupport: true,
  },
];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let userEmail = '';
  for (const arg of args) {
    if (arg.startsWith('--user-email=')) userEmail = arg.slice('--user-email='.length);
  }
  return { userEmail };
}

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seed() {
  const { userEmail } = parseArgs();

  console.log('🌱 Seeding database...\n');

  // Seed plan limits (upsert)
  console.log('  → Inserting plan limits...');
  for (const row of planLimitsData) {
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
  console.log('    ✓ 4 plan limits upserted');

  // Optionally seed default item types for an existing user
  if (userEmail) {
    console.log(`\n  → Seeding default item types for ${userEmail}...`);

    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (user.length === 0) {
      console.error(`    ✗ No user found with email: ${userEmail}`);
      process.exit(1);
    }

    const userId = user[0].id;

    for (const t of DEFAULT_ITEM_TYPES) {
      await db
        .insert(collectionItemTypes)
        .values({
          userId,
          name: t.name,
          slug: t.slug,
          description: t.description,
          icon: t.icon,
          fieldSchema: t.fieldSchema,
          displayOrder: t.displayOrder,
        })
        .onConflictDoUpdate({
          target: [collectionItemTypes.userId, collectionItemTypes.slug],
          set: {
            name: t.name,
            description: t.description,
            icon: t.icon,
            fieldSchema: t.fieldSchema,
            displayOrder: t.displayOrder,
          },
        });
    }
    console.log(`    ✓ ${DEFAULT_ITEM_TYPES.length} default item types upserted for ${userEmail}`);
  } else {
    console.log('\n  ℹ  Skipping item types (pass --user-email=you@example.com to seed them)');
  }

  console.log('\n✅ Seed complete!');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
