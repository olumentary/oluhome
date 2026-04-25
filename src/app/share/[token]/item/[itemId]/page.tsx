import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { validateShareToken, getSharedItem } from '@/lib/share';
import { Button } from '@/components/ui/button';
import { SharedItemDetail } from '@/components/share/shared-item-detail';

interface SharedItemPageProps {
  params: Promise<{ token: string; itemId: string }>;
}

export default async function SharedItemPage({ params }: SharedItemPageProps) {
  const { token, itemId } = await params;

  const validated = await validateShareToken(token);
  if (!validated) return null; // Layout handles expired state

  const item = await getSharedItem(validated, itemId);
  if (!item) notFound();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/share/${token}`}>
          <ChevronLeft className="size-4" />
          Back
        </Link>
      </Button>
      <SharedItemDetail
        item={item}
        includeValues={validated.includeValues}
        token={token}
      />
    </div>
  );
}
