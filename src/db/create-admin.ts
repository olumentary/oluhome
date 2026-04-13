import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq, isNull } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { users, collectionItemTypes, usageTracking } from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

function parseArgs(): { email: string; password: string } {
  const args = process.argv.slice(2);
  let email = '';
  let password = '';

  for (const arg of args) {
    if (arg.startsWith('--email=')) email = arg.slice('--email='.length);
    if (arg.startsWith('--password=')) password = arg.slice('--password='.length);
  }

  if (!email || !password) {
    console.error(
      'Usage: pnpm tsx src/db/create-admin.ts --email=admin@example.com --password=changeme',
    );
    process.exit(1);
  }

  return { email, password };
}

async function createAdmin() {
  const { email, password } = parseArgs();

  console.log(`\nCreating admin user: ${email}\n`);

  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.error(`User with email ${email} already exists.`);
    process.exit(1);
  }

  // Hash password
  const passwordHash = await hash(password, 12);

  // Create admin user
  const [admin] = await db
    .insert(users)
    .values({
      email,
      name: 'Admin',
      passwordHash,
      role: 'admin',
      plan: 'admin',
    })
    .returning({ id: users.id });

  console.log(`  Created user: ${admin.id}`);

  // Clone system-default item types
  const defaults = await db
    .select()
    .from(collectionItemTypes)
    .where(isNull(collectionItemTypes.userId));

  if (defaults.length > 0) {
    await db.insert(collectionItemTypes).values(
      defaults.map((d) => ({
        userId: admin.id,
        name: d.name,
        slug: d.slug,
        description: d.description,
        icon: d.icon,
        fieldSchema: d.fieldSchema,
        displayOrder: d.displayOrder,
        isDefault: d.isDefault,
      })),
    );
    console.log(`  Cloned ${defaults.length} default item types`);
  }

  // Create initial usage tracking
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  await db.insert(usageTracking).values({
    userId: admin.id,
    period,
  });
  console.log(`  Created usage tracking for ${period}`);

  console.log('\nAdmin user created successfully!\n');
}

createAdmin()
  .catch((err) => {
    console.error('Failed to create admin:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
