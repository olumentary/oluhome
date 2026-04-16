import Link from 'next/link';
import { Home, ImageOff, Package } from 'lucide-react';
import { eq, sql, asc, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItems, valuations, itemPhotos } from '@/db/schema';
import { generatePresignedDownloadUrl } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { ShareDialog } from '@/components/share/share-dialog';
import { StopPropagation } from '@/components/layout/stop-propagation';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function RoomsPage() {
  const user = await requireAuth();

  // Get rooms with item counts and values
  const rooms = await db.execute<{
    room: string;
    item_count: string;
    total_value: string;
  }>(sql`
    SELECT
      ci.room,
      COUNT(DISTINCT ci.id)::text AS item_count,
      COALESCE(SUM(lv.val), 0)::text AS total_value
    FROM ${collectionItems} ci
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (sub.item_id)
        COALESCE(sub.value_single, (sub.value_low + sub.value_high) / 2) AS val
      FROM ${valuations} sub
      WHERE sub.item_id = ci.id
      ORDER BY sub.item_id, sub.valuation_date DESC NULLS LAST, sub.created_at DESC
    ) lv ON TRUE
    WHERE ci.user_id = ${user.id} AND ci.room IS NOT NULL
    GROUP BY ci.room
    ORDER BY ci.room
  `);

  // Get up to 4 thumbnail photos per room
  const roomThumbnails: Record<string, string[]> = {};
  if (rooms.rows.length > 0) {
    const roomNames = rooms.rows.map((r) => r.room);
    // For each room, get up to 4 items with primary photos
    for (const roomName of roomNames) {
      const items = await db.query.collectionItems.findMany({
        where: sql`${collectionItems.userId} = ${user.id} AND ${collectionItems.room} = ${roomName}`,
        limit: 4,
        orderBy: [desc(collectionItems.createdAt)],
        with: {
          photos: {
            where: eq(itemPhotos.isPrimary, true),
            limit: 1,
          },
        },
      });

      const urls: string[] = [];
      for (const item of items) {
        const photo = item.photos[0];
        if (photo?.thumbnailKey) {
          try {
            urls.push(await generatePresignedDownloadUrl(photo.thumbnailKey));
          } catch {
            // skip
          }
        } else if (photo?.s3Key) {
          try {
            urls.push(await generatePresignedDownloadUrl(photo.s3Key));
          } catch {
            // skip
          }
        }
      }
      roomThumbnails[roomName] = urls;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse your collection by room location.
        </p>
      </div>

      {rooms.rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.rows.map((room) => {
            const thumbnails = roomThumbnails[room.room] ?? [];
            const itemCount = parseInt(room.item_count, 10);
            const totalValue = parseFloat(room.total_value);

            return (
              <Link
                key={room.room}
                href={`/rooms/${encodeURIComponent(room.room)}`}
              >
                <Card className="group overflow-hidden transition-shadow hover:shadow-md h-full">
                  {/* Thumbnail grid */}
                  <div className="grid grid-cols-2 aspect-[2/1] bg-muted">
                    {thumbnails.length > 0
                      ? thumbnails.slice(0, 4).map((url, i) => (
                          <div
                            key={i}
                            className="overflow-hidden border-r border-b last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0 border-border/50"
                          >
                            <img
                              src={url}
                              alt=""
                              className="size-full object-cover"
                            />
                          </div>
                        ))
                      : Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-center bg-muted"
                          >
                            {i === 0 && (
                              <ImageOff className="size-6 text-muted-foreground/30" />
                            )}
                          </div>
                        ))}
                  </div>

                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Home className="size-4 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {room.room}
                        </h3>
                      </div>
                      <StopPropagation>
                        <ShareDialog
                          scope="room"
                          scopeId={room.room}
                          scopeLabel={room.room}
                        />
                      </StopPropagation>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </span>
                      {totalValue > 0 && (
                        <span className="font-medium text-foreground">
                          {formatCurrency(totalValue)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No rooms assigned yet. Assign rooms to your items to organize by
              location.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
