import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { validateShareToken, getSharedData } from '@/lib/share';
import type { SharedItemCard } from '@/lib/share';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SharedItemDetail } from '@/components/share/shared-item-detail';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SharedPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ room?: string }>;
}

export default async function SharedPage({ params, searchParams }: SharedPageProps) {
  const { token } = await params;
  const { room: roomFilter } = await searchParams;

  const validated = await validateShareToken(token);
  if (!validated) return null; // Layout handles the expired/invalid state

  const data = await getSharedData(validated);
  if (!data) notFound();

  switch (data.type) {
    case 'item':
      return (
        <SharedItemDetail
          item={data.item}
          includeValues={validated.includeValues}
          token={token}
        />
      );

    case 'room':
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{data.roomName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.items.length} item{data.items.length !== 1 ? 's' : ''} in this room
            </p>
          </div>
          <ItemCardGrid items={data.items} token={token} />
        </div>
      );

    case 'collection': {
      const filtered = roomFilter
        ? data.items.filter((i) => i.room === roomFilter)
        : data.items;

      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collection</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.items.length} item{data.items.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Room filter */}
          {data.rooms.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/share/${token}`}>
                <Badge variant={!roomFilter ? 'default' : 'outline'}>All</Badge>
              </Link>
              {data.rooms.map((r) => (
                <Link key={r} href={`/share/${token}?room=${encodeURIComponent(r)}`}>
                  <Badge variant={roomFilter === r ? 'default' : 'outline'}>{r}</Badge>
                </Link>
              ))}
            </div>
          )}

          <ItemCardGrid items={filtered} token={token} />
        </div>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Item card grid (used for room and collection views)
// ---------------------------------------------------------------------------

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

function formatCurrency(value: string): string {
  if (value.includes('-')) {
    const [low, high] = value.split('-');
    return `$${parseFloat(low).toLocaleString()} - $${parseFloat(high).toLocaleString()}`;
  }
  return `$${parseFloat(value).toLocaleString()}`;
}

function ItemCardGrid({
  items,
  token,
}: {
  items: SharedItemCard[];
  token: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageOff className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">No items found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link key={item.id} href={`/share/${token}/item/${item.id}`}>
          <Card className="group overflow-hidden transition-shadow hover:shadow-md h-full">
            <div className="aspect-[4/3] bg-muted overflow-hidden">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageOff className="size-10 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <CardContent className="pt-3">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {item.title}
              </h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.period && (
                  <span className="text-xs text-muted-foreground">{item.period}</span>
                )}
                {item.period && item.style && (
                  <span className="text-xs text-muted-foreground">&middot;</span>
                )}
                {item.style && (
                  <span className="text-xs text-muted-foreground">{item.style}</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {item.condition && (
                  <Badge variant="secondary" className="text-xs">
                    {CONDITION_LABELS[item.condition] ?? item.condition}
                  </Badge>
                )}
                {item.latestValue && (
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(item.latestValue)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
