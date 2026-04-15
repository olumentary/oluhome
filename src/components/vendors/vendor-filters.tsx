'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VENDOR_TYPES = [
  { value: 'dealer', label: 'Dealer' },
  { value: 'auction_house', label: 'Auction House' },
  { value: 'private', label: 'Private' },
  { value: 'estate_sale', label: 'Estate Sale' },
  { value: 'flea_market', label: 'Flea Market' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'other', label: 'Other' },
];

interface VendorFiltersProps {
  currentSearch?: string;
  currentType?: string;
}

export function VendorFilters({
  currentSearch,
  currentType,
}: VendorFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/vendors?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          defaultValue={currentSearch}
          className="pl-9"
          onChange={(e) => updateParam('search', e.target.value)}
        />
      </div>
      <Select
        value={currentType ?? 'all'}
        onValueChange={(v) => updateParam('type', v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {VENDOR_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
