import { checkPlanLimit } from '@/lib/plans';
import { subscriptionsEnabled } from '@/flags';
import { requireAuth } from '@/lib/auth-helpers';
import { UpgradePrompt } from './upgrade-prompt';
import type { PlanFeature } from '@/types';

export async function PlanGate({
  feature,
  children,
}: {
  feature: PlanFeature;
  children: React.ReactNode;
}) {
  const enabled = await subscriptionsEnabled();
  if (!enabled) return <>{children}</>;

  const user = await requireAuth();
  const result = await checkPlanLimit(user.id, feature);

  if (!result.allowed) {
    return <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}
