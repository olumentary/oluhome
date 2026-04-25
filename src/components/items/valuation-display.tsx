'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Download,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ValuationForm } from './valuation-form';

const TYPE_LABELS: Record<string, string> = {
  estimated: 'Estimated',
  appraised: 'Appraised',
  insured: 'Insured',
  auction_estimate: 'Auction Estimate',
  retail: 'Retail',
};

const PURPOSE_LABELS: Record<string, string> = {
  insurance: 'Insurance',
  estate: 'Estate',
  sale: 'Sale',
  donation: 'Donation',
  personal: 'Personal',
};

function formatCurrency(value: string | null): string {
  if (!value) return '--';
  const num = parseFloat(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getValueDisplay(val: ValuationData): string {
  if (val.valueSingle) return formatCurrency(val.valueSingle);
  if (val.valueLow && val.valueHigh)
    return `${formatCurrency(val.valueLow)} \u2013 ${formatCurrency(val.valueHigh)}`;
  return '--';
}

function getValueMidpoint(val: ValuationData): number {
  if (val.valueSingle) return parseFloat(val.valueSingle);
  if (val.valueLow && val.valueHigh)
    return (parseFloat(val.valueLow) + parseFloat(val.valueHigh)) / 2;
  return 0;
}

interface ValuationData {
  id: string;
  itemId: string;
  valuationType: string;
  valueLow: string | null;
  valueHigh: string | null;
  valueSingle: string | null;
  appraiserName: string | null;
  appraiserCredentials: string | null;
  valuationDate: string | null;
  purpose: string | null;
  notes: string | null;
  documentS3Key: string | null;
  documentUrl: string | null;
  createdAt: Date;
}

interface ValuationDisplayProps {
  itemId: string;
  valuations: ValuationData[];
}

function ValueRangeBar({ valuation }: { valuation: ValuationData }) {
  if (!valuation.valueLow || !valuation.valueHigh) return null;
  const low = parseFloat(valuation.valueLow);
  const high = parseFloat(valuation.valueHigh);
  if (high === 0) return null;
  const ratio = low / high;

  return (
    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary/60"
        style={{
          marginLeft: `${ratio * 50}%`,
          width: `${(1 - ratio) * 50 + 50}%`,
        }}
      />
    </div>
  );
}

function ValuationCard({
  valuation,
  isLatest,
}: {
  valuation: ValuationData;
  isLatest: boolean;
}) {
  return (
    <Card className={isLatest ? '' : 'border-dashed'}>
      <CardContent className="pt-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {TYPE_LABELS[valuation.valuationType] ?? valuation.valuationType}
              </Badge>
              {valuation.purpose && (
                <Badge variant="secondary">
                  {PURPOSE_LABELS[valuation.purpose] ?? valuation.purpose}
                </Badge>
              )}
              {valuation.valuationDate && (
                <span className="text-sm text-muted-foreground">
                  {formatDate(valuation.valuationDate)}
                </span>
              )}
            </div>
            {valuation.appraiserName && (
              <p className="text-sm text-foreground">
                {valuation.appraiserName}
                {valuation.appraiserCredentials && (
                  <span className="text-muted-foreground">
                    {' '}
                    &middot; {valuation.appraiserCredentials}
                  </span>
                )}
              </p>
            )}
          </div>

          <p className="text-lg font-bold text-foreground whitespace-nowrap">
            {getValueDisplay(valuation)}
          </p>
        </div>

        {/* Range bar */}
        <ValueRangeBar valuation={valuation} />

        {/* Notes */}
        {valuation.notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {valuation.notes}
          </p>
        )}

        {/* Document */}
        {valuation.documentUrl && (
          <a
            href={valuation.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Download className="size-3.5" />
            Download Appraisal Report
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function ValuationDisplay({
  itemId,
  valuations,
}: ValuationDisplayProps) {
  const [showForm, setShowForm] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (valuations.length === 0 && !showForm) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <TrendingUp className="size-7 text-muted-foreground/60" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">
            Record your first valuation
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Track estimated, appraised, or insured values over time to monitor appreciation.
          </p>
          <Button className="mt-5" onClick={() => setShowForm(true)}>
            <Plus className="size-4" />
            Add Valuation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latest = valuations[0];
  const earlier = valuations.slice(1);

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="size-4" />
          {showForm ? 'Cancel' : 'Add Valuation'}
        </Button>
      </div>

      {/* New valuation form */}
      {showForm && (
        <ValuationForm
          itemId={itemId}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {/* Latest valuation — prominent card */}
      {latest && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Estimated Value
            </p>
            <p className="text-2xl font-bold text-foreground">
              {getValueDisplay(latest)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {TYPE_LABELS[latest.valuationType] ?? latest.valuationType}
              </Badge>
              {latest.appraiserName && (
                <span className="text-sm text-muted-foreground">
                  {latest.appraiserName}
                </span>
              )}
              {latest.valuationDate && (
                <span className="text-sm text-muted-foreground">
                  &middot; {formatDate(latest.valuationDate)}
                </span>
              )}
            </div>
            <ValueRangeBar valuation={latest} />
            {latest.documentUrl && (
              <a
                href={latest.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
              >
                <Download className="size-3.5" />
                Download Appraisal Report
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historical timeline */}
      {earlier.length > 0 && (
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="text-sm text-muted-foreground">
                {earlier.length} earlier valuation
                {earlier.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown
                className={`size-4 transition-transform ${
                  timelineOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {earlier.map((val) => (
              <ValuationCard
                key={val.id}
                valuation={val}
                isLatest={false}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
