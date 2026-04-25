import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorForm } from '@/components/vendors/vendor-form';

export default function NewVendorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vendors">
            <ChevronLeft className="size-4" />
            Vendors
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Vendor</h1>
        <p className="text-sm text-muted-foreground">
          Add a new dealer, auction house, or source to your contacts.
        </p>
      </div>
      <VendorForm />
    </div>
  );
}
