'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ItemCardProps {
  id: string;
  title: string;
  typeName: string;
  period: string | null;
  room: string | null;
  condition: string | null;
  latestValue: string | null;
  thumbnailUrl: string | null;
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export function ItemCard({
  id,
  title,
  typeName,
  period,
  room,
  condition,
  latestValue,
  thumbnailUrl,
}: ItemCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/items/${id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-[4/3] bg-muted">
          {thumbnailUrl && !imgError ? (
            <img
              src={thumbnailUrl}
              alt={title}
              onError={() => setImgError(true)}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageOff className="size-8 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <CardContent className="space-y-2 pt-4">
          <p className="truncate font-medium group-hover:text-primary">
            {title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {typeName}
            </Badge>
            {period && (
              <Badge variant="secondary" className="text-[10px]">
                {period}
              </Badge>
            )}
            {room && (
              <Badge variant="secondary" className="text-[10px]">
                {room}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            {condition && (
              <span className="text-xs text-muted-foreground">
                {CONDITION_LABELS[condition] ?? condition}
              </span>
            )}
            {latestValue && (
              <span className="text-sm font-medium text-foreground">
                ${parseFloat(latestValue).toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
