'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
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
  createVendor,
  updateVendor,
  type VendorActionState,
} from '@/app/(dashboard)/vendors/actions';
import { toast } from 'sonner';
import type { Vendor } from '@/types';

const VENDOR_TYPES = [
  { value: 'dealer', label: 'Dealer' },
  { value: 'auction_house', label: 'Auction House' },
  { value: 'private', label: 'Private Seller' },
  { value: 'estate_sale', label: 'Estate Sale' },
  { value: 'flea_market', label: 'Flea Market' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'other', label: 'Other' },
] as const;

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="rounded p-0.5 transition-colors hover:bg-accent"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={`size-5 ${
              star <= display
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
      {value && (
        <button
          type="button"
          className="ml-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      )}
    </div>
  );
}

interface VendorFormProps {
  id?: string;
  initialValues?: Vendor;
  onSuccess?: (id: string) => void;
  compact?: boolean;
}

export function VendorForm({ id, initialValues, onSuccess, compact }: VendorFormProps) {
  const isEditing = !!id;
  const router = useRouter();
  const action = isEditing ? updateVendor : createVendor;
  const [state, formAction, pending] = useActionState<
    VendorActionState | null,
    FormData
  >(action, null);

  const [name, setName] = useState(initialValues?.name ?? '');
  const [businessName, setBusinessName] = useState(
    initialValues?.businessName ?? '',
  );
  const [type, setType] = useState<string>(initialValues?.type ?? '');
  const [email, setEmail] = useState(initialValues?.email ?? '');
  const [phone, setPhone] = useState(initialValues?.phone ?? '');
  const [website, setWebsite] = useState(initialValues?.website ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [specialty, setSpecialty] = useState(initialValues?.specialty ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [rating, setRating] = useState<number | null>(
    initialValues?.rating ?? null,
  );

  useEffect(() => {
    if (state?.success && state.id) {
      toast.success(isEditing ? 'Vendor updated' : 'Vendor created');
      if (onSuccess) {
        onSuccess(state.id);
      } else {
        router.push(`/vendors/${state.id}`);
      }
    }
  }, [state, isEditing, router, onSuccess]);

  function handleSubmit(formData: FormData) {
    const payload = {
      name,
      businessName: businessName || undefined,
      type: type || undefined,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      address: address || undefined,
      specialty: specialty || undefined,
      notes: notes || undefined,
      rating: rating ?? undefined,
    };
    formData.set('json', JSON.stringify(payload));
    if (id) formData.set('id', id);
    formAction(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {compact ? 'New Vendor' : 'Basic Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">Name *</Label>
              <Input
                id="vendor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contact name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-business">Business Name</Label>
              <Input
                id="vendor-business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business or shop name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendor-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="vendor-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-specialty">Specialty</Label>
              <Input
                id="vendor-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. American furniture, Asian ceramics"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Rating</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>
        </CardContent>
      </Card>

      {!compact && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-email">Email</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input
                  id="vendor-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-website">Website</Label>
              <Input
                id="vendor-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-address">Address</Label>
              <Textarea
                id="vendor-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!compact && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="vendor-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this vendor..."
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save Changes'
              : 'Create Vendor'}
        </Button>
        {!compact && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
