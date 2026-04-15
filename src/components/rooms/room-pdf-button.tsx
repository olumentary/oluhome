'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RoomPdfButtonProps {
  room: string;
}

export function RoomPdfButton({ room }: RoomPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function generatePdf(template: 'catalog' | 'insurance') {
    setLoading(true);
    try {
      const res = await fetch('/api/pdf/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, template }),
      });
      if (!res.ok) {
        throw new Error('PDF generation failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Revoke after a delay to let the browser load it
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      // Could add toast here
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          Room Inventory PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => generatePdf('catalog')}>
          Catalog Cards
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generatePdf('insurance')}>
          Insurance Sheets
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
