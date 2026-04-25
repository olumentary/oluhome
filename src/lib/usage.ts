import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { usageTracking } from '@/db/schema';
import type { PlanFeature, UsageTracking } from '@/types';

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function getOrCreateUsagePeriod(
  userId: string,
): Promise<UsageTracking> {
  const period = getCurrentPeriod();

  const existing = await db.query.usageTracking.findFirst({
    where: and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.period, period),
    ),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(usageTracking)
    .values({ userId, period })
    .onConflictDoNothing()
    .returning();

  // If onConflictDoNothing returned nothing (race condition), re-fetch
  if (!created) {
    const refetched = await db.query.usageTracking.findFirst({
      where: and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.period, period),
      ),
    });
    return refetched!;
  }

  return created;
}

export async function getCurrentUsage(
  userId: string,
): Promise<UsageTracking> {
  return getOrCreateUsagePeriod(userId);
}

const featureColumnMap: Partial<Record<PlanFeature, keyof typeof usageTracking>> = {
  items: 'itemsCount',
  photos: 'photosCount',
  ai_analyses: 'aiAnalysesCount',
  pdf_exports: 'pdfExportsCount',
};

export async function incrementUsage(
  userId: string,
  feature: PlanFeature,
  amount = 1,
): Promise<void> {
  const period = getCurrentPeriod();
  const column = featureColumnMap[feature];

  if (!column) {
    throw new Error(`Cannot increment usage for feature: ${feature}`);
  }

  // Ensure the row exists
  await getOrCreateUsagePeriod(userId);

  const col = usageTracking[column];
  await db
    .update(usageTracking)
    .set({ [column]: sql`${col} + ${amount}` })
    .where(
      and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.period, period),
      ),
    );
}
