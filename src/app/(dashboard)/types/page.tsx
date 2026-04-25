import Link from 'next/link';
import { eq, sql, count, asc } from 'drizzle-orm';
import { Plus, Shapes, Pencil } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { collectionItemTypes, collectionItems } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TypeDeleteButton } from '@/components/types/type-delete-button';
import type { FieldSchema } from '@/types';

export default async function ItemTypesPage() {
  const user = await requireAuth();

  const typesWithCounts = await db
    .select({
      id: collectionItemTypes.id,
      name: collectionItemTypes.name,
      slug: collectionItemTypes.slug,
      description: collectionItemTypes.description,
      icon: collectionItemTypes.icon,
      fieldSchema: collectionItemTypes.fieldSchema,
      displayOrder: collectionItemTypes.displayOrder,
      itemCount: count(collectionItems.id),
    })
    .from(collectionItemTypes)
    .leftJoin(
      collectionItems,
      sql`${collectionItems.itemTypeId} = ${collectionItemTypes.id}
          AND ${collectionItems.userId} = ${user.id}`,
    )
    .where(eq(collectionItemTypes.userId, user.id))
    .groupBy(collectionItemTypes.id)
    .orderBy(asc(collectionItemTypes.displayOrder), asc(collectionItemTypes.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Item Types</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define custom field schemas that drive your item forms.
          </p>
        </div>
        <Button asChild>
          <Link href="/types/new">
            <Plus className="size-4" />
            Create Custom Type
          </Link>
        </Button>
      </div>

      {typesWithCounts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typesWithCounts.map((t) => {
            const schema = t.fieldSchema as FieldSchema | null;
            const fieldCount = schema?.fields?.length ?? 0;

            return (
              <Card key={t.id} className="group relative transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shapes className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                    <span>{t.itemCount} item{t.itemCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/types/${t.id}`}>
                        <Pencil className="size-3" />
                        Edit
                      </Link>
                    </Button>
                    <TypeDeleteButton
                      typeId={t.id}
                      typeName={t.name}
                      itemCount={t.itemCount}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shapes className="size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No item types yet. Create one to get started.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/types/new">
                <Plus className="size-4" />
                Create your first type
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
