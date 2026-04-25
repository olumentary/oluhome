import Link from 'next/link';
import {
  eq,
  and,
  count,
  sum,
  desc,
  isNull,
  sql,
  lt,
} from 'drizzle-orm';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ImageOff,
  Plus,
  Store,
  FileText,
} from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import {
  collectionItems,
  valuations,
  itemPhotos,
} from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await requireAuth();

  // Parallel queries for dashboard stats
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const [
    [totalItems],
    [totalValue],
    recentItems,
    [itemsWithPhotos],
    [itemsWithRecentValuation],
    [allItemsCount],
  ] = await Promise.all([
    // Total items
    db
      .select({ value: count() })
      .from(collectionItems)
      .where(eq(collectionItems.userId, user.id)),

    // Estimated collection value (sum of latest valueSingle per item)
    db
      .select({ value: sum(valuations.valueSingle) })
      .from(valuations)
      .innerJoin(
        collectionItems,
        eq(valuations.itemId, collectionItems.id),
      )
      .where(eq(collectionItems.userId, user.id)),

    // Recent 6 items with primary photo
    db.query.collectionItems.findMany({
      where: eq(collectionItems.userId, user.id),
      orderBy: [desc(collectionItems.createdAt)],
      limit: 6,
      with: {
        photos: {
          where: eq(itemPhotos.isPrimary, true),
          limit: 1,
        },
      },
    }),

    // Items with at least one photo
    db
      .select({ value: count(sql`DISTINCT ${itemPhotos.itemId}`) })
      .from(itemPhotos)
      .innerJoin(
        collectionItems,
        eq(itemPhotos.itemId, collectionItems.id),
      )
      .where(eq(collectionItems.userId, user.id)),

    // Items with a valuation in the last 3 years
    db
      .select({
        value: count(sql`DISTINCT ${valuations.itemId}`),
      })
      .from(valuations)
      .innerJoin(
        collectionItems,
        eq(valuations.itemId, collectionItems.id),
      )
      .where(
        and(
          eq(collectionItems.userId, user.id),
          sql`${valuations.valuationDate} >= ${threeYearsAgo.toISOString().split('T')[0]}`,
        ),
      ),

    // Total items (for computing "without photos" and "needing appraisal")
    db
      .select({ value: count() })
      .from(collectionItems)
      .where(eq(collectionItems.userId, user.id)),
  ]);

  const totalItemCount = totalItems?.value ?? 0;
  const collectionValue = totalValue?.value
    ? parseFloat(totalValue.value)
    : 0;
  const itemsWithoutPhotos =
    totalItemCount - (itemsWithPhotos?.value ?? 0);
  const itemsNeedingAppraisal =
    totalItemCount - (itemsWithRecentValuation?.value ?? 0);

  const stats = [
    {
      label: 'Total Items',
      value: totalItemCount.toLocaleString(),
      icon: Package,
    },
    {
      label: 'Estimated Value',
      value: collectionValue > 0
        ? `$${collectionValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : '--',
      icon: DollarSign,
    },
    {
      label: 'Need Appraisal',
      value: itemsNeedingAppraisal.toLocaleString(),
      icon: AlertTriangle,
    },
    {
      label: 'No Photos',
      value: itemsWithoutPhotos.toLocaleString(),
      icon: ImageOff,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your collection.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent additions */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Additions</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/items">View all</Link>
          </Button>
        </div>
        {recentItems.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentItems.map((item) => {
              const photo = item.photos[0];
              return (
                <Link key={item.id} href={`/items/${item.id}`}>
                  <Card className="group overflow-hidden transition-shadow hover:shadow-md">
                    <div className="aspect-[4/3] bg-muted">
                      {photo ? (
                        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                          {/* Photo thumbnail — rendered when storage is configured */}
                          <ImageOff className="size-8 text-muted-foreground/40" />
                        </div>
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageOff className="size-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="pt-4">
                      <p className="truncate font-medium group-hover:text-primary">
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {item.period && (
                          <span className="text-xs text-muted-foreground">
                            {item.period}
                          </span>
                        )}
                        {item.room && (
                          <Badge variant="secondary" className="text-[10px]">
                            {item.room}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No items in your collection yet.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/items/new">
                  <Plus className="size-4" />
                  Add your first item
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 px-4 py-4"
            asChild
          >
            <Link href="/items/new">
              <Plus className="size-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Add Item</p>
                <p className="text-xs text-muted-foreground">
                  Add a new piece to your collection
                </p>
              </div>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 px-4 py-4"
            asChild
          >
            <Link href="/vendors?action=new">
              <Store className="size-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Add Vendor</p>
                <p className="text-xs text-muted-foreground">
                  Record a dealer or auction house
                </p>
              </div>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 px-4 py-4"
            asChild
          >
            <Link href="/items?export=pdf">
              <FileText className="size-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Inventory Report</p>
                <p className="text-xs text-muted-foreground">
                  Generate a PDF of your collection
                </p>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
