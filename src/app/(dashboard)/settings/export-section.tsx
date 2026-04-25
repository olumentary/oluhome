'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

function downloadFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function ExportSection() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleExport(format: 'csv' | 'json' | 'insurance') {
    setLoading(format);
    toast.info('Preparing export...');
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const filenames: Record<string, string> = {
        csv: 'collection-export.csv',
        json: 'collection-export.json',
        insurance: 'insurance-report.csv',
      };

      downloadFile(url, filenames[format]);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('Export downloaded');
    } catch {
      toast.error('Failed to export — please try again');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Data Export</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Download your collection data in various formats.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === 'csv' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Export as CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === 'json' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileJson className="size-4" />
            )}
            Export as JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('insurance')}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === 'insurance' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Shield className="size-4" />
            )}
            Export for Insurance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
