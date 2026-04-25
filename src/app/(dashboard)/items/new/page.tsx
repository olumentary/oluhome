import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { ChevronLeft, Camera } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { vendors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ItemForm } from '@/components/items/item-form';
import { getItemTypes, getRooms } from '../actions';

interface NewItemPageProps {
  searchParams: Promise<{ type?: string; vendorId?: string }>;
}

export default async function NewItemPage({ searchParams }: NewItemPageProps) {
  const user = await requireAuth();
  const params = await searchParams;

  const [itemTypes, rooms] = await Promise.all([
    getItemTypes(),
    getRooms(),
  ]);

  // If vendorId is in the URL (from "Add Item from this Vendor"), resolve it
  let initialVendorId: string | undefined;
  let initialVendorLabel: string | undefined;
  if (params.vendorId) {
    const vendor = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.id, params.vendorId),
        eq(vendors.userId, user.id),
      ),
      columns: { id: true, name: true, businessName: true },
    });
    if (vendor) {
      initialVendorId = vendor.id;
      initialVendorLabel = vendor.businessName
        ? `${vendor.name} (${vendor.businessName})`
        : vendor.name;
    }
  }

  const initialValues = params.type
    ? {
        itemTypeId: params.type,
        title: '',
        description: '',
        period: '',
        style: '',
        originCountry: '',
        originRegion: '',
        makerAttribution: '',
        materials: [] as string[],
        condition: '',
        conditionNotes: '',
        height: '',
        width: '',
        depth: '',
        diameter: '',
        weight: '',
        room: '',
        positionInRoom: '',
        customFields: {},
        provenanceNarrative: '',
        provenanceReferences: '',
        notes: '',
        tags: [] as string[],
        status: 'active',
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/items">
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a new piece to your collection.
          </p>
        </div>
      </div>

      <ItemForm
        itemTypes={itemTypes}
        existingRooms={rooms}
        initialVendorId={initialVendorId}
        initialVendorLabel={initialVendorLabel}
        initialValues={initialValues}
      />

      {/* Photo upload hint for new items */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Camera className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Save the item first, then add photos from the edit page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
