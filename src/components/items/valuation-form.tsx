'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { Calendar } from '@/components/ui/calendar';
import {
  createValuation,
  type ValuationActionState,
} from '@/app/(dashboard)/items/valuation-actions';
import { toast } from 'sonner';

const VALUATION_TYPES = [
  { value: 'estimated', label: 'Estimated' },
  { value: 'appraised', label: 'Appraised' },
  { value: 'insured', label: 'Insured' },
  { value: 'auction_estimate', label: 'Auction Estimate' },
  { value: 'retail', label: 'Retail' },
] as const;

const VALUATION_PURPOSES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'estate', label: 'Estate' },
  { value: 'sale', label: 'Sale' },
  { value: 'donation', label: 'Donation' },
  { value: 'personal', label: 'Personal' },
] as const;

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

interface ValuationFormProps {
  itemId: string;
  onSuccess?: () => void;
}

export function ValuationForm({ itemId, onSuccess }: ValuationFormProps) {
  const router = useRouter();

  const boundAction = useMemo(
    () => createValuation.bind(null, itemId),
    [itemId],
  );

  const [state, formAction, pending] = useActionState<
    ValuationActionState | null,
    FormData
  >(boundAction, null);

  // Form fields
  const [valuationType, setValuationType] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [valueLow, setValueLow] = useState('');
  const [valueHigh, setValueHigh] = useState('');
  const [valueSingle, setValueSingle] = useState('');
  const [appraiserName, setAppraiserName] = useState('');
  const [appraiserCredentials, setAppraiserCredentials] = useState('');
  const [valuationDate, setValuationDate] = useState<Date | undefined>(
    new Date(),
  );
  const [dateOpen, setDateOpen] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [documentS3Key, setDocumentS3Key] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success('Valuation added');
      router.refresh();
      onSuccess?.();
    }
  }, [state, router, onSuccess]);

  function handleSubmit(formData: FormData) {
    const payload = {
      valuationType: valuationType || undefined,
      isRange,
      valueLow: isRange && valueLow ? parseFloat(valueLow) : undefined,
      valueHigh: isRange && valueHigh ? parseFloat(valueHigh) : undefined,
      valueSingle: !isRange && valueSingle ? parseFloat(valueSingle) : undefined,
      appraiserName: appraiserName || undefined,
      appraiserCredentials: appraiserCredentials || undefined,
      valuationDate: valuationDate
        ? valuationDate.toISOString().split('T')[0]
        : undefined,
      purpose: purpose || undefined,
      notes: notes || undefined,
      documentS3Key: documentS3Key || undefined,
    };
    formData.set('json', JSON.stringify(payload));
    formAction(formData);
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Document must be PDF, JPEG, PNG, or WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Document must be under 10 MB');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/upload/document', {
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

      setDocumentS3Key(s3Key);
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Document upload failed',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Type + Purpose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valuation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valuation Type</Label>
              <Select value={valuationType} onValueChange={setValuationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VALUATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {VALUATION_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valuation Date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal sm:w-auto"
                >
                  {valuationDate
                    ? valuationDate.toLocaleDateString('en-US', {
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
                  selected={valuationDate}
                  onSelect={(date) => {
                    setValuationDate(date);
                    setDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Value */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Value</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="val-range-toggle"
              checked={isRange}
              onCheckedChange={setIsRange}
            />
            <Label htmlFor="val-range-toggle" className="font-normal">
              {isRange ? 'Value Range' : 'Single Value'}
            </Label>
          </div>

          {isRange ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="val-low">Low Estimate</Label>
                <CurrencyInput
                  id="val-low"
                  value={valueLow}
                  onChange={setValueLow}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="val-high">High Estimate</Label>
                <CurrencyInput
                  id="val-high"
                  value={valueHigh}
                  onChange={setValueHigh}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="val-single">Value</Label>
              <CurrencyInput
                id="val-single"
                value={valueSingle}
                onChange={setValueSingle}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appraiser */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appraiser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="val-appraiser-name">Appraiser Name</Label>
              <Input
                id="val-appraiser-name"
                value={appraiserName}
                onChange={(e) => setAppraiserName(e.target.value)}
                placeholder="e.g. John Smith, ASA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="val-appraiser-creds">Credentials</Label>
              <Input
                id="val-appraiser-creds"
                value={appraiserCredentials}
                onChange={(e) => setAppraiserCredentials(e.target.value)}
                placeholder="e.g. ASA, AAA, ISA"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes + Document */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="val-notes">Notes</Label>
            <Textarea
              id="val-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this valuation..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Appraisal Document</Label>
            {documentS3Key ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <FileText className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">
                  Document uploaded
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocumentS3Key('')}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                <Upload className="size-4" />
                {uploading
                  ? 'Uploading...'
                  : 'Upload appraisal report (PDF, JPEG, PNG)'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleDocumentUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending || uploading}>
        {pending ? 'Adding...' : 'Add Valuation'}
      </Button>
    </form>
  );
}
