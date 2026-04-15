'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VendorAnalysisEntry } from '@/lib/queries/analytics';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

interface VendorAnalysisProps {
  data: VendorAnalysisEntry[];
}

export function VendorAnalysis({ data }: VendorAnalysisProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor Analysis</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No vendor purchase data yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendor Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Vendor</th>
                <th className="pb-2 pr-4 font-medium text-right">Items</th>
                <th className="pb-2 pr-4 font-medium text-right">
                  Total Spend
                </th>
                <th className="pb-2 pr-4 font-medium text-right">
                  Avg Discount
                </th>
                <th className="pb-2 font-medium">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((vendor) => (
                <tr key={vendor.vendorId}>
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/vendors/${vendor.vendorId}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {vendor.vendorName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {vendor.itemCount}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatCurrency(vendor.spend)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {vendor.avgDiscount > 0
                      ? `${vendor.avgDiscount.toFixed(1)}%`
                      : '--'}
                  </td>
                  <td className="py-2.5 text-muted-foreground">
                    {formatDate(vendor.lastPurchase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
