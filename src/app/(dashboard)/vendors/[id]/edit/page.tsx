import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/db';
import { vendors } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { VendorForm } from '@/components/vendors/vendor-form';
import { BreadcrumbTitle } from '@/components/layout/breadcrumb-title';

interface EditVendorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorPage({ params }: EditVendorPageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const vendor = await db.query.vendors.findFirst({
    where: and(eq(vendors.id, id), eq(vendors.userId, user.id)),
  });

  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <BreadcrumbTitle segment={id} title={vendor.name} />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/vendors/${id}`}>
            <ChevronLeft className="size-4" />
            {vendor.name}
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Vendor</h1>
        <p className="text-sm text-muted-foreground">
          Update vendor information and contact details.
        </p>
      </div>
      <VendorForm id={id} initialValues={vendor} />
    </div>
  );
}
