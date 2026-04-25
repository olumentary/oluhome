import {
  Package,
  DollarSign,
  TrendingUp,
  Receipt,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getCollectionSummary,
  getValueByRoom,
  getValueOverTime,
  getCoverageGaps,
  getCompositionByField,
  getTopItemsByValue,
  getSpendingOverTime,
  getVendorAnalysis,
} from '@/lib/queries/analytics';
import {
  LazyValueByRoomChart,
  LazyValueTrendChart,
  LazyCoverageGapCard,
  LazyCompositionCharts,
  LazyTopItemsChart,
  LazySpendingChart,
  LazyVendorAnalysis,
} from '@/components/analytics/lazy-charts';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AnalyticsPage() {
  const user = await requireAuth();

  // Fetch all analytics data in parallel
  const [
    summary,
    valueByRoom,
    trendMonthly,
    trendQuarterly,
    trendYearly,
    coverageGaps,
    byType,
    byPeriod,
    byRoom,
    byCondition,
    topItems,
    spending,
    vendorData,
  ] = await Promise.all([
    getCollectionSummary(user.id),
    getValueByRoom(user.id),
    getValueOverTime(user.id, 'monthly'),
    getValueOverTime(user.id, 'quarterly'),
    getValueOverTime(user.id, 'yearly'),
    getCoverageGaps(user.id),
    getCompositionByField(user.id, 'type'),
    getCompositionByField(user.id, 'period'),
    getCompositionByField(user.id, 'room'),
    getCompositionByField(user.id, 'condition'),
    getTopItemsByValue(user.id, 10),
    getSpendingOverTime(user.id),
    getVendorAnalysis(user.id),
  ]);

  const stats = [
    {
      label: 'Total Items',
      value: summary.totalItems.toLocaleString(),
      icon: Package,
    },
    {
      label: 'Estimated Value',
      value:
        summary.totalEstimatedValue > 0
          ? formatCurrency(summary.totalEstimatedValue)
          : '--',
      icon: DollarSign,
    },
    {
      label: 'Acquisition Cost',
      value:
        summary.totalAcquisitionCost > 0
          ? formatCurrency(summary.totalAcquisitionCost)
          : '--',
      icon: Receipt,
    },
    {
      label: 'Appreciation',
      value:
        summary.totalAcquisitionCost > 0
          ? `${summary.appreciation >= 0 ? '+' : ''}${summary.appreciation.toFixed(1)}%`
          : '--',
      icon: TrendingUp,
    },
  ];

  // Empty state when collection has no data
  if (summary.totalItems === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collection insights, value trends, and coverage analysis.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="size-8 text-muted-foreground/60" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">
            Add more items and valuations to see insights
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Analytics become available once you have items with valuations in your collection. Start by adding pieces and recording their estimated values.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/items/new">
              <Package className="size-4" />
              Add your first item
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Collection insights, value trends, and coverage analysis.
        </p>
      </div>

      {/* Summary row — 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Value by Room */}
      <LazyValueByRoomChart data={valueByRoom} />

      {/* Value Trend */}
      <LazyValueTrendChart
        data={{
          monthly: trendMonthly,
          quarterly: trendQuarterly,
          yearly: trendYearly,
        }}
      />

      {/* Coverage Gaps */}
      <LazyCoverageGapCard data={coverageGaps} />

      {/* Composition */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Collection Composition
        </h2>
        <LazyCompositionCharts
          byType={byType}
          byPeriod={byPeriod}
          byRoom={byRoom}
          byCondition={byCondition}
        />
      </div>

      {/* Top Items + Spending — 2-col on desktop */}
      <div className="grid gap-4 md:grid-cols-2">
        <LazyTopItemsChart data={topItems} />
        <LazySpendingChart data={spending} />
      </div>

      {/* Vendor Analysis */}
      <LazyVendorAnalysis data={vendorData} />
    </div>
  );
}
