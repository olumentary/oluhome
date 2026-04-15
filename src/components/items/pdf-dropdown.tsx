'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PdfDropdownProps {
  itemId: string;
}

export function PdfDropdown({ itemId }: PdfDropdownProps) {
  function openPdf(template: 'catalog' | 'insurance') {
    window.open(`/items/${itemId}/pdf?template=${template}`, '_blank');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="size-4" />
          PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openPdf('catalog')}>
          Catalog Card
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openPdf('insurance')}>
          Insurance Sheet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
