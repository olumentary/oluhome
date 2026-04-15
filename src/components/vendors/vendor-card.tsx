'use client';

import Link from 'next/link';
import { Star, Package, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const VENDOR_TYPE_COLORS: Record<string, string> = {
  dealer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  auction_house:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  private:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  estate_sale:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  flea_market:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  gallery: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const VENDOR_TYPE_LABELS: Record<string, string> = {
  dealer: 'Dealer',
  auction_house: 'Auction House',
  private: 'Private',
  estate_sale: 'Estate Sale',
  flea_market: 'Flea Market',
  gallery: 'Gallery',
  other: 'Other',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface VendorCardProps {
  vendor: {
    id: string;
    name: string;
    businessName: string | null;
    type: string | null;
    specialty: string | null;
    rating: number | null;
    itemCount: number;
    totalSpend: string | null;
  };
}

export function VendorCard({ vendor }: VendorCardProps) {
  const spend = vendor.totalSpend ? parseFloat(vendor.totalSpend) : 0;

  return (
    <Link href={`/vendors/${vendor.id}`}>
      <Card className="group h-full transition-colors hover:border-primary/30 hover:shadow-sm">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {vendor.name}
              </h3>
              {vendor.businessName && (
                <p className="text-sm text-muted-foreground truncate">
                  {vendor.businessName}
                </p>
              )}
            </div>
            {vendor.type && (
              <Badge
                variant="secondary"
                className={`shrink-0 text-xs ${VENDOR_TYPE_COLORS[vendor.type] ?? ''}`}
              >
                {VENDOR_TYPE_LABELS[vendor.type] ?? vendor.type}
              </Badge>
            )}
          </div>

          {vendor.specialty && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {vendor.specialty}
            </p>
          )}

          {vendor.rating && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-3.5 ${
                    star <= vendor.rating!
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/20'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-1 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="size-3.5" />
              {vendor.itemCount} item{vendor.itemCount !== 1 ? 's' : ''}
            </span>
            {spend > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="size-3.5" />
                {formatCurrency(spend)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
