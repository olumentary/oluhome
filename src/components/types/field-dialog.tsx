'use client';

import { useEffect, useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldDefinition, FieldType } from '@/types';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean (Toggle)' },
  { value: 'select', label: 'Select (Single)' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
];

function labelToKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/__+/g, '_');
}

interface FieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FieldDefinition | null;
  existingGroups: string[];
  existingKeys: string[];
  onSave: (field: FieldDefinition) => void;
}

export function FieldDialog({
  open,
  onOpenChange,
  field,
  existingGroups,
  existingKeys,
  onSave,
}: FieldDialogProps) {
  const isEditing = field !== null;

  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [group, setGroup] = useState('General');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [unit, setUnit] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (field) {
        setLabel(field.label);
        setKey(field.key);
        setType(field.type);
        setGroup(field.group || 'General');
        setRequired(field.required);
        setOptions(field.options ?? []);
        setUnit(field.unit ?? '');
        setMin(field.min != null ? String(field.min) : '');
        setMax(field.max != null ? String(field.max) : '');
        setKeyTouched(true);
      } else {
        setLabel('');
        setKey('');
        setType('text');
        setGroup('General');
        setRequired(false);
        setOptions([]);
        setUnit('');
        setMin('');
        setMax('');
        setKeyTouched(false);
      }
      setError('');
    }
  }, [open, field]);

  // Auto-generate key from label
  function handleLabelChange(val: string) {
    setLabel(val);
    if (!keyTouched) {
      setKey(labelToKey(val));
    }
  }

  function handleSave() {
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (!key.trim()) {
      setError('Key is required');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      setError('Key must be snake_case starting with a letter');
      return;
    }
    if (existingKeys.includes(key)) {
      setError('A field with this key already exists');
      return;
    }
    if ((type === 'select' || type === 'multi_select') && options.length === 0) {
      setError('At least one option is required for select fields');
      return;
    }

    const def: FieldDefinition = {
      key,
      label: label.trim(),
      type,
      required,
      group: group.trim() || 'General',
    };
    if (unit.trim()) def.unit = unit.trim();
    if (options.length > 0) def.options = options;
    if (min !== '') def.min = Number(min);
    if (max !== '') def.max = Number(max);

    onSave(def);
  }

  const showOptions = type === 'select' || type === 'multi_select';
  const showNumberFields = type === 'number';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Field' : 'Add Field'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Wood Type"
            />
          </div>

          {/* Key */}
          <div className="space-y-1.5">
            <Label htmlFor="field-key">Key</Label>
            <Input
              id="field-key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyTouched(true);
              }}
              placeholder="e.g. wood_type"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Snake_case identifier used in data storage
            </p>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group */}
          <div className="space-y-1.5">
            <Label htmlFor="field-group">Group</Label>
            <Input
              id="field-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="General"
              list="group-suggestions"
            />
            {existingGroups.length > 0 && (
              <datalist id="group-suggestions">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            )}
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="field-required">Required</Label>
            <Switch
              id="field-required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>

          {/* Number-specific fields */}
          {showNumberFields && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Number Options</p>
              <div className="space-y-1.5">
                <Label htmlFor="field-unit">Unit Label</Label>
                <Input
                  id="field-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. inches, KPSI"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="field-min">Min</Label>
                  <Input
                    id="field-min"
                    type="number"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder="No min"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="field-max">Max</Label>
                  <Input
                    id="field-max"
                    type="number"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder="No max"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Select options editor */}
          {showOptions && (
            <OptionsEditor options={options} onChange={setOptions} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Options List Editor (for select/multi_select)
// ---------------------------------------------------------------------------

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [newOption, setNewOption] = useState('');

  function addOption() {
    const trimmed = newOption.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onChange([...options, trimmed]);
    setNewOption('');
  }

  function removeOption(index: number) {
    const next = [...options];
    next.splice(index, 1);
    onChange(next);
  }

  function moveOption(from: number, to: number) {
    if (to < 0 || to >= options.length) return;
    const next = [...options];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Options</p>

      {options.length > 0 && (
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div
              key={`${opt}-${i}`}
              className="flex items-center gap-2 rounded-md bg-background px-2 py-1"
            >
              <button
                type="button"
                className="cursor-grab text-muted-foreground"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => moveOption(i, i - 1)}
                disabled={i === 0}
              >
                <GripVertical className="size-3" />
              </button>
              <span className="flex-1 text-sm">{opt}</span>
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Add option..."
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={addOption}>
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}
