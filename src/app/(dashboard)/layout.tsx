import { eq, count } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems, vendors } from '@/db/schema';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const [[itemCount], [vendorCount]] = await Promise.all([
    db
      .select({ value: count() })
      .from(collectionItems)
      .where(eq(collectionItems.userId, user.id)),
    db
      .select({ value: count() })
      .from(vendors)
      .where(eq(vendors.userId, user.id)),
  ]);

  return (
    <DashboardShell
      user={user}
      counts={{
        items: itemCount?.value ?? 0,
        vendors: vendorCount?.value ?? 0,
      }}
    >
      {children}
    </DashboardShell>
  );
}
