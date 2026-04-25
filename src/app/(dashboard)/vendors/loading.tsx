import { Skeleton } from '@/components/ui/skeleton';
import { VendorGridSkeleton } from '@/components/ui/skeletons';

export default function VendorsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-10 w-full" />
      <VendorGridSkeleton count={6} />
    </div>
  );
}
