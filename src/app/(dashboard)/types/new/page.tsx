import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { TypeForm } from '@/components/types/type-form';

export default async function NewItemTypePage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/types">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Create Custom Type
          </h1>
          <p className="text-sm text-muted-foreground">
            Define a new item type with custom fields
          </p>
        </div>
      </div>

      <TypeForm />
    </div>
  );
}
