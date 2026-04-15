import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and, desc, asc } from 'drizzle-orm';
import {
  ChevronLeft,
  Pencil,
  FileText,
  Share2,
  Ruler,
  BookOpen,
  ShoppingBag,
  TrendingUp,
  Camera,
  Sparkles,
} from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import {
  collectionItems,
  collectionItemTypes,
  itemPhotos,
  itemMeasurements,
  acquisitions,
  valuations,
} from '@/db/schema';
import { generatePresignedDownloadUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ItemDeleteButton } from '@/components/items/item-delete-button';
import { MeasurementEditor } from '@/components/items/measurement-editor';
import { ItemGallery, PhotoGrid } from '@/components/items/item-gallery';
import { PhotoUploader } from '@/components/items/photo-uploader';
import { AcquisitionDisplay } from '@/components/items/acquisition-display';
import { ValuationDisplay } from '@/components/items/valuation-display';
import { getItemAcquisitions } from '../acquisition-actions';
import { getValuationHistory } from '../valuation-actions';
import type { FieldSchema, FieldDefinition, CustomFieldValues } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  sold: 'Sold',
  gifted: 'Gifted',
  stored: 'Stored',
  on_loan: 'On Loan',
};

function MetadataRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatCustomValue(field: FieldDefinition, value: unknown): string {
  if (value == null) return '--';
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'multi_select' && Array.isArray(value)) return value.join(', ');
  if (field.type === 'number' && field.unit) return `${value} ${field.unit}`;
  return String(value);
}

async function resolvePhotoUrls(photos: { id: string; s3Key: string; thumbnailKey: string | null }[]) {
  const thumbnailUrls: Record<string, string> = {};
  const fullUrls: Record<string, string> = {};

  await Promise.all(
    photos.map(async (photo) => {
      try {
        if (photo.thumbnailKey) {
          thumbnailUrls[photo.id] = await generatePresignedDownloadUrl(photo.thumbnailKey);
        }
        fullUrls[photo.id] = await generatePresignedDownloadUrl(photo.s3Key);
      } catch {
        // If URL generation fails, leave as undefined
      }
    }),
  );

  return { thumbnailUrls, fullUrls };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const item = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.id, id),
      eq(collectionItems.userId, user.id),
    ),
    with: {
      itemType: true,
      photos: {
        orderBy: [asc(itemPhotos.displayOrder)],
      },
      measurements: {
        orderBy: [asc(itemMeasurements.displayOrder)],
      },
      valuations: {
        orderBy: [desc(valuations.createdAt)],
      },
    },
  });

  if (!item) notFound();

  // Fetch acquisitions and valuations in parallel
  const [itemAcquisitions, itemValuations] = await Promise.all([
    getItemAcquisitions(id),
    getValuationHistory(id),
  ]);

  const fieldSchema = item.itemType.fieldSchema as FieldSchema | null;
  const customFields = (item.customFields as CustomFieldValues) ?? {};
  const latestValuation = item.valuations[0];

  // Resolve presigned URLs for photos
  const { thumbnailUrls, fullUrls } = await resolvePhotoUrls(item.photos);

  // Build gallery photo data
  const galleryPhotos = item.photos.map((photo) => ({
    id: photo.id,
    caption: photo.caption,
    isPrimary: photo.isPrimary,
    thumbnailUrl: thumbnailUrls[photo.id] ?? null,
    fullUrl: fullUrls[photo.id] ?? null,
  }));

  // Group custom fields by their group
  const fieldGroups = fieldSchema?.fields
    ? Object.entries(
        fieldSchema.fields.reduce<Record<string, FieldDefinition[]>>(
          (acc, field) => {
            const group = field.group || 'General';
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
          },
          {},
        ),
      )
    : [];

  // Subtitle parts
  const subtitleParts = [item.period, item.style, item.originCountry].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/items">
            <ChevronLeft className="size-4" />
            Collection
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/items/${id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileText className="size-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Share2 className="size-4" />
            Share
          </Button>
          <ItemDeleteButton itemId={id} itemTitle={item.title} />
        </div>
      </div>

      {/* Hero section */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Photo gallery */}
        <ItemGallery photos={galleryPhotos} />

        {/* Title + quick info */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.itemType.name}</Badge>
              <Badge
                variant={item.status === 'active' ? 'default' : 'secondary'}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground lg:text-3xl">
              {item.title}
            </h1>
            {subtitleParts.length > 0 && (
              <p className="mt-1 text-muted-foreground">
                {subtitleParts.join(' \u00b7 ')}
              </p>
            )}
            {item.makerAttribution && (
              <p className="mt-1 text-sm italic text-muted-foreground">
                {item.makerAttribution}
              </p>
            )}
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}

          {/* Quick stats */}
          <div className="grid gap-3 sm:grid-cols-2">
            {latestValuation && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">Estimated Value</p>
                  <p className="text-lg font-bold">
                    {latestValuation.valueSingle
                      ? `$${parseFloat(latestValuation.valueSingle).toLocaleString()}`
                      : latestValuation.valueLow && latestValuation.valueHigh
                        ? `$${parseFloat(latestValuation.valueLow).toLocaleString()} - $${parseFloat(latestValuation.valueHigh).toLocaleString()}`
                        : '--'}
                  </p>
                </CardContent>
              </Card>
            )}
            {item.condition && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">Condition</p>
                  <p className="text-lg font-bold">
                    {CONDITION_LABELS[item.condition] ?? item.condition}
                  </p>
                </CardContent>
              </Card>
            )}
            {item.room && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-lg font-bold">{item.room}</p>
                  {item.positionInRoom && (
                    <p className="text-xs text-muted-foreground">{item.positionInRoom}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Materials + tags */}
          {item.materials && item.materials.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Materials</p>
              <div className="flex flex-wrap gap-1.5">
                {item.materials.map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="measurements">
            <Ruler className="mr-1 size-3.5" />
            Measurements
          </TabsTrigger>
          <TabsTrigger value="provenance">
            <BookOpen className="mr-1 size-3.5" />
            Provenance
          </TabsTrigger>
          <TabsTrigger value="acquisition">
            <ShoppingBag className="mr-1 size-3.5" />
            Acquisition
          </TabsTrigger>
          <TabsTrigger value="valuations">
            <TrendingUp className="mr-1 size-3.5" />
            Valuations
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="mr-1 size-3.5" />
            Photos{item.photos.length > 0 ? ` (${item.photos.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="mr-1 size-3.5" />
            AI Analysis
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Base fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Base Information</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <MetadataRow label="Type" value={item.itemType.name} />
              <MetadataRow label="Period" value={item.period} />
              <MetadataRow label="Style" value={item.style} />
              <MetadataRow label="Origin" value={[item.originCountry, item.originRegion].filter(Boolean).join(', ') || null} />
              <MetadataRow label="Maker / Attribution" value={item.makerAttribution} />
              <MetadataRow label="Condition" value={item.condition ? CONDITION_LABELS[item.condition] : null} />
              {item.conditionNotes && (
                <div className="py-2">
                  <span className="text-sm text-muted-foreground">Condition Notes</span>
                  <p className="mt-1 text-sm">{item.conditionNotes}</p>
                </div>
              )}
              <MetadataRow label="Room" value={item.room} />
              <MetadataRow label="Position" value={item.positionInRoom} />
              <MetadataRow label="Status" value={STATUS_LABELS[item.status]} />
            </CardContent>
          </Card>

          {/* Dimensions */}
          {(item.height || item.width || item.depth || item.diameter || item.weight) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <MetadataRow label="Height" value={item.height ? `${item.height} in.` : null} />
                <MetadataRow label="Width" value={item.width ? `${item.width} in.` : null} />
                <MetadataRow label="Depth" value={item.depth ? `${item.depth} in.` : null} />
                <MetadataRow label="Diameter" value={item.diameter ? `${item.diameter} in.` : null} />
                <MetadataRow label="Weight" value={item.weight ? `${item.weight} lbs.` : null} />
              </CardContent>
            </Card>
          )}

          {/* Custom fields by group */}
          {fieldGroups.map(([groupName, fields]) => {
            const hasValues = fields.some((f) => customFields[f.key] != null);
            if (!hasValues) return null;
            return (
              <Card key={groupName}>
                <CardHeader>
                  <CardTitle className="text-base">{groupName}</CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {fields.map((field) => {
                    const value = customFields[field.key];
                    if (value == null) return null;
                    return (
                      <MetadataRow
                        key={field.key}
                        label={field.label}
                        value={formatCustomValue(field, value)}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {item.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements">
          <MeasurementEditor
            itemId={id}
            measurements={item.measurements}
            presets={fieldSchema?.measurement_presets ?? []}
          />
        </TabsContent>

        {/* Provenance Tab */}
        <TabsContent value="provenance">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {item.provenanceNarrative ? (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Provenance Narrative
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {item.provenanceNarrative}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No provenance information recorded yet.
                </p>
              )}
              {item.provenanceReferences && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      References
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {item.provenanceReferences}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acquisition Tab */}
        <TabsContent value="acquisition">
          <AcquisitionDisplay itemId={id} acquisitions={itemAcquisitions} />
        </TabsContent>

        {/* Valuations Tab */}
        <TabsContent value="valuations">
          <ValuationDisplay itemId={id} valuations={itemValuations} />
        </TabsContent>

        {/* Photos Tab — Gallery + Uploader */}
        <TabsContent value="photos" className="space-y-6">
          <PhotoUploader
            itemId={id}
            existingPhotos={item.photos}
            thumbnailUrls={thumbnailUrls}
          />
        </TabsContent>

        {/* AI Analysis Tab — Placeholder */}
        <TabsContent value="ai">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                AI analysis coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
