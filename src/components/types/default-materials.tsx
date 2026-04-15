'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DefaultMaterialsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function DefaultMaterials({ value, onChange }: DefaultMaterialsProps) {
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
      <h3 className="text-sm font-semibold text-foreground">Default Materials</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Pre-filled material tags for new items of this type.
      </p>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((material, i) => (
            <Badge key={material} variant="secondary" className="gap-1 pr-1">
              {material}
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
          placeholder="e.g. Mahogany"
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
