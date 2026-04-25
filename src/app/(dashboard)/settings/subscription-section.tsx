'use client';

import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PlanLimit, UsageTracking } from '@/types';

interface SubscriptionSectionProps {
  plan: string;
  planLimits: PlanLimit;
  usage: UsageTracking;
}

function UsageMeter({
  label,
  current,
  limit,
  unit,
}: {
  label: string;
  current: number;
  limit: number;
  unit?: string;
}) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={isNearLimit ? 'font-medium text-warning' : ''}>
          {current.toLocaleString()}
          {unit ? ` ${unit}` : ''}
          {isUnlimited ? '' : ` / ${limit.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && <Progress value={pct} className="h-2" />}
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium',
  admin: 'Admin',
};

export function SubscriptionSection({
  plan,
  planLimits,
  usage,
}: SubscriptionSectionProps) {
  const storageMb = Math.ceil(usage.storageBytes / (1024 * 1024));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Subscription</CardTitle>
          </div>
          <Badge variant="secondary" className="capitalize">
            {PLAN_LABELS[plan] ?? plan} Plan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <UsageMeter
            label="Items"
            current={usage.itemsCount}
            limit={planLimits.maxItems}
          />
          <UsageMeter
            label="Storage"
            current={storageMb}
            limit={planLimits.maxStorageMb}
            unit="MB"
          />
          <UsageMeter
            label="AI Analyses (this month)"
            current={usage.aiAnalysesCount}
            limit={planLimits.aiAnalysesPerMonth}
          />
          <UsageMeter
            label="PDF Exports (this month)"
            current={usage.pdfExportsCount}
            limit={planLimits.pdfExportsPerMonth}
          />
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/billing">Manage Subscription</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
