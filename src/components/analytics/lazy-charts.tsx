'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/skeletons';

export const LazyValueByRoomChart = dynamic(
  () =>
    import('@/components/analytics/value-by-room-chart').then(
      (m) => m.ValueByRoomChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-72" /> },
);

export const LazyValueTrendChart = dynamic(
  () =>
    import('@/components/analytics/value-trend-chart').then(
      (m) => m.ValueTrendChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-72" /> },
);

export const LazyCoverageGapCard = dynamic(
  () =>
    import('@/components/analytics/coverage-gap-card').then(
      (m) => m.CoverageGapCard,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-48" /> },
);

export const LazyCompositionCharts = dynamic(
  () =>
    import('@/components/analytics/composition-charts').then(
      (m) => m.CompositionCharts,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-64" /> },
);

export const LazyTopItemsChart = dynamic(
  () =>
    import('@/components/analytics/top-items-chart').then(
      (m) => m.TopItemsChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-48" /> },
);

export const LazySpendingChart = dynamic(
  () =>
    import('@/components/analytics/spending-chart').then(
      (m) => m.SpendingChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-48" /> },
);

export const LazyVendorAnalysis = dynamic(
  () =>
    import('@/components/analytics/vendor-analysis').then(
      (m) => m.VendorAnalysis,
    ),
  { ssr: false, loading: () => <ChartSkeleton height="h-64" /> },
);
