import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { users, planLimits, usageTracking } from '@/db/schema';
import { subscriptionsEnabled } from '@/flags';
import { getOrCreateUsagePeriod } from '@/lib/usage';
import type { PlanFeature, PlanCheckResult, PlanLimit } from '@/types';

export async function getPlanLimits(
  plan: string,
): Promise<PlanLimit | null> {
  const limits = await db.query.planLimits.findFirst({
    where: eq(planLimits.plan, plan as 'free' | 'pro' | 'premium' | 'admin'),
  });
  return limits ?? null;
}

const featureToLimitCol: Record<
  PlanFeature,
  { limitKey: keyof PlanLimit; usageKey?: keyof typeof usageRow; boolean?: boolean }
> = {
  items: { limitKey: 'maxItems', usageKey: 'itemsCount' as never },
  photos: { limitKey: 'maxPhotosPerItem' },
  storage: { limitKey: 'maxStorageMb', usageKey: 'storageBytes' as never },
  custom_types: { limitKey: 'maxCustomTypes' },
  ai_analyses: { limitKey: 'aiAnalysesPerMonth', usageKey: 'aiAnalysesCount' as never },
  pdf_exports: { limitKey: 'pdfExportsPerMonth', usageKey: 'pdfExportsCount' as never },
  share_links: { limitKey: 'shareLinksEnabled', boolean: true },
  batch_pdf: { limitKey: 'batchPdfEnabled', boolean: true },
  analytics: { limitKey: 'analyticsEnabled', boolean: true },
};

// Placeholder to satisfy TS — real usage row is fetched at runtime
const usageRow = {} as Record<string, number>;

const usageKeyMap: Partial<Record<PlanFeature, string>> = {
  items: 'itemsCount',
  storage: 'storageBytes',
  ai_analyses: 'aiAnalysesCount',
  pdf_exports: 'pdfExportsCount',
};

export async function checkPlanLimit(
  userId: string,
  feature: PlanFeature,
): Promise<PlanCheckResult> {
  const enabled = await subscriptionsEnabled();
  if (!enabled) {
    return { allowed: true, current: 0, limit: -1, plan: 'free' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true },
  });
  if (!user) throw new Error('User not found');

  const limits = await getPlanLimits(user.plan);
  if (!limits) throw new Error('Plan limits not found');

  const mapping = featureToLimitCol[feature];

  // Boolean features (share_links, batch_pdf, analytics)
  if (mapping.boolean) {
    const enabled = limits[mapping.limitKey] as unknown as boolean;
    return {
      allowed: enabled,
      current: enabled ? 1 : 0,
      limit: enabled ? 1 : 0,
      plan: user.plan,
    };
  }

  const limitValue = limits[mapping.limitKey] as number;

  // Unlimited (-1)
  if (limitValue === -1) {
    return { allowed: true, current: 0, limit: -1, plan: user.plan };
  }

  // Numeric features that track in usage_tracking
  const usageCol = usageKeyMap[feature];
  if (!usageCol) {
    // Features like photos/custom_types need item-level counts (handled by caller)
    return { allowed: true, current: 0, limit: limitValue, plan: user.plan };
  }

  const usage = await getOrCreateUsagePeriod(userId);

  let current: number;
  if (feature === 'storage') {
    // Convert bytes to MB for comparison
    current = Math.ceil(usage.storageBytes / (1024 * 1024));
  } else {
    current = (usage as Record<string, unknown>)[usageCol] as number;
  }

  return {
    allowed: current < limitValue,
    current,
    limit: limitValue,
    plan: user.plan,
  };
}
