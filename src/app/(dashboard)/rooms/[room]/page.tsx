import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  DollarSign,
  Home,
  ImageOff,
  Package,
} from 'lucide-react';
import { eq, sql, desc, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems, valuations, itemPhotos } from '@/db/schema';
import { generatePresignedDownloadUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomPdfButton } from '@/components/rooms/room-pdf-button';

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface RoomDetailPageProps {
  params: Promise<{ room: string }>;
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const user = await requireAuth();
  const { room: roomSlug } = await params;
  const roomName = decodeURIComponent(roomSlug);

  // Get items in this room
  const items = await db.query.collectionItems.findMany({
    where: sql`${collectionItems.userId} = ${user.id} AND ${collectionItems.room} = ${roomName}`,
    orderBy: [desc(collectionItems.createdAt)],
    with: {
      itemType: { columns: { name: true } },
      photos: {
        where: eq(itemPhotos.isPrimary, true),
        limit: 1,
      },
      valuations: {
        orderBy: [desc(valuations.valuationDate), desc(valuations.createdAt)],
        limit: 1,
      },
    },
  });

  if (items.length === 0) notFound();

  // Resolve photo URLs and compute room value
  let roomTotalValue = 0;
  const itemsWithUrls = await Promise.all(
    items.map(async (item) => {
      let thumbnailUrl: string | null = null;
      const photo = item.photos[0];
      if (photo) {
        try {
          thumbnailUrl = await generatePresignedDownloadUrl(
            photo.thumbnailKey ?? photo.s3Key,
          );
        } catch {
          // skip
        }
      }

      const latestVal = item.valuations[0];
      let value = 0;
      if (latestVal) {
        if (latestVal.valueSingle) {
          value = parseFloat(latestVal.valueSingle);
        } else if (latestVal.valueLow && latestVal.valueHigh) {
          value =
            (parseFloat(latestVal.valueLow) +
              parseFloat(latestVal.valueHigh)) /
            2;
        }
      }
      roomTotalValue += value;

      return { ...item, thumbnailUrl, estimatedValue: value };
    }),
  );

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rooms">
            <ChevronLeft className="size-4" />
            Rooms
          </Link>
        </Button>
        <RoomPdfButton room={roomName} />
      </div>

      <div className="flex items-center gap-3">
        <Home className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{roomName}</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {roomTotalValue > 0 && (
              <span>
                {' '}
                &middot; {formatCurrency(roomTotalValue)} estimated value
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Item grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itemsWithUrls.map((item) => (
          <Link key={item.id} href={`/items/${item.id}`}>
            <Card className="group overflow-hidden transition-shadow hover:shadow-md h-full">
              <div className="aspect-[4/3] bg-muted">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageOff className="size-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <CardContent className="pt-4 space-y-2">
                <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {item.itemType.name}
                  </Badge>
                  {item.condition && (
                    <Badge variant="secondary" className="text-[10px]">
                      {CONDITION_LABELS[item.condition] ?? item.condition}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  {item.period && (
                    <span className="text-xs text-muted-foreground">
                      {item.period}
                    </span>
                  )}
                  {item.estimatedValue > 0 && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(item.estimatedValue)}
                    </span>
                  )}
                </div>
                {item.positionInRoom && (
                  <p className="text-xs text-muted-foreground">
                    {item.positionInRoom}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
