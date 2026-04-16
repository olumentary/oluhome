'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { deleteAccount } from '@/app/(dashboard)/actions';

export function DangerZone() {
  const [step, setStep] = useState<'closed' | 'confirm' | 'password'>('closed');
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleFirstConfirm() {
    setStep('password');
  }

  function handleDelete() {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }
    startTransition(async () => {
      const result = await deleteAccount(password);
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
      }
      // If successful, the server action will redirect to /login
    });
  }

  function handleClose() {
    setStep('closed');
    setPassword('');
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <CardTitle className="text-base text-destructive">
              Danger Zone
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Permanently delete your account and all associated data including items,
            photos, vendors, valuations, and share links. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setStep('confirm')}
          >
            Delete Account & All Data
          </Button>
        </CardContent>
      </Card>

      {/* First confirmation dialog */}
      <Dialog open={step === 'confirm'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all data. This action
              cannot be reversed. All your items, photos stored in the cloud,
              vendors, valuations, and share links will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFirstConfirm}>
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password confirmation dialog */}
      <Dialog open={step === 'password'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm with your password</DialogTitle>
            <DialogDescription>
              Enter your password to permanently delete your account. This is
              the final step and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-password">Password</Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || !password}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account Permanently'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
