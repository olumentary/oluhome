'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldDefinition } from '@/types';

interface FieldPreviewProps {
  fields: FieldDefinition[];
}

export function FieldPreview({ fields }: FieldPreviewProps) {
  if (fields.length === 0) return null;

  // Group fields by group name
  const groups = new Map<string, FieldDefinition[]>();
  for (const field of fields) {
    const group = field.group || 'General';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(field);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Form Preview</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Read-only mockup of how custom fields will render.
      </p>

      <div className="mt-3 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-6">
          {[...groups.entries()].map(([groupName, groupFields]) => (
            <div key={groupName}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {groupName}
              </p>
              <div className="space-y-4">
                {groupFields.map((field) => (
                  <PreviewField key={field.key} field={field} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: FieldDefinition }) {
  return (
    <div className="space-y-1.5">
      <Label className="pointer-events-none text-sm">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
        {field.unit && (
          <span className="ml-1 text-xs text-muted-foreground">({field.unit})</span>
        )}
      </Label>

      {field.type === 'text' && (
        <Input disabled placeholder={field.label} className="pointer-events-none" />
      )}

      {field.type === 'textarea' && (
        <Textarea disabled placeholder={field.label} rows={2} className="pointer-events-none" />
      )}

      {field.type === 'number' && (
        <Input
          disabled
          type="number"
          placeholder={
            field.min != null && field.max != null
              ? `${field.min} – ${field.max}`
              : field.label
          }
          className="pointer-events-none"
        />
      )}

      {field.type === 'boolean' && (
        <div className="flex items-center gap-2">
          <Switch disabled />
          <span className="text-xs text-muted-foreground">Toggle</span>
        </div>
      )}

      {field.type === 'select' && (
        <Select disabled>
          <SelectTrigger className="pointer-events-none w-full">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === 'multi_select' && (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).slice(0, 5).map((opt) => (
            <Badge key={opt} variant="outline" className="pointer-events-none text-[10px]">
              <Checkbox disabled className="mr-1 size-3" />
              {opt}
            </Badge>
          ))}
          {(field.options?.length ?? 0) > 5 && (
            <Badge variant="outline" className="text-[10px]">
              +{(field.options?.length ?? 0) - 5} more
            </Badge>
          )}
        </div>
      )}

      {field.type === 'date' && (
        <Input disabled type="date" className="pointer-events-none" />
      )}

      {field.type === 'url' && (
        <Input disabled placeholder="https://..." className="pointer-events-none" />
      )}
    </div>
  );
}
