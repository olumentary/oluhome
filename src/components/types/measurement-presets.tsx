'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MeasurementPresetsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MeasurementPresets({ value, onChange }: MeasurementPresetsProps) {
  const [input, setInput] = useState('');

  function add() {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
  }

  function remove(index: number) {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Measurement Presets</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Labels pre-populated in the measurements editor when creating items of this type.
      </p>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((preset, i) => (
            <Badge key={preset} variant="secondary" className="gap-1 pr-1">
              {preset}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Seat Height"
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>
    </div>
  );
}
