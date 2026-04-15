'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Download,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { deleteAcquisition } from '@/app/(dashboard)/items/acquisition-actions';
import { AcquisitionForm } from './acquisition-form';
import { toast } from 'sonner';

const ACQUISITION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  gift: 'Gift',
  inheritance: 'Inheritance',
  trade: 'Trade',
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

function formatCurrency(value: string | null): string {
  if (!value) return '--';
  const num = parseFloat(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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

interface AcquisitionData {
  id: string;
  itemId: string;
  vendorId: string | null;
  acquisitionDate: string | null;
  acquisitionType: string | null;
  listedPrice: string | null;
  purchasePrice: string | null;
  buyersPremiumPct: string | null;
  taxAmount: string | null;
  shippingCost: string | null;
  totalCost: string | null;
  lotNumber: string | null;
  saleName: string | null;
  notes: string | null;
  receiptS3Key: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  vendor: {
    id: string;
    name: string;
    businessName: string | null;
    type: string | null;
  } | null;
}

interface AcquisitionDisplayProps {
  itemId: string;
  acquisitions: AcquisitionData[];
}

function CostBreakdownRow({
  label,
  value,
  strikethrough,
}: {
  label: string;
  value: string;
  strikethrough?: boolean;
}) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-medium ${strikethrough ? 'line-through text-muted-foreground' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function AcquisitionCard({
  acquisition,
  itemId,
  isLatest,
}: {
  acquisition: AcquisitionData;
  itemId: string;
  isLatest: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const premiumAmount =
    acquisition.purchasePrice && acquisition.buyersPremiumPct
      ? parseFloat(acquisition.purchasePrice) *
        (parseFloat(acquisition.buyersPremiumPct) / 100)
      : null;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAcquisition(acquisition.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Acquisition deleted');
        setDeleteOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Card className={isLatest ? '' : 'border-dashed'}>
        <CardContent className="pt-5 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {acquisition.acquisitionType && (
                  <Badge variant="outline">
                    {ACQUISITION_TYPE_LABELS[acquisition.acquisitionType] ??
                      acquisition.acquisitionType}
                  </Badge>
                )}
                {acquisition.acquisitionDate && (
                  <span className="text-sm text-muted-foreground">
                    {formatDate(acquisition.acquisitionDate)}
                  </span>
                )}
              </div>

              {/* Vendor */}
              {acquisition.vendor && (
                <Link
                  href={`/vendors/${acquisition.vendor.id}`}
                  className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <Store className="size-3.5" />
                  {acquisition.vendor.name}
                  {acquisition.vendor.businessName &&
                    ` (${acquisition.vendor.businessName})`}
                  {acquisition.vendor.type && (
                    <span className="text-xs text-muted-foreground">
                      {' '}
                      &middot;{' '}
                      {VENDOR_TYPE_LABELS[acquisition.vendor.type] ??
                        acquisition.vendor.type}
                    </span>
                  )}
                </Link>
              )}

              {acquisition.saleName && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {acquisition.saleName}
                  {acquisition.lotNumber && ` \u00b7 Lot ${acquisition.lotNumber}`}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Cost breakdown */}
          {(acquisition.listedPrice ||
            acquisition.purchasePrice ||
            acquisition.totalCost) && (
            <div className="rounded-md bg-muted/50 px-4 py-2 divide-y">
              {acquisition.listedPrice &&
                acquisition.listedPrice !== acquisition.purchasePrice && (
                  <CostBreakdownRow
                    label="Listed Price"
                    value={formatCurrency(acquisition.listedPrice)}
                    strikethrough
                  />
                )}
              {acquisition.purchasePrice && (
                <CostBreakdownRow
                  label="Purchase Price"
                  value={formatCurrency(acquisition.purchasePrice)}
                />
              )}
              {premiumAmount != null && premiumAmount > 0 && (
                <CostBreakdownRow
                  label={`Buyer's Premium (${acquisition.buyersPremiumPct}%)`}
                  value={formatCurrency(String(premiumAmount.toFixed(2)))}
                />
              )}
              {acquisition.taxAmount &&
                parseFloat(acquisition.taxAmount) > 0 && (
                  <CostBreakdownRow
                    label="Tax"
                    value={formatCurrency(acquisition.taxAmount)}
                  />
                )}
              {acquisition.shippingCost &&
                parseFloat(acquisition.shippingCost) > 0 && (
                  <CostBreakdownRow
                    label="Shipping"
                    value={formatCurrency(acquisition.shippingCost)}
                  />
                )}
              {acquisition.totalCost && (
                <div className="flex justify-between py-1.5 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(acquisition.totalCost)}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {acquisition.notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {acquisition.notes}
            </p>
          )}

          {/* Receipt */}
          {acquisition.receiptUrl && (
            <a
              href={acquisition.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Download className="size-3.5" />
              Download Receipt
            </a>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Acquisition</DialogTitle>
          </DialogHeader>
          <AcquisitionForm
            itemId={itemId}
            acquisitionId={acquisition.id}
            initialValues={{
              vendorId: acquisition.vendorId,
              vendorName: acquisition.vendor
                ? acquisition.vendor.businessName
                  ? `${acquisition.vendor.name} (${acquisition.vendor.businessName})`
                  : acquisition.vendor.name
                : undefined,
              acquisitionDate: acquisition.acquisitionDate,
              acquisitionType: acquisition.acquisitionType,
              listedPrice: acquisition.listedPrice,
              purchasePrice: acquisition.purchasePrice,
              buyersPremiumPct: acquisition.buyersPremiumPct,
              taxAmount: acquisition.taxAmount,
              shippingCost: acquisition.shippingCost,
              totalCost: acquisition.totalCost,
              lotNumber: acquisition.lotNumber,
              saleName: acquisition.saleName,
              notes: acquisition.notes,
              receiptS3Key: acquisition.receiptS3Key,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Acquisition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this acquisition record? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AcquisitionDisplay({
  itemId,
  acquisitions,
}: AcquisitionDisplayProps) {
  const [showForm, setShowForm] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (acquisitions.length === 0 && !showForm) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingBag className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No acquisition records yet.
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="size-4" />
            Record Acquisition
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latest = acquisitions[0];
  const earlier = acquisitions.slice(1);

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
          {showForm ? 'Cancel' : 'Add Acquisition'}
        </Button>
      </div>

      {/* New acquisition form */}
      {showForm && (
        <AcquisitionForm itemId={itemId} />
      )}

      {/* Latest acquisition */}
      {latest && (
        <AcquisitionCard
          acquisition={latest}
          itemId={itemId}
          isLatest
        />
      )}

      {/* Earlier acquisitions (collapsed) */}
      {earlier.length > 0 && (
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="text-sm text-muted-foreground">
                {earlier.length} earlier acquisition
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
            {earlier.map((acq) => (
              <AcquisitionCard
                key={acq.id}
                acquisition={acq}
                itemId={itemId}
                isLatest={false}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
