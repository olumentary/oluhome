import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and, asc } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems, itemPhotos } from '@/db/schema';
import { generatePresignedDownloadUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { ItemForm } from '@/components/items/item-form';
import { PhotoUploader } from '@/components/items/photo-uploader';
import { getItemTypes, getRooms } from '../../actions';
import type { CustomFieldValues } from '@/types';

interface EditItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const [item, itemTypes, rooms] = await Promise.all([
    db.query.collectionItems.findFirst({
      where: and(
        eq(collectionItems.id, id),
        eq(collectionItems.userId, user.id),
      ),
      with: {
        photos: {
          orderBy: [asc(itemPhotos.displayOrder)],
        },
      },
    }),
    getItemTypes(),
    getRooms(),
  ]);

  if (!item) notFound();

  // Resolve thumbnail URLs
  const thumbnailUrls: Record<string, string> = {};
  await Promise.all(
    item.photos.map(async (photo) => {
      try {
        if (photo.thumbnailKey) {
          thumbnailUrls[photo.id] = await generatePresignedDownloadUrl(photo.thumbnailKey);
        }
      } catch {
        // Skip failed URL generation
      }
    }),
  );

  const initialValues = {
    itemTypeId: item.itemTypeId,
    title: item.title,
    description: item.description ?? '',
    period: item.period ?? '',
    style: item.style ?? '',
    originCountry: item.originCountry ?? '',
    originRegion: item.originRegion ?? '',
    makerAttribution: item.makerAttribution ?? '',
    materials: item.materials ?? [],
    condition: item.condition ?? '',
    conditionNotes: item.conditionNotes ?? '',
    height: item.height ?? '',
    width: item.width ?? '',
    depth: item.depth ?? '',
    diameter: item.diameter ?? '',
    weight: item.weight ?? '',
    room: item.room ?? '',
    positionInRoom: item.positionInRoom ?? '',
    customFields: (item.customFields as CustomFieldValues) ?? {},
    provenanceNarrative: item.provenanceNarrative ?? '',
    provenanceReferences: item.provenanceReferences ?? '',
    notes: item.notes ?? '',
    tags: item.tags ?? [],
    status: item.status,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/items/${id}`}>
            <ChevronLeft className="size-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.title}
          </p>
        </div>
      </div>

      <ItemForm
        id={id}
        itemTypes={itemTypes}
        existingRooms={rooms}
        initialValues={initialValues}
      />

      {/* Photos section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Photos</h2>
        <PhotoUploader
          itemId={id}
          existingPhotos={item.photos}
          thumbnailUrls={thumbnailUrls}
        />
      </div>
    </div>
  );
}
