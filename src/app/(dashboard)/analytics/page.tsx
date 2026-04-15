import {
  Package,
  DollarSign,
  TrendingUp,
  Receipt,
} from 'lucide-react';
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
import { ValueByRoomChart } from '@/components/analytics/value-by-room-chart';
import { ValueTrendChart } from '@/components/analytics/value-trend-chart';
import { CoverageGapCard } from '@/components/analytics/coverage-gap-card';
import { CompositionCharts } from '@/components/analytics/composition-charts';
import { TopItemsChart } from '@/components/analytics/top-items-chart';
import { SpendingChart } from '@/components/analytics/spending-chart';
import { VendorAnalysis } from '@/components/analytics/vendor-analysis';

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
      <ValueByRoomChart data={valueByRoom} />

      {/* Value Trend */}
      <ValueTrendChart
        data={{
          monthly: trendMonthly,
          quarterly: trendQuarterly,
          yearly: trendYearly,
        }}
      />

      {/* Coverage Gaps */}
      <CoverageGapCard data={coverageGaps} />

      {/* Composition */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Collection Composition
        </h2>
        <CompositionCharts
          byType={byType}
          byPeriod={byPeriod}
          byRoom={byRoom}
          byCondition={byCondition}
        />
      </div>

      {/* Top Items */}
      <TopItemsChart data={topItems} />

      {/* Spending Over Time */}
      <SpendingChart data={spending} />

      {/* Vendor Analysis */}
      <VendorAnalysis data={vendorData} />
    </div>
  );
}
