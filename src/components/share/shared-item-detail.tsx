'use client';

import { FileText, Ruler, BookOpen, ShoppingBag, TrendingUp, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ItemGallery } from '@/components/items/item-gallery';
import type { SharedItem } from '@/lib/share';
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

const VALUATION_TYPE_LABELS: Record<string, string> = {
  estimated: 'Estimated',
  appraised: 'Appraised',
  insured: 'Insured',
  auction_estimate: 'Auction Est.',
  retail: 'Retail',
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

function formatCurrency(amount: string | null | undefined): string {
  if (!amount) return '--';
  const num = parseFloat(amount);
  if (isNaN(num)) return '--';
  return `$${num.toLocaleString()}`;
}

function formatCustomValue(field: FieldDefinition, value: unknown): string {
  if (value == null) return '--';
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'multi_select' && Array.isArray(value)) return value.join(', ');
  if (field.type === 'number' && field.unit) return `${value} ${field.unit}`;
  return String(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SharedItemDetailProps {
  item: SharedItem;
  includeValues: boolean;
  token: string;
}

export function SharedItemDetail({ item, includeValues, token }: SharedItemDetailProps) {
  const fieldSchema = item.itemType.fieldSchema as FieldSchema | null;
  const customFields = (item.customFields as CustomFieldValues) ?? {};
  const latestValuation = item.valuations[0];

  const galleryPhotos = item.photos.map((photo) => ({
    id: photo.id,
    caption: photo.caption,
    isPrimary: photo.isPrimary,
    thumbnailUrl: photo.thumbnailUrl,
    fullUrl: photo.fullUrl,
  }));

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

  const subtitleParts = [item.period, item.style, item.originCountry].filter(Boolean);

  // Build tabs list
  const showValuations = includeValues && item.valuations.length > 0;
  const showAcquisition = includeValues && item.acquisitions.length > 0;
  const hasMeasurements = item.measurements.length > 0;
  const hasProvenance = item.provenanceNarrative || item.provenanceReferences;
  const hasPhotos = item.photos.length > 1;

  function openPdf(template: 'catalog' | 'insurance') {
    window.open(`/share/${token}/pdf?template=${template}&item=${item.id}`, '_blank');
  }

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ItemGallery photos={galleryPhotos} />

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.itemType.name}</Badge>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
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
            {includeValues && latestValuation && (
              <Card>
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground">Estimated Value</p>
                  <p className="text-lg font-bold">
                    {latestValuation.valueSingle
                      ? formatCurrency(latestValuation.valueSingle)
                      : latestValuation.valueLow && latestValuation.valueHigh
                        ? `${formatCurrency(latestValuation.valueLow)} - ${formatCurrency(latestValuation.valueHigh)}`
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
                  <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                ))}
              </div>
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* PDF button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="size-4" />
                Generate PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => openPdf('catalog')}>
                Catalog Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPdf('insurance')}>
                Insurance Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {hasMeasurements && (
            <TabsTrigger value="measurements">
              <Ruler className="mr-1 size-3.5" />
              Measurements
            </TabsTrigger>
          )}
          {hasProvenance && (
            <TabsTrigger value="provenance">
              <BookOpen className="mr-1 size-3.5" />
              Provenance
            </TabsTrigger>
          )}
          {showAcquisition && (
            <TabsTrigger value="acquisition">
              <ShoppingBag className="mr-1 size-3.5" />
              Acquisition
            </TabsTrigger>
          )}
          {showValuations && (
            <TabsTrigger value="valuations">
              <TrendingUp className="mr-1 size-3.5" />
              Valuations
            </TabsTrigger>
          )}
          {hasPhotos && (
            <TabsTrigger value="photos">
              <Camera className="mr-1 size-3.5" />
              Photos ({item.photos.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Details */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Base Information</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <MetadataRow label="Type" value={item.itemType.name} />
              <MetadataRow label="Period" value={item.period} />
              <MetadataRow label="Style" value={item.style} />
              <MetadataRow
                label="Origin"
                value={[item.originCountry, item.originRegion].filter(Boolean).join(', ') || null}
              />
              <MetadataRow label="Maker / Attribution" value={item.makerAttribution} />
              <MetadataRow
                label="Condition"
                value={item.condition ? CONDITION_LABELS[item.condition] : null}
              />
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

        {/* Measurements */}
        {hasMeasurements && (
          <TabsContent value="measurements">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {item.measurements.map((m) => (
                    <div key={m.id} className="rounded-lg border p-4">
                      <h4 className="text-sm font-semibold">{m.label}</h4>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        {m.height && <span className="text-muted-foreground">H: {m.height} in.</span>}
                        {m.width && <span className="text-muted-foreground">W: {m.width} in.</span>}
                        {m.depth && <span className="text-muted-foreground">D: {m.depth} in.</span>}
                        {m.diameter && <span className="text-muted-foreground">Diam: {m.diameter} in.</span>}
                      </div>
                      {m.notes && (
                        <p className="mt-2 text-xs text-muted-foreground">{m.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Provenance */}
        {hasProvenance && (
          <TabsContent value="provenance">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {item.provenanceNarrative && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Provenance Narrative
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {item.provenanceNarrative}
                    </p>
                  </div>
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
        )}

        {/* Acquisition */}
        {showAcquisition && (
          <TabsContent value="acquisition">
            <div className="space-y-4">
              {item.acquisitions.map((acq) => (
                <Card key={acq.id}>
                  <CardContent className="pt-6 divide-y">
                    <MetadataRow label="Date" value={acq.acquisitionDate} />
                    <MetadataRow label="Type" value={acq.acquisitionType} />
                    <MetadataRow label="Purchase Price" value={formatCurrency(acq.purchasePrice)} />
                    <MetadataRow label="Total Cost" value={formatCurrency(acq.totalCost)} />
                    {acq.vendor && (
                      <MetadataRow
                        label="Vendor"
                        value={acq.vendor.businessName ?? acq.vendor.name}
                      />
                    )}
                    <MetadataRow label="Lot Number" value={acq.lotNumber} />
                    <MetadataRow label="Sale Name" value={acq.saleName} />
                    {acq.notes && (
                      <div className="py-2">
                        <span className="text-sm text-muted-foreground">Notes</span>
                        <p className="mt-1 text-sm">{acq.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Valuations */}
        {showValuations && (
          <TabsContent value="valuations">
            <div className="space-y-4">
              {item.valuations.map((v) => (
                <Card key={v.id}>
                  <CardContent className="pt-6 divide-y">
                    <MetadataRow
                      label="Type"
                      value={VALUATION_TYPE_LABELS[v.valuationType] ?? v.valuationType}
                    />
                    <MetadataRow label="Date" value={v.valuationDate} />
                    {v.valueSingle ? (
                      <MetadataRow label="Value" value={formatCurrency(v.valueSingle)} />
                    ) : (
                      <MetadataRow
                        label="Range"
                        value={
                          v.valueLow && v.valueHigh
                            ? `${formatCurrency(v.valueLow)} - ${formatCurrency(v.valueHigh)}`
                            : null
                        }
                      />
                    )}
                    <MetadataRow label="Appraiser" value={v.appraiserName} />
                    <MetadataRow label="Credentials" value={v.appraiserCredentials} />
                    <MetadataRow label="Purpose" value={v.purpose} />
                    {v.notes && (
                      <div className="py-2">
                        <span className="text-sm text-muted-foreground">Notes</span>
                        <p className="mt-1 text-sm">{v.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Photos grid */}
        {hasPhotos && (
          <TabsContent value="photos">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {item.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  {photo.thumbnailUrl ? (
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.caption || 'Photo'}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <span className="text-muted-foreground/40 text-xs">No image</span>
                    </div>
                  )}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4">
                      <p className="text-xs text-white">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
