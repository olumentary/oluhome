'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

function getStoredValue(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(key) ?? fallback;
}

export function PreferencesSection() {
  const [measurementUnit, setMeasurementUnit] = useState(() =>
    getStoredValue('oluhome-measurement-unit', 'inches'),
  );
  const [itemsPerPage, setItemsPerPage] = useState(() =>
    getStoredValue('oluhome-items-per-page', '24'),
  );

  function handleUnitChange(value: string) {
    setMeasurementUnit(value);
    localStorage.setItem('oluhome-measurement-unit', value);
    toast.success('Measurement unit updated');
  }

  function handlePerPageChange(value: string) {
    setItemsPerPage(value);
    localStorage.setItem('oluhome-items-per-page', value);
    toast.success('Items per page updated');
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Preferences</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Default Measurement Unit</Label>
            <Select value={measurementUnit} onValueChange={handleUnitChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inches">Inches (in.)</SelectItem>
                <SelectItem value="cm">Centimeters (cm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Items Per Page</Label>
            <Select value={itemsPerPage} onValueChange={handlePerPageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
