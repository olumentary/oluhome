import { checkPlanLimit } from '@/lib/plans';
import { subscriptionsEnabled } from '@/flags';
import { requireAuth } from '@/lib/auth-helpers';
import type { PlanFeature } from '@/types';

const featureDisplayNames: Record<string, string> = {
  items: 'items',
  photos: 'photos',
  storage: 'MB storage',
  custom_types: 'custom types',
  ai_analyses: 'analyses',
  pdf_exports: 'PDF exports',
};

export async function UsageMeter({ feature }: { feature: PlanFeature }) {
  const enabled = await subscriptionsEnabled();
  if (!enabled) return null;

  const user = await requireAuth();
  const result = await checkPlanLimit(user.id, feature);

  // Don't show meter for boolean features or unlimited
  if (result.limit <= 0) return null;

  const pct = Math.min((result.current / result.limit) * 100, 100);
  const label = featureDisplayNames[feature] ?? feature;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {result.current} of {result.limit} {label} used
        </span>
        {pct >= 80 && (
          <span className="text-warning">
            {pct >= 100 ? 'Limit reached' : 'Almost full'}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 100
              ? 'bg-danger'
              : pct >= 80
                ? 'bg-warning'
                : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
