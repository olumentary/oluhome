import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  Pencil,
  Plus,
  Star,
  Mail,
  Phone,
  Globe,
  MapPin,
  Package,
  DollarSign,
  Percent,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { VendorDeleteButton } from '@/components/vendors/vendor-delete-button';
import { getVendorWithPurchaseHistory } from '../actions';
import { BreadcrumbTitle } from '@/components/layout/breadcrumb-title';

const VENDOR_TYPE_LABELS: Record<string, string> = {
  dealer: 'Dealer',
  auction_house: 'Auction House',
  private: 'Private Seller',
  estate_sale: 'Estate Sale',
  flea_market: 'Flea Market',
  gallery: 'Gallery',
  other: 'Other',
};

const VENDOR_TYPE_COLORS: Record<string, string> = {
  dealer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  auction_house:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  private:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  estate_sale:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  flea_market:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  gallery: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const ACQUISITION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  gift: 'Gift',
  inheritance: 'Inheritance',
  trade: 'Trade',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface VendorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorDetailPage({
  params,
}: VendorDetailPageProps) {
  const { id } = await params;
  const data = await getVendorWithPurchaseHistory(id);

  if (!data) notFound();

  const { vendor, purchaseHistory, stats } = data;

  return (
    <div className="space-y-6">
      <BreadcrumbTitle segment={id} title={vendor.name} />
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vendors">
            <ChevronLeft className="size-4" />
            Vendors
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vendors/${id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <VendorDeleteButton vendorId={id} vendorName={vendor.name} />
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {vendor.type && (
                  <Badge
                    variant="secondary"
                    className={
                      VENDOR_TYPE_COLORS[vendor.type] ?? ''
                    }
                  >
                    {VENDOR_TYPE_LABELS[vendor.type] ?? vendor.type}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {vendor.name}
              </h1>
              {vendor.businessName && (
                <p className="text-muted-foreground">{vendor.businessName}</p>
              )}
              {vendor.specialty && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {vendor.specialty}
                </p>
              )}
            </div>

            {vendor.rating && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4 ${
                      star <= vendor.rating!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Contact details */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {vendor.email && (
              <a
                href={`mailto:${vendor.email}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="size-3.5" />
                {vendor.email}
              </a>
            )}
            {vendor.phone && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="size-3.5" />
                {vendor.phone}
              </span>
            )}
            {vendor.website && (
              <a
                href={
                  vendor.website.startsWith('http')
                    ? vendor.website
                    : `https://${vendor.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="size-3.5" />
                {vendor.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="size-3" />
              </a>
            )}
            {vendor.address && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3.5" />
                {vendor.address}
              </span>
            )}
          </div>

          {vendor.notes && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {vendor.notes}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="size-4" />
              <span className="text-xs">Total Items</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="size-4" />
              <span className="text-xs">Total Spend</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {stats.totalSpend > 0 ? formatCurrency(stats.totalSpend) : '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="size-4" />
              <span className="text-xs">Avg. Discount</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {stats.avgDiscount > 0
                ? `${stats.avgDiscount.toFixed(1)}%`
                : '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              <span className="text-xs">Active Since</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {new Date(vendor.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Purchase History</CardTitle>
          <Button size="sm" asChild>
            <Link href={`/items/new?vendorId=${id}`}>
              <Plus className="size-4" />
              Add Item from this Vendor
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {purchaseHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No purchase records yet.
            </p>
          ) : (
            <div className="divide-y">
              {purchaseHistory.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center gap-4 py-3"
                >
                  {/* Thumbnail */}
                  <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {purchase.thumbnailUrl ? (
                      <img
                        src={purchase.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground/30">
                        <Package className="size-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/items/${purchase.itemId}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {purchase.itemTitle}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {purchase.acquisitionDate && (
                        <span>{formatDate(purchase.acquisitionDate)}</span>
                      )}
                      {purchase.acquisitionType && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ACQUISITION_TYPE_LABELS[purchase.acquisitionType] ??
                            purchase.acquisitionType}
                        </Badge>
                      )}
                      {purchase.saleName && (
                        <span>{purchase.saleName}</span>
                      )}
                      {purchase.lotNumber && (
                        <span>Lot {purchase.lotNumber}</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-right">
                    {purchase.purchasePrice && (
                      <p className="text-sm font-medium">
                        {formatCurrency(parseFloat(purchase.purchasePrice))}
                      </p>
                    )}
                    {purchase.listedPrice &&
                      purchase.listedPrice !== purchase.purchasePrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(parseFloat(purchase.listedPrice))}
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
