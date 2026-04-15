import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { ItemForm } from '@/components/items/item-form';
import { getItemTypes, getRooms } from '../actions';

interface NewItemPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function NewItemPage({ searchParams }: NewItemPageProps) {
  await requireAuth();
  const params = await searchParams;

  const [itemTypes, rooms] = await Promise.all([
    getItemTypes(),
    getRooms(),
  ]);

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
        initialValues={initialValues}
      />
    </div>
  );
}
