'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Save, Trash2, GripVertical } from 'lucide-react';
import {
  saveMeasurement,
  deleteMeasurement,
} from '@/app/(dashboard)/items/actions';
import { toast } from 'sonner';
import type { ItemMeasurement } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeasurementRow {
  id?: string;
  label: string;
  height: string;
  width: string;
  depth: string;
  diameter: string;
  notes: string;
  displayOrder: number;
  isNew?: boolean;
  isDirty?: boolean;
}

interface MeasurementEditorProps {
  itemId: string;
  measurements: ItemMeasurement[];
  presets: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeasurementEditor({
  itemId,
  measurements,
  presets,
}: MeasurementEditorProps) {
  const [isPending, startTransition] = useTransition();

  const [rows, setRows] = useState<MeasurementRow[]>(() => {
    const existing = measurements.map((m, i) => ({
      id: m.id,
      label: m.label,
      height: m.height ?? '',
      width: m.width ?? '',
      depth: m.depth ?? '',
      diameter: m.diameter ?? '',
      notes: m.notes ?? '',
      displayOrder: m.displayOrder ?? i,
      isNew: false,
      isDirty: false,
    }));

    // Add preset rows that don't already exist
    const existingLabels = new Set(existing.map((r) => r.label.toLowerCase()));
    const presetRows = presets
      .filter((p) => !existingLabels.has(p.toLowerCase()))
      .map((label, i) => ({
        label,
        height: '',
        width: '',
        depth: '',
        diameter: '',
        notes: '',
        displayOrder: existing.length + i,
        isNew: true,
        isDirty: false,
      }));

    return [...existing, ...presetRows];
  });

  function updateRow(index: number, field: keyof MeasurementRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value, isDirty: true } : row,
      ),
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        label: '',
        height: '',
        width: '',
        depth: '',
        diameter: '',
        notes: '',
        displayOrder: prev.length,
        isNew: true,
        isDirty: true,
      },
    ]);
  }

  function handleSaveRow(index: number) {
    const row = rows[index];
    if (!row.label.trim()) {
      toast.error('Label is required');
      return;
    }

    startTransition(async () => {
      const result = await saveMeasurement(itemId, {
        id: row.id,
        label: row.label,
        height: row.height || undefined,
        width: row.width || undefined,
        depth: row.depth || undefined,
        diameter: row.diameter || undefined,
        notes: row.notes || undefined,
        displayOrder: row.displayOrder,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Measurement saved');
        setRows((prev) =>
          prev.map((r, i) =>
            i === index ? { ...r, isDirty: false, isNew: false } : r,
          ),
        );
      }
    });
  }

  function handleDeleteRow(index: number) {
    const row = rows[index];

    if (row.id) {
      startTransition(async () => {
        const result = await deleteMeasurement(itemId, row.id!);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Measurement deleted');
          setRows((prev) => prev.filter((_, i) => i !== index));
        }
      });
    } else {
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Component Measurements</CardTitle>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add Row
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No measurements yet. Add a row or select a type with measurement presets.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="min-w-[140px]">Label</TableHead>
                  <TableHead className="w-[100px]">Height</TableHead>
                  <TableHead className="w-[100px]">Width</TableHead>
                  <TableHead className="w-[100px]">Depth</TableHead>
                  <TableHead className="w-[100px]">Diameter</TableHead>
                  <TableHead className="min-w-[140px]">Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id ?? `new-${index}`}>
                    <TableCell className="text-muted-foreground">
                      <GripVertical className="size-4" />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.label}
                        onChange={(e) => updateRow(index, 'label', e.target.value)}
                        placeholder="e.g. Overall, Seat"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.height}
                        onChange={(e) => updateRow(index, 'height', e.target.value)}
                        placeholder="in."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.width}
                        onChange={(e) => updateRow(index, 'width', e.target.value)}
                        placeholder="in."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.depth}
                        onChange={(e) => updateRow(index, 'depth', e.target.value)}
                        placeholder="in."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.diameter}
                        onChange={(e) => updateRow(index, 'diameter', e.target.value)}
                        placeholder="in."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.notes}
                        onChange={(e) => updateRow(index, 'notes', e.target.value)}
                        placeholder="Notes..."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleSaveRow(index)}
                          disabled={isPending || !row.isDirty}
                          title="Save"
                        >
                          <Save className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRow(index)}
                          disabled={isPending}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
