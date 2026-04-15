'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CoverageGap } from '@/lib/queries/analytics';

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

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  uninsured: {
    label: 'Uninsured',
    className: 'bg-danger/10 text-danger border-danger/20',
  },
  underinsured: {
    label: 'Underinsured',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  stale: {
    label: 'Stale (>3yr)',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
};

interface CoverageGapCardProps {
  data: CoverageGap[];
}

export function CoverageGapCard({ data }: CoverageGapCardProps) {
  const totalGap = data.reduce((sum, d) => sum + d.gapAmount, 0);
  const uninsuredCount = data.filter((d) => d.status === 'uninsured').length;
  const underinsuredCount = data.filter(
    (d) => d.status === 'underinsured',
  ).length;
  const staleCount = data.filter((d) => d.status === 'stale').length;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insurance Coverage</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          All items with valuations have adequate insurance coverage.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Insurance Coverage Gaps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="rounded-md bg-danger/5 border border-danger/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-danger" />
            <p className="text-sm font-medium text-foreground">
              {data.length} item{data.length !== 1 ? 's' : ''} with coverage
              gaps totaling {formatCurrency(totalGap)}
            </p>
          </div>
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            {uninsuredCount > 0 && <span>{uninsuredCount} uninsured</span>}
            {underinsuredCount > 0 && (
              <span>{underinsuredCount} underinsured</span>
            )}
            {staleCount > 0 && <span>{staleCount} stale</span>}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Item</th>
                <th className="pb-2 pr-4 font-medium text-right">Estimated</th>
                <th className="pb-2 pr-4 font-medium text-right">Insured</th>
                <th className="pb-2 pr-4 font-medium text-right">Gap</th>
                <th className="pb-2 pr-4 font-medium">Last Appraised</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item) => {
                const cfg = STATUS_CONFIG[item.status];
                return (
                  <tr key={item.itemId}>
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/items/${item.itemId}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {formatCurrency(item.estimatedValue)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {item.insuredValue > 0
                        ? formatCurrency(item.insuredValue)
                        : '--'}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-medium text-danger">
                      {formatCurrency(item.gapAmount)}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {formatDate(item.lastInsuredDate)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className={cfg.className}>
                        {cfg.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
