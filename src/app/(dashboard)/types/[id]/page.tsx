import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItemTypes } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { TypeForm } from '@/components/types/type-form';
import { BreadcrumbTitle } from '@/components/layout/breadcrumb-title';
import type { FieldSchema } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemTypeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuth();

  const itemType = await db.query.collectionItemTypes.findFirst({
    where: and(
      eq(collectionItemTypes.id, id),
      eq(collectionItemTypes.userId, user.id),
    ),
  });

  if (!itemType) notFound();

  const fieldSchema = (itemType.fieldSchema as FieldSchema | null) ?? {
    fields: [],
  };

  return (
    <div className="space-y-6">
      <BreadcrumbTitle segment={id} title={itemType.name} />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/types">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {itemType.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit type schema and settings
          </p>
        </div>
      </div>

      <TypeForm
        id={itemType.id}
        initialValues={{
          name: itemType.name,
          slug: itemType.slug,
          description: itemType.description ?? '',
          icon: itemType.icon ?? '',
          fieldSchema,
        }}
      />
    </div>
  );
}
