'use client';

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronsUpDown,
  Plus,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  createAcquisition,
  updateAcquisition,
  type AcquisitionActionState,
} from '@/app/(dashboard)/items/acquisition-actions';
import { searchVendors } from '@/app/(dashboard)/vendors/actions';
import { VendorForm } from '@/components/vendors/vendor-form';
import { toast } from 'sonner';

const ACQUISITION_TYPES = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'gift', label: 'Gift' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'trade', label: 'Trade' },
] as const;

interface VendorOption {
  id: string;
  name: string;
  businessName: string | null;
  type: string | null;
}

interface AcquisitionFormProps {
  itemId: string;
  acquisitionId?: string;
  initialValues?: {
    vendorId: string | null;
    vendorName?: string;
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
  };
}

function CurrencyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0.00'}
        className="pl-7"
      />
    </div>
  );
}

export function AcquisitionForm({
  itemId,
  acquisitionId,
  initialValues,
}: AcquisitionFormProps) {
  const isEditing = !!acquisitionId;
  const router = useRouter();

  // Bind the itemId / acquisitionId into the action
  const boundAction = useMemo(() => {
    if (isEditing) {
      return updateAcquisition.bind(null, acquisitionId);
    }
    return createAcquisition.bind(null, itemId);
  }, [isEditing, acquisitionId, itemId]);

  const [state, formAction, pending] = useActionState<
    AcquisitionActionState | null,
    FormData
  >(boundAction, null);

  // Vendor selector
  const [vendorId, setVendorId] = useState(initialValues?.vendorId ?? '');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [selectedVendorLabel, setSelectedVendorLabel] = useState(
    initialValues?.vendorName ?? '',
  );
  const [, startVendorSearch] = useTransition();

  // Form fields
  const [acquisitionDate, setAcquisitionDate] = useState<Date | undefined>(
    initialValues?.acquisitionDate
      ? new Date(initialValues.acquisitionDate + 'T00:00:00')
      : undefined,
  );
  const [dateOpen, setDateOpen] = useState(false);
  const [acquisitionType, setAcquisitionType] = useState(
    initialValues?.acquisitionType ?? '',
  );
  const [listedPrice, setListedPrice] = useState(
    initialValues?.listedPrice ?? '',
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initialValues?.purchasePrice ?? '',
  );
  const [buyersPremiumPct, setBuyersPremiumPct] = useState(
    initialValues?.buyersPremiumPct ?? '',
  );
  const [taxAmount, setTaxAmount] = useState(initialValues?.taxAmount ?? '');
  const [shippingCost, setShippingCost] = useState(
    initialValues?.shippingCost ?? '',
  );
  const [lotNumber, setLotNumber] = useState(initialValues?.lotNumber ?? '');
  const [saleName, setSaleName] = useState(initialValues?.saleName ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [receiptS3Key, setReceiptS3Key] = useState(
    initialValues?.receiptS3Key ?? '',
  );
  const [receiptUploading, setReceiptUploading] = useState(false);

  // Auto-calculate total cost
  const totalCost = useMemo(() => {
    const pp = parseFloat(purchasePrice) || 0;
    const premPct = parseFloat(buyersPremiumPct) || 0;
    const tax = parseFloat(taxAmount) || 0;
    const ship = parseFloat(shippingCost) || 0;
    const premAmt = pp * (premPct / 100);
    return pp + premAmt + tax + ship;
  }, [purchasePrice, buyersPremiumPct, taxAmount, shippingCost]);

  const premiumAmount = useMemo(() => {
    const pp = parseFloat(purchasePrice) || 0;
    const premPct = parseFloat(buyersPremiumPct) || 0;
    return pp * (premPct / 100);
  }, [purchasePrice, buyersPremiumPct]);

  // Search vendors on typing
  const handleVendorSearch = useCallback(
    (query: string) => {
      setVendorSearch(query);
      startVendorSearch(async () => {
        const results = await searchVendors(query);
        setVendorOptions(results);
      });
    },
    [startVendorSearch],
  );

  // Load initial vendor options
  useEffect(() => {
    startVendorSearch(async () => {
      const results = await searchVendors('');
      setVendorOptions(results);
    });
  }, [startVendorSearch]);

  // Navigate on success
  useEffect(() => {
    if (state?.success) {
      toast.success(
        isEditing ? 'Acquisition updated' : 'Acquisition recorded',
      );
      router.refresh();
    }
  }, [state, isEditing, router]);

  function handleSubmit(formData: FormData) {
    const payload = {
      vendorId: vendorId || undefined,
      acquisitionDate: acquisitionDate
        ? acquisitionDate.toISOString().split('T')[0]
        : undefined,
      acquisitionType: acquisitionType || undefined,
      listedPrice: listedPrice ? parseFloat(listedPrice) : undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      buyersPremiumPct: buyersPremiumPct
        ? parseFloat(buyersPremiumPct)
        : undefined,
      taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
      shippingCost: shippingCost ? parseFloat(shippingCost) : undefined,
      totalCost: totalCost > 0 ? totalCost : undefined,
      lotNumber: lotNumber || undefined,
      saleName: saleName || undefined,
      notes: notes || undefined,
      receiptS3Key: receiptS3Key || undefined,
    };
    formData.set('json', JSON.stringify(payload));
    formAction(formData);
  }

  function handleVendorCreated(newVendorId: string) {
    setVendorId(newVendorId);
    setVendorDialogOpen(false);
    // Refresh vendor list
    startVendorSearch(async () => {
      const results = await searchVendors('');
      setVendorOptions(results);
      const created = results.find((v) => v.id === newVendorId);
      if (created) {
        setSelectedVendorLabel(
          created.businessName
            ? `${created.name} (${created.businessName})`
            : created.name,
        );
      }
    });
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Receipt must be PDF, JPEG, PNG, or WebP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Receipt must be under 10 MB');
      return;
    }

    setReceiptUploading(true);
    try {
      const res = await fetch('/api/upload/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { uploadUrl, s3Key } = await res.json();
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setReceiptS3Key(s3Key);
      toast.success('Receipt uploaded');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Receipt upload failed',
      );
    } finally {
      setReceiptUploading(false);
    }
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        {state?.error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Vendor + Acquisition Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vendor combobox */}
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <div className="flex gap-2">
                <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={vendorOpen}
                      className="flex-1 justify-between font-normal"
                    >
                      {selectedVendorLabel || 'Select vendor...'}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search vendors..."
                        value={vendorSearch}
                        onValueChange={handleVendorSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No vendors found.</CommandEmpty>
                        <CommandGroup>
                          {vendorId && (
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setVendorId('');
                                setSelectedVendorLabel('');
                                setVendorOpen(false);
                              }}
                            >
                              <X className="mr-2 size-4 text-muted-foreground" />
                              Clear selection
                            </CommandItem>
                          )}
                          {vendorOptions.map((v) => {
                            const label = v.businessName
                              ? `${v.name} (${v.businessName})`
                              : v.name;
                            return (
                              <CommandItem
                                key={v.id}
                                value={v.id}
                                onSelect={() => {
                                  setVendorId(v.id);
                                  setSelectedVendorLabel(label);
                                  setVendorOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 size-4 ${
                                    vendorId === v.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setVendorDialogOpen(true)}
                  title="Add new vendor"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Acquisition Type</Label>
                <Select value={acquisitionType} onValueChange={setAcquisitionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACQUISITION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Acquisition Date</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                    >
                      {acquisitionDate
                        ? acquisitionDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={acquisitionDate}
                      onSelect={(date) => {
                        setAcquisitionDate(date);
                        setDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="acq-sale-name">Sale Name</Label>
                <Input
                  id="acq-sale-name"
                  value={saleName}
                  onChange={(e) => setSaleName(e.target.value)}
                  placeholder="e.g. Spring Auction 2024"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acq-lot-number">Lot Number</Label>
                <Input
                  id="acq-lot-number"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. 142A"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="acq-listed-price">Listed Price</Label>
                <CurrencyInput
                  id="acq-listed-price"
                  value={listedPrice}
                  onChange={setListedPrice}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acq-purchase-price">Purchase Price</Label>
                <CurrencyInput
                  id="acq-purchase-price"
                  value={purchasePrice}
                  onChange={setPurchasePrice}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="acq-premium">Buyer&apos;s Premium %</Label>
                <div className="relative">
                  <Input
                    id="acq-premium"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={buyersPremiumPct}
                    onChange={(e) => setBuyersPremiumPct(e.target.value)}
                    placeholder="0"
                  />
                  {premiumAmount > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      = ${premiumAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acq-tax">Tax Amount</Label>
                <CurrencyInput
                  id="acq-tax"
                  value={taxAmount}
                  onChange={setTaxAmount}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acq-shipping">Shipping Cost</Label>
                <CurrencyInput
                  id="acq-shipping"
                  value={shippingCost}
                  onChange={setShippingCost}
                />
              </div>
            </div>

            {/* Total */}
            <div className="rounded-md bg-muted/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Total Cost
                </span>
                <span className="text-lg font-bold text-foreground">
                  {totalCost > 0
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(totalCost)
                    : '--'}
                </span>
              </div>
              {totalCost > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Purchase + Premium + Tax + Shipping
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes + Receipt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="acq-notes">Notes</Label>
              <Textarea
                id="acq-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this acquisition..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Receipt</Label>
              {receiptS3Key ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">
                    Receipt uploaded
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReceiptS3Key('')}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                    <Upload className="size-4" />
                    {receiptUploading
                      ? 'Uploading...'
                      : 'Upload receipt (PDF, JPEG, PNG)'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleReceiptUpload}
                      disabled={receiptUploading}
                    />
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || receiptUploading}>
            {pending
              ? isEditing
                ? 'Saving...'
                : 'Recording...'
              : isEditing
                ? 'Save Changes'
                : 'Record Acquisition'}
          </Button>
        </div>
      </form>

      {/* Inline vendor creation dialog */}
      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm compact onSuccess={handleVendorCreated} />
        </DialogContent>
      </Dialog>
    </>
  );
}
