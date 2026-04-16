import { Skeleton } from '@/components/ui/skeleton';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeletons';

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton height="h-72" />
      <ChartSkeleton height="h-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton height="h-48" />
        <ChartSkeleton height="h-48" />
      </div>
    </div>
  );
}
