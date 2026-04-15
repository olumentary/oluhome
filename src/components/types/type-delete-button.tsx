'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deleteItemType } from '@/app/(dashboard)/types/actions';
import { toast } from 'sonner';

interface TypeDeleteButtonProps {
  typeId: string;
  typeName: string;
  itemCount: number;
}

export function TypeDeleteButton({
  typeId,
  typeName,
  itemCount,
}: TypeDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteItemType(typeId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${typeName}" deleted`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
          <Trash2 className="size-3" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{typeName}&quot;?</DialogTitle>
          <DialogDescription>
            {itemCount > 0
              ? `This type is used by ${itemCount} item${itemCount !== 1 ? 's' : ''} and cannot be deleted until those items are reassigned.`
              : 'This action cannot be undone. The type will be permanently removed.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending || itemCount > 0}
          >
            {pending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
