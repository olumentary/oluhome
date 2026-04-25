'use client';

import { useState, useTransition } from 'react';
import { Share2, Copy, Check, Link2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { createShareToken } from '@/app/(dashboard)/items/share-actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShareDialogProps {
  scope: 'item' | 'room' | 'collection';
  scopeId: string;
  scopeLabel: string; // e.g. item title, room name, or "Entire Collection"
  trigger?: React.ReactNode;
}

const EXPIRATION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'No expiration', value: null },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareDialog({
  scope,
  scopeId,
  scopeLabel,
  trigger,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [includeValues, setIncludeValues] = useState(false);
  const [expirationDays, setExpirationDays] = useState<number | null>(30);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  // Result state
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setIncludeValues(false);
    setExpirationDays(30);
    setRecipientName('');
    setRecipientEmail('');
    setGeneratedUrl(null);
    setCopied(false);
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await createShareToken({
        scope,
        scopeId,
        includeValues,
        expirationDays,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setGeneratedUrl(result.url ?? null);
      toast.success('Share link created');
    });
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Share2 className="size-4" />
            Share
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Link</DialogTitle>
          <DialogDescription>
            Sharing: {scopeLabel}
          </DialogDescription>
        </DialogHeader>

        {generatedUrl ? (
          /* ── Success state ─────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2">
                <p className="truncate text-sm font-mono">{generatedUrl}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view the shared content.
              {includeValues
                ? ' Values and acquisition data are included.'
                : ' Values are hidden.'}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Done
              </Button>
              <Button onClick={resetForm}>
                <Link2 className="size-4" />
                Create Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Configuration state ──────────────────────────────── */
          <div className="space-y-5">
            {/* Include values toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="include-values" className="text-sm font-medium">
                  Include values
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, recipient can see purchase prices and valuations
                </p>
              </div>
              <Switch
                id="include-values"
                checked={includeValues}
                onCheckedChange={setIncludeValues}
              />
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Expiration</Label>
              <div className="flex flex-wrap gap-2">
                {EXPIRATION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.label}
                    type="button"
                    variant={expirationDays === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpirationDays(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recipient info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipient-name" className="text-xs text-muted-foreground">
                  Recipient name (optional)
                </Label>
                <Input
                  id="recipient-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipient-email" className="text-xs text-muted-foreground">
                  Recipient email (optional)
                </Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? 'Generating...' : 'Generate Link'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
