'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2,
  Trash2,
  Eye,
  Package,
  Home,
  Layers,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  revokeShareToken,
  type ActiveShare,
} from '@/app/(dashboard)/items/share-actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCOPE_ICONS = {
  item: Package,
  room: Home,
  collection: Layers,
} as const;

function formatDate(date: Date | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(date: Date | null): string {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(date);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ActiveSharesTableProps {
  shares: ActiveShare[];
}

export function ActiveSharesTable({ shares }: ActiveSharesTableProps) {
  const [revokeTarget, setRevokeTarget] = useState<ActiveShare | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRevoke() {
    if (!revokeTarget) return;
    startTransition(async () => {
      const result = await revokeShareToken(revokeTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Share link revoked');
        setRevokeTarget(null);
        router.refresh();
      }
    });
  }

  if (shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Link2 className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          No active share links. Share items, rooms, or your entire collection
          using the share buttons throughout the app.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scope</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Last Viewed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.map((share) => {
            const ScopeIcon = SCOPE_ICONS[share.scope];
            return (
              <TableRow key={share.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <ScopeIcon className="size-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs capitalize">
                      {share.scope}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {share.scopeName}
                    {share.includeValues && (
                      <DollarSign className="size-3 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {share.recipientName || share.recipientEmail || '--'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(share.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {share.expiresAt ? formatDate(share.expiresAt) : 'Never'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelative(share.lastAccessedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRevokeTarget(share)}
                  >
                    <Trash2 className="size-3.5" />
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Revoke confirmation dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(val) => { if (!val) setRevokeTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Share Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the share link for &ldquo;
              {revokeTarget?.scopeName}&rdquo;? Anyone with this link will no
              longer be able to access the shared content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isPending}
            >
              {isPending ? 'Revoking...' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
