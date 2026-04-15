import Link from 'next/link';
import { Plus, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVendorsWithStats } from './actions';
import { VendorCard } from '@/components/vendors/vendor-card';
import { VendorFilters } from '@/components/vendors/vendor-filters';

interface VendorsPageProps {
  searchParams: Promise<{ search?: string; type?: string }>;
}

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const params = await searchParams;
  const vendorList = await getVendorsWithStats({
    search: params.search,
    type: params.type,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            Manage your dealers, auction houses, and other sources.
          </p>
        </div>
        <Button asChild>
          <Link href="/vendors/new">
            <Plus className="size-4" />
            Add Vendor
          </Link>
        </Button>
      </div>

      <VendorFilters
        currentSearch={params.search}
        currentType={params.type}
      />

      {vendorList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Store className="size-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold text-foreground">No vendors yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {params.search || params.type
              ? 'No vendors match your filters.'
              : 'Add your first vendor to start tracking purchases.'}
          </p>
          {!params.search && !params.type && (
            <Button className="mt-4" asChild>
              <Link href="/vendors/new">
                <Plus className="size-4" />
                Add Vendor
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendorList.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}
